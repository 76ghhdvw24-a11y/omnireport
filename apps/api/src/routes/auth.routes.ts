import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { PasswordService, JWTService } from '@omnireport/infrastructure';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function createAuthRoutes(
  prisma: PrismaClient,
  passwordService: PasswordService,
  jwtService: JWTService
): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const { email, password, firstName, lastName, organizationName } = result.data;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const slug = organizationName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 50);

      const existingOrg = await prisma.organization.findUnique({ where: { slug } });
      if (existingOrg) {
        return res.status(409).json({ error: 'Organization name already taken' });
      }

      const passwordHash = await passwordService.hash(password);

      const organization = await prisma.organization.create({
        data: {
          name: organizationName,
          slug,
        },
      });

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'ADMIN',
          organizationId: organization.id,
        },
      });

      const tokens = jwtService.generateTokenPair({
        sub: user.id,
        email: user.email,
        orgId: user.organizationId,
        role: user.role,
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        },
        tokens,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to register' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const { email, password } = result.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await passwordService.verify(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const tokens = jwtService.generateTokenPair({
        sub: user.id,
        email: user.email,
        orgId: user.organizationId,
        role: user.role,
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        },
        tokens,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  });

  router.get('/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = authHeader.substring(7);
      const payload = jwtService.verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        },
      });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
}
