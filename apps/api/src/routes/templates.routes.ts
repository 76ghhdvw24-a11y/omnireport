import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createTemplatesRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const templates = await prisma.template.findMany({
        where: {
          OR: [
            { organizationId: req.orgId },
            { organizationId: null },
          ],
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      res.json({
        items: templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          industry: t.industry,
          systemPrompt: t.systemPrompt,
          outputFormat: t.outputFormat,
          organizationId: t.organizationId,
        })),
      });
    } catch (error) {
      console.error('Error listing templates:', error);
      res.status(500).json({ error: 'Failed to list templates' });
    }
  });

  return router;
}