"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthRoutes = createHealthRoutes;
const express_1 = require("express");
function createHealthRoutes() {
    const router = (0, express_1.Router)();
    router.get('/', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        });
    });
    return router;
}
//# sourceMappingURL=health.routes.js.map