import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { S3Service } from '@omnireport/infrastructure';
import multer from 'multer';

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

export function createOrganizationRoutes(
  prisma: PrismaClient,
  s3Service: S3Service
): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const org = await prisma.organization.findUnique({
        where: { id: req.orgId },
        include: { users: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      });

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

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
        members: org.users,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
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

      const org = await prisma.organization.update({
        where: { id: req.orgId },
        data: result.data,
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
      });
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

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const key = `orgs/${req.orgId}/logo/${Date.now()}-${file.originalname}`;
      const logoUrl = await s3Service.uploadBuffer(key, file.buffer, file.mimetype);

      await prisma.organization.update({
        where: { id: req.orgId },
        data: { logoUrl },
      });

      res.json({ logoUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  });

  return router;
}