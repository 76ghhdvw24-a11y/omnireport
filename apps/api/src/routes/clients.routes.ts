import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

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

export function createClientsRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clients = await prisma.client.findMany({
        where: { organizationId: req.orgId },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ items: clients });
    } catch (error) {
      console.error('Error listing clients:', error);
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

      const client = await prisma.client.create({
        data: {
          ...result.data,
          organizationId: req.orgId,
        },
      });

      res.status(201).json(client);
    } catch (error) {
      console.error('Error creating client:', error);
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

      const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const client = await prisma.client.update({
        where: { id: req.params.id },
        data: result.data,
      });

      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Client not found' });
      }

      await prisma.client.delete({ where: { id: req.params.id } });

      res.json({ message: 'Client deleted' });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  return router;
}