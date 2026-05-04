import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
  JWTService, PasswordService, S3Service, QueueService, PDFGeneratorService,
  PrismaUserRepository, PrismaOrganizationRepository, PrismaClientRepository,
} from '@omnireport/infrastructure';
import { ProcessMediaUseCase } from '@omnireport/use-cases';
import { createAuthMiddleware } from '../middleware/auth.middleware';
import { createAuthRoutes } from '../routes/auth.routes';
import { createClientsRoutes } from '../routes/clients.routes';
import { createOrganizationRoutes } from '../routes/organization.routes';
import { createReportsRoutes } from '../routes/reports.routes';
import { AppError } from '../middleware/errors';
import { MockQueueService } from './mock-queue.service';

export function buildClientsTestApp() {
  const app = express();
  app.use(express.json({ type: 'application/json' }));

  const prisma = new PrismaClient();
  const userRepo = new PrismaUserRepository(prisma);
  const orgRepo = new PrismaOrganizationRepository(prisma);
  const clientRepo = new PrismaClientRepository(prisma);

  const jwtService = new JWTService({
    secret: 'test-secret-key',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    issuer: 'omnireport.ai',
  });
  const passwordService = new PasswordService();

  const s3Service = new S3Service({
    region: 'us-east-2',
    bucket: 'test-bucket',
    accessKeyId: 'test',
    secretAccessKey: 'test',
  });
  const queueService = new MockQueueService() as any;
  const processMediaUseCase = new ProcessMediaUseCase({ s3Service });
  const pdfService = new PDFGeneratorService();

  const authMiddleware = createAuthMiddleware(jwtService);

  app.use('/api/v1/auth', createAuthRoutes(prisma, userRepo, orgRepo, passwordService, jwtService, undefined));
  app.use('/api/v1/reports', authMiddleware, createReportsRoutes(prisma, processMediaUseCase, queueService, s3Service, pdfService));
  app.use('/api/v1/clients', authMiddleware, createClientsRoutes(clientRepo));
  app.use('/api/v1/organization', authMiddleware, createOrganizationRoutes(prisma, orgRepo, s3Service, passwordService));

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return { app, prisma, jwtService, passwordService, userRepo, orgRepo, clientRepo, queueService };
}
