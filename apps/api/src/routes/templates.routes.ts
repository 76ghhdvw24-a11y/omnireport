import { Router } from 'express';
import { z } from 'zod';
import { PrismaTemplateRepository } from '@omnireport/infrastructure';
import { logger } from '@omnireport/infrastructure';

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  industry: z.enum(['AUTOMOTIVE', 'CONSTRUCTION', 'MANUFACTURING', 'INSURANCE', 'REAL_ESTATE', 'GENERAL']).default('GENERAL'),
  systemPrompt: z.string().min(1),
  outputFormat: z.record(z.unknown()),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  industry: z.enum(['AUTOMOTIVE', 'CONSTRUCTION', 'MANUFACTURING', 'INSURANCE', 'REAL_ESTATE', 'GENERAL']).optional(),
  systemPrompt: z.string().min(1).optional(),
  outputFormat: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export function createTemplatesRoutes(
  templateRepo: PrismaTemplateRepository
): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const includeInactive = req.query.all === 'true';

      const { items, total } = await templateRepo.findByOrganizationId(req.orgId, {
        skip: req.query.skip ? parseInt(req.query.skip as string) : undefined,
        take: req.query.take ? parseInt(req.query.take as string) : undefined,
      });

      res.json({ items, total });
    } catch (error) {
      logger.error({ err: error }, 'Error listing templates');
      res.status(500).json({ error: 'Failed to list templates' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const template = await templateRepo.findById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (template.organizationId && template.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error) {
      logger.error({ err: error }, 'Error getting template');
      res.status(500).json({ error: 'Failed to get template' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = createTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const template = await templateRepo.create({
        ...result.data,
        organizationId: req.orgId,
      });

      res.status(201).json(template);
    } catch (error) {
      logger.error({ err: error }, 'Error creating template');
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = updateTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const existing = await templateRepo.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (existing.organizationId && existing.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const template = await templateRepo.update(req.params.id, result.data);

      res.json(template);
    } catch (error) {
      logger.error({ err: error }, 'Error updating template');
      res.status(500).json({ error: 'Failed to update template' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const existing = await templateRepo.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (existing.organizationId && existing.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Template not found' });
      }

      await templateRepo.delete(req.params.id);

      res.json({ message: 'Template deleted' });
    } catch (error) {
      logger.error({ err: error }, 'Error deleting template');
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  return router;
}
