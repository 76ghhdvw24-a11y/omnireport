import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
  JWTService, PasswordService,
  PrismaUserRepository, PrismaOrganizationRepository,
  PrismaClientRepository, PrismaReportRepository, PrismaTemplateRepository,
  S3Service, QueueService, PDFGeneratorService, NvidiaService, WhisperService,
} from '@omnireport/infrastructure';
import { ProcessMediaUseCase } from '@omnireport/use-cases';
import { createAuthMiddleware } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errors';
import { createAuthRoutes } from '../routes/auth.routes';
import { createReportsRoutes } from '../routes/reports.routes';
import { createClientsRoutes } from '../routes/clients.routes';
import { createOrganizationRoutes } from '../routes/organization.routes';
import { createTemplatesRoutes } from '../routes/templates.routes';
import { createChatRoutes } from '../routes/chat.routes';
import { createHealthRoutes } from '../routes/health.routes';

export function buildTestApp() {
  const app = express();
  app.use(express.json({ type: 'application/json' }));

  const prisma = new PrismaClient();

  const userRepo = new PrismaUserRepository(prisma);
  const orgRepo = new PrismaOrganizationRepository(prisma);
  const clientRepo = new PrismaClientRepository(prisma);
  const reportRepo = new PrismaReportRepository(prisma);
  const templateRepo = new PrismaTemplateRepository(prisma);

  const s3Service = new S3Service({
    region: 'us-east-2',
    bucket: 'test-bucket',
    accessKeyId: 'test',
    secretAccessKey: 'test',
  });

  const jwtService = new JWTService({
    secret: process.env.JWT_SECRET || 'test-secret-key',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    issuer: 'omnireport.ai',
  });

  const passwordService = new PasswordService();
  const queueService = new QueueService({
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    queueName: 'reports-test',
  });
  const processMediaUseCase = new ProcessMediaUseCase({ s3Service });
  const pdfService = new PDFGeneratorService();

  const nvidiaService = new NvidiaService({
    apiKey: 'test',
    model: 'google/gemma-4-31b-it',
    temperature: 0.3,
    maxTokens: 4096,
  });

  const whisperService = new WhisperService({
    apiKey: 'test',
    model: 'whisper-1',
  });

  const authMiddleware = createAuthMiddleware(jwtService);

  app.use('/api/v1/auth', createAuthRoutes(prisma, userRepo, orgRepo, passwordService, jwtService, undefined));
  app.use('/api/v1/reports', authMiddleware, createChatRoutes(prisma, s3Service, nvidiaService, whisperService));
  app.use('/api/v1/reports', authMiddleware, createReportsRoutes(prisma, processMediaUseCase, queueService, s3Service, pdfService));
  app.use('/api/v1/organization', authMiddleware, createOrganizationRoutes(prisma, orgRepo, s3Service, passwordService));
  app.use('/api/v1/clients', authMiddleware, createClientsRoutes(clientRepo));
  app.use('/api/v1/templates', authMiddleware, createTemplatesRoutes(templateRepo));

  app.get('/', (req, res) => {
    res.json({ name: 'OmniReport API', version: '1.0.0', status: 'running' });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return { app, prisma, jwtService, passwordService, userRepo, orgRepo, clientRepo, reportRepo, templateRepo, queueService };
}

export async function createTestUserAndOrg(
  app: express.Application,
  prisma: PrismaClient,
  suffix: string
) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `test-${suffix}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      organizationName: `Test Org ${suffix}`,
    });

  if (res.status !== 201) {
    throw new Error(`Failed to create test user: ${res.body.error || res.status}`);
  }

  return {
    user: res.body.user,
    orgId: res.body.user.organizationId,
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
  };
}

import request from 'supertest';
export { request };
