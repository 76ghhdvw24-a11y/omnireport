import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
  JWTService, PasswordService,
  PrismaUserRepository, PrismaOrganizationRepository,
} from '@omnireport/infrastructure';
import { createAuthRoutes } from '../routes/auth.routes';

export function buildAuthTestApp() {
  const app = express();
  app.use(express.json({ type: 'application/json' }));

  const prisma = new PrismaClient();
  const userRepo = new PrismaUserRepository(prisma);
  const orgRepo = new PrismaOrganizationRepository(prisma);

  const passwordService = new PasswordService();
  const jwtService = new JWTService({
    secret: process.env.JWT_SECRET || 'test-secret-key',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    issuer: 'omnireport.ai',
  });

  app.use('/api/v1/auth', createAuthRoutes(prisma, userRepo, orgRepo, passwordService, jwtService, undefined));

  return { app, prisma, jwtService, passwordService, userRepo };
}
