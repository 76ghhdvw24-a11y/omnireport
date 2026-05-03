import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PasswordService, JWTService } from '@omnireport/infrastructure';
export declare function createAuthRoutes(prisma: PrismaClient, passwordService: PasswordService, jwtService: JWTService): Router;
//# sourceMappingURL=auth.routes.d.ts.map