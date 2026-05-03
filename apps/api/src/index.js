"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const client_1 = require("@prisma/client");
const infrastructure_1 = require("@omnireport/infrastructure");
const use_cases_1 = require("@omnireport/use-cases");
const auth_middleware_1 = require("./middleware/auth.middleware");
const health_routes_1 = require("./routes/health.routes");
const reports_routes_1 = require("./routes/reports.routes");
const auth_routes_1 = require("./routes/auth.routes");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json());
const prisma = new client_1.PrismaClient();
const s3Service = new infrastructure_1.S3Service({
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
});
const jwtService = new infrastructure_1.JWTService({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    issuer: 'omnireport.ai',
});
const passwordService = new infrastructure_1.PasswordService();
const queueService = new infrastructure_1.QueueService({
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    queueName: 'reports',
});
const processMediaUseCase = new use_cases_1.ProcessMediaUseCase({ s3Service });
const authMiddleware = (0, auth_middleware_1.createAuthMiddleware)(jwtService);
app.use('/health', (0, health_routes_1.createHealthRoutes)());
app.use('/api/v1/auth', (0, auth_routes_1.createAuthRoutes)(prisma, passwordService, jwtService));
const reportsRouter = (0, reports_routes_1.createReportsRoutes)(prisma, processMediaUseCase, queueService, s3Service);
app.use('/api/v1/reports', authMiddleware, reportsRouter);
app.get('/', (req, res) => {
    res.json({
        name: 'OmniReport API',
        version: '1.0.0',
        status: 'running',
    });
});
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
const server = app.listen(PORT, () => {
    console.log(`OmniReport API running on port ${PORT}`);
});
const gracefulShutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
        await prisma.$disconnect();
        await queueService.close();
        process.exit(0);
    });
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
exports.default = app;
//# sourceMappingURL=index.js.map