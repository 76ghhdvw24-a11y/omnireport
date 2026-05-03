import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { QueueService, S3Service, JWTService, PasswordService, PDFGeneratorService } from '@omnireport/infrastructure';
import { ProcessMediaUseCase } from '@omnireport/use-cases';
import { createAuthMiddleware } from './middleware/auth.middleware';
import { createHealthRoutes } from './routes/health.routes';
import { createReportsRoutes } from './routes/reports.routes';
import { createAuthRoutes } from './routes/auth.routes';
import { createOrganizationRoutes } from './routes/organization.routes';
import { createClientsRoutes } from './routes/clients.routes';
import { createTemplatesRoutes } from './routes/templates.routes';
import { createChatRoutes } from './routes/chat.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());

const prisma = new PrismaClient();

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

const authMiddleware = createAuthMiddleware(jwtService);

app.use('/health', createHealthRoutes());
app.use('/api/v1/auth', createAuthRoutes(prisma, passwordService, jwtService));

const reportsRouter = createReportsRoutes(prisma, processMediaUseCase, queueService, s3Service, pdfService);
app.use('/api/v1/reports', authMiddleware, reportsRouter);

app.use('/api/v1/organization', authMiddleware, createOrganizationRoutes(prisma, s3Service));
app.use('/api/v1/clients', authMiddleware, createClientsRoutes(prisma));
app.use('/api/v1/templates', authMiddleware, createTemplatesRoutes(prisma));
app.use('/api/v1/reports', authMiddleware, createChatRoutes(prisma));

app.get('/', (req, res) => {
  res.json({
    name: 'OmniReport API',
    version: '1.0.0',
    status: 'running',
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
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