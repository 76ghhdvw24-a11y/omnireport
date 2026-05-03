import { Request, Response, NextFunction } from 'express';
import { JWTService } from '@omnireport/infrastructure';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      orgId?: string;
      email?: string;
      role?: string;
    }
  }
}

export function createAuthMiddleware(jwtService: JWTService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized - no token' });
      }

      const token = authHeader.substring(7);
      let payload;
      try {
        payload = jwtService.verifyAccessToken(token);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      req.userId = payload.sub;
      req.orgId = payload.orgId;
      req.email = payload.email;
      req.role = payload.role;

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };
}