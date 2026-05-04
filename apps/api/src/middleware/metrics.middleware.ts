import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration, activeConnections } from '@omnireport/infrastructure';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const path = req.route?.path || req.path || 'unknown';

    httpRequestsTotal.inc({
      method: req.method,
      path,
      status: res.statusCode,
    });

    httpRequestDuration.observe(
      { method: req.method, path },
      duration
    );

    activeConnections.dec();
  });

  next();
}