import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import {
  QueueService, S3Service, JWTService, PasswordService, PDFGeneratorService,
  NvidiaService, WhisperService,
  PrismaReportRepository, PrismaUserRepository, PrismaOrganizationRepository, PrismaClientRepository, PrismaTemplateRepository
} from '@omnireport/infrastructure';
import { ProcessMediaUseCase } from '@omnireport/use-cases';
import { createAuthMiddleware, requireRole } from './middleware/auth.middleware';
import { AppError } from './middleware/errors';
import { createHealthRoutes } from './routes/health.routes';
import { createReportsRoutes } from './routes/reports.routes';
import { createAuthRoutes } from './routes/auth.routes';
import { createOrganizationRoutes } from './routes/organization.routes';
import { createClientsRoutes } from './routes/clients.routes';
import { createTemplatesRoutes } from './routes/templates.routes';
import { createChatRoutes } from './routes/chat.routes';

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DEFAULT_SECRETS = ['your-secret-key', 'your-secret-key-change-in-production', 'your-super-secret-jwt-key-change-in-production'];

if (DEFAULT_SECRETS.includes(JWT_SECRET)) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET is using a default value. Set a secure JWT_SECRET before running in production.');
    process.exit(1);
  } else {
    console.warn('WARNING: JWT_SECRET is using a default value. Set JWT_SECRET to a secure random string.');
  }
}

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3001,http://localhost:3000').split(',');

app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ type: 'application/json' }));

const getClientId = (req: express.Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: getClientId,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  keyGenerator: getClientId,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const reportCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req as any).orgId || getClientId(req),
  message: { error: 'Report creation rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use((req, res, next) => {
  if (req.path.includes('/upload') || req.path.includes('/audio')) {
    console.log(`[REQ] ${req.method} ${req.path} Content-Type: ${req.headers['content-type']}`);
  }
  next();
});

const prisma = new PrismaClient();

const reportRepo = new PrismaReportRepository(prisma);
const userRepo = new PrismaUserRepository(prisma);
const orgRepo = new PrismaOrganizationRepository(prisma);
const clientRepo = new PrismaClientRepository(prisma);
const templateRepo = new PrismaTemplateRepository(prisma);

const s3Service = new S3Service({
  region: process.env.AWS_REGION || 'us-east-2',
  bucket: process.env.AWS_S3_BUCKET || '',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
});

const jwtService = new JWTService({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  issuer: 'omnireport.ai',
});

const passwordService = new PasswordService();

const queueService = new QueueService({
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  queueName: 'reports',
});

const processMediaUseCase = new ProcessMediaUseCase({ s3Service });
const pdfService = new PDFGeneratorService();

const nvidiaService = new NvidiaService({
  apiKey: process.env.NVIDIA_API_KEY || '',
  model: 'google/gemma-4-31b-it',
  temperature: 0.3,
  maxTokens: 4096,
});

const whisperService = new WhisperService({
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'whisper-1',
});

const authMiddleware = createAuthMiddleware(jwtService);

app.use('/health', createHealthRoutes());
app.use('/api/v1/auth', authLimiter, createAuthRoutes(prisma, userRepo, passwordService, jwtService));

app.use('/api/v1', apiLimiter);

app.use('/api/v1/reports', authMiddleware, createChatRoutes(prisma, s3Service, nvidiaService, whisperService));

const reportsRouter = createReportsRoutes(prisma, processMediaUseCase, queueService, s3Service, pdfService);
app.use('/api/v1/reports', authMiddleware, reportCreationLimiter, reportsRouter);

app.use('/api/v1/organization', authMiddleware, createOrganizationRoutes(prisma, orgRepo, s3Service, passwordService));
app.use('/api/v1/clients', authMiddleware, createClientsRoutes(clientRepo));
app.use('/api/v1/templates', authMiddleware, createTemplatesRoutes(templateRepo));

app.get('/', (req, res) => {
  res.json({
    name: 'OmniReport API',
    version: '1.0.0',
    status: 'running',
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message, err.stack);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }

  if ((err as any).code === 'LIMIT_FILE_SIZE' || (err as any).code === 'LIMIT_FILE_COUNT' || (err as any).code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: err.message, code: (err as any).code });
  }
  if (err.message && err.message.includes('multipart')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`OmniReport API running on port ${PORT}`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    await queueService.close();
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
