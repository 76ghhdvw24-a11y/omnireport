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
export declare function createAuthMiddleware(jwtService: JWTService): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.middleware.d.ts.map