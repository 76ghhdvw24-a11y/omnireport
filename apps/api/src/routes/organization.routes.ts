import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { S3Service, PasswordService } from '@omnireport/infrastructure';
import multer from 'multer';
import { PrismaOrganizationRepository } from '@omnireport/infrastructure';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

export function createOrganizationRoutes(
  prisma: PrismaClient,
  orgRepo: PrismaOrganizationRepository,
  s3Service: S3Service,
  passwordService: PasswordService
): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const org = await orgRepo.findById(req.orgId);
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const members = await prisma.user.findMany({
        where: { organizationId: req.orgId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });

      res.json({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl,
        address: org.address,
        phone: org.phone,
        taxId: org.taxId,
        country: org.country,
        currency: org.currency,
        language: org.language,
        plan: org.plan,
        maxReports: org.maxReports,
        maxStorage: org.maxStorage.toString(),
        isActive: org.isActive,
        members: members.map(m => ({
          id: m.id,
          email: m.email,
          name: `${m.firstName} ${m.lastName}`,
          role: m.role,
        })),
      });
    } catch (error) {
      console.error('Error getting organization:', error);
      res.status(500).json({ error: 'Failed to get organization' });
    }
  });

  router.patch('/', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = updateOrgSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const org = await orgRepo.update(req.orgId, result.data);

      res.json(org);
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  });

  router.post('/logo', upload.single('logo'), async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No logo file uploaded' });
      }

      const extension = req.file.originalname.split('.').pop() || 'bin';
      const key = `orgs/${req.orgId}/logo-${Date.now()}.${extension}`;

      await s3Service.uploadBuffer(key, req.file.buffer, req.file.mimetype);

      const logoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;

      await orgRepo.update(req.orgId, { logoUrl });

      res.json({ logoUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  });

  router.get('/members', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const members = await prisma.user.findMany({
        where: { organizationId: req.orgId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ items: members });
    } catch (error) {
      console.error('Error listing members:', error);
      res.status(500).json({ error: 'Failed to list members' });
    }
  });

  router.post('/members/invite', async (req, res) => {
    try {
      if (!req.orgId || !req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (req.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can invite members' });
      }

      const result = inviteMemberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const { email, firstName, lastName, role } = result.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const temporaryPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10).toUpperCase();
      const passwordHash = await passwordService.hash(temporaryPassword);

      const user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash,
          role,
          organizationId: req.orgId,
        },
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        temporaryPassword,
      });
    } catch (error) {
      console.error('Error inviting member:', error);
      res.status(500).json({ error: 'Failed to invite member' });
    }
  });

  router.patch('/members/:userId/role', async (req, res) => {
    try {
      if (!req.orgId || !req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (req.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can change roles' });
      }

      const result = updateRoleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const targetUserId = req.params.userId;
      if (targetUserId === req.userId) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }

      const targetUser = await prisma.user.findFirst({
        where: { id: targetUserId, organizationId: req.orgId },
      });
      if (!targetUser) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { role: result.data.role },
      });

      res.json({
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        role: updated.role,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  });

  router.delete('/members/:userId', async (req, res) => {
    try {
      if (!req.orgId || !req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (req.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can remove members' });
      }

      const targetUserId = req.params.userId;
      if (targetUserId === req.userId) {
        return res.status(400).json({ error: 'Cannot remove yourself' });
      }

      const targetUser = await prisma.user.findFirst({
        where: { id: targetUserId, organizationId: req.orgId },
      });
      if (!targetUser) {
        return res.status(404).json({ error: 'Member not found' });
      }

      await prisma.user.update({
        where: { id: targetUserId },
        data: { isActive: false },
      });

      res.json({ message: 'Member deactivated' });
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  });

  return router;
}
