import { Router } from 'express';
import { z } from 'zod';
import { PrismaClientRepository } from '@omnireport/infrastructure';
import { logger } from '@omnireport/infrastructure';

const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
});

export function createClientsRoutes(clientRepo: PrismaClientRepository): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clients = await clientRepo.findByOrganizationId(req.orgId);

      res.json({ items: clients });
    } catch (error) {
      logger.error({ err: error }, 'Error listing clients');
      res.status(500).json({ error: 'Failed to list clients' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = createClientSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const client = await clientRepo.create({ ...result.data, organizationId: req.orgId });

      res.status(201).json(client);
    } catch (error) {
      logger.error({ err: error }, 'Error creating client');
      res.status(500).json({ error: 'Failed to create client' });
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = updateClientSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const existing = await clientRepo.findById(req.params.id);
      if (!existing || existing.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const client = await clientRepo.update(req.params.id, result.data);

      res.json(client);
    } catch (error) {
      logger.error({ err: error }, 'Error updating client');
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const existing = await clientRepo.findById(req.params.id);
      if (!existing || existing.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Client not found' });
      }

      await clientRepo.delete(req.params.id);

      res.json({ message: 'Client deleted' });
    } catch (error) {
      logger.error({ err: error }, 'Error deleting client');
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  return router;
}
