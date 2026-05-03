"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthMiddleware = createAuthMiddleware;
const infrastructure_1 = require("@omnireport/infrastructure");
function createAuthMiddleware(jwtService) {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const token = authHeader.substring(7);
            const payload = jwtService.verifyAccessToken(token);
            req.userId = payload.sub;
            req.orgId = payload.orgId;
            req.email = payload.email;
            req.role = payload.role;
            await (0, infrastructure_1.setAppCurrentOrganizationId)(payload.orgId);
            res.on('finish', async () => {
                await (0, infrastructure_1.clearCurrentOrganizationId)();
            });
            next();
        }
        catch (error) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
}
//# sourceMappingURL=auth.middleware.js.map