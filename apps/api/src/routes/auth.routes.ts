import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { PasswordService, JWTService } from '@omnireport/infrastructure';
import { PrismaUserRepository } from '@omnireport/infrastructure';

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

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export function createAuthRoutes(
  prisma: PrismaClient,
  userRepo: PrismaUserRepository,
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

      const existingUser = await userRepo.findByEmail(email);
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

      const org = await prisma.organization.create({
        data: {
          name: organizationName,
          slug,
          isActive: true,
        },
      });

      const user = await userRepo.create({
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'ADMIN',
        organizationId: org.id,
      });

      const tokens = jwtService.generateTokenPair({
        sub: user.id,
        email: user.email,
        orgId: org.id,
        role: user.role as 'ADMIN' | 'MEMBER',
      });

      res.status(201).json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        ...tokens,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const { email, password } = result.data;

      const user = await userRepo.findByEmail(email);
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
        ...tokens,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.get('/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized - no token' });
      }
      const token = authHeader.substring(7);
      const payload = jwtService.verifyAccessToken(token);
      const user = await userRepo.findById(payload.sub);
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

  router.patch('/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized - no token' });
      }
      const token = authHeader.substring(7);
      const payload = jwtService.verifyAccessToken(token);
      const user = await userRepo.findById(payload.sub);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profileResult = updateProfileSchema.safeParse(req.body);
      const passwordResult = changePasswordSchema.safeParse(req.body);

      const updateData: Record<string, unknown> = {};

      if (profileResult.success) {
        if (profileResult.data.email && profileResult.data.email !== user.email) {
          const existing = await userRepo.findByEmail(profileResult.data.email);
          if (existing) {
            return res.status(409).json({ error: 'Email already in use' });
          }
          updateData.email = profileResult.data.email;
        }
        if (profileResult.data.firstName) updateData.firstName = profileResult.data.firstName;
        if (profileResult.data.lastName) updateData.lastName = profileResult.data.lastName;
      }

      if (passwordResult.success) {
        const isValid = await passwordService.verify(passwordResult.data.currentPassword, user.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
        updateData.passwordHash = await passwordService.hash(passwordResult.data.newPassword);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          organizationId: updatedUser.organizationId,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const decoded = jwtService.verifyRefreshToken(refreshToken);
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const user = await userRepo.findById(decoded.sub);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      const tokens = jwtService.generateTokenPair({
        sub: user.id,
        email: user.email,
        orgId: user.organizationId,
        role: user.role,
      });

      res.json(tokens);
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  });

  return router;
}
