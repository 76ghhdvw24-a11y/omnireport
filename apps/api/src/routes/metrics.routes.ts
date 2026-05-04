import { Router, Request, Response } from 'express';
import { getMetrics, getContentType } from '@omnireport/infrastructure';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', getContentType());
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

export function createMetricsRoutes(): Router {
  return router;
}