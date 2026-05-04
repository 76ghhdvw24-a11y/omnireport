import { Request, Response, NextFunction } from 'express';
import { JWTService, TokenBlacklistService, logger } from '@omnireport/infrastructure';

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

export function createAuthMiddleware(jwtService: JWTService, tokenBlacklist?: TokenBlacklistService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let token: string | undefined;

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      // Support token via query param for SSE (EventSource cannot send custom headers)
      if (!token && typeof req.query.token === 'string') {
        token = req.query.token;
      }

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized - no token' });
      }

      if (tokenBlacklist) {
        const isRevoked = await tokenBlacklist.isRevoked(token);
        if (isRevoked) {
          return res.status(401).json({ error: 'Token has been revoked' });
        }
      }

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
      logger.error({ err: error }, 'Auth middleware error');
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.role) {
      return res.status(401).json({ error: 'Unauthorized - no role' });
    }
    if (!roles.includes(req.role)) {
      return res.status(403).json({ error: 'Forbidden - insufficient permissions' });
    }
    next();
  };
}