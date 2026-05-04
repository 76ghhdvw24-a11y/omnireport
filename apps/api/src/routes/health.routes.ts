import { logger } from '@omnireport/infrastructure';
import { Router } from 'express';

export function createHealthRoutes(): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  return router;
}
