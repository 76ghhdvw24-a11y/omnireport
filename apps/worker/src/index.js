"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const infrastructure_1 = require("@omnireport/infrastructure");
const use_cases_1 = require("@omnireport/use-cases");
class WorkerReportRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        const report = await this.prisma.report.findUnique({ where: { id } });
        if (!report)
            return null;
        return this.mapToReport(report);
    }
    async update(id, data) {
        const updateData = {};
        if (data.status !== undefined)
            updateData.status = data.status;
        if (data.audioTranscript !== undefined)
            updateData.audioTranscript = data.audioTranscript;
        if (data.findings !== undefined)
            updateData.findings = data.findings;
        if (data.executiveSummary !== undefined)
            updateData.executiveSummary = data.executiveSummary;
        if (data.recommendedAction !== undefined)
            updateData.recommendedAction = data.recommendedAction;
        if (data.aiModel !== undefined)
            updateData.aiModel = data.aiModel;
        if (data.aiResponseTime !== undefined)
            updateData.aiResponseTime = data.aiResponseTime;
        if (data.severity !== undefined)
            updateData.severity = data.severity;
        if (data.completedAt !== undefined)
            updateData.completedAt = data.completedAt;
        updateData.updatedAt = new Date();
        await this.prisma.report.update({ where: { id }, data: updateData });
    }
    async getTemplate(id) {
        const template = await this.prisma.template.findUnique({ where: { id } });
        if (!template)
            return null;
        return {
            systemPrompt: template.systemPrompt,
            outputFormat: template.outputFormat,
        };
    }
    mapToReport(prismaReport) {
        return {
            id: prismaReport.id,
            title: prismaReport.title,
            description: prismaReport.description,
            status: prismaReport.status,
            severity: prismaReport.severity,
            organizationId: prismaReport.organizationId,
            userId: prismaReport.userId,
            templateId: prismaReport.templateId,
            audioUrl: prismaReport.audioUrl,
            audioTranscript: prismaReport.audioTranscript,
            imageUrls: prismaReport.imageUrls || [],
            findings: prismaReport.findings,
            executiveSummary: prismaReport.executiveSummary,
            recommendedAction: prismaReport.recommendedAction,
            aiModel: prismaReport.aiModel,
            aiResponseTime: prismaReport.aiResponseTime,
            metadata: prismaReport.metadata,
            tags: prismaReport.tags || [],
            createdAt: prismaReport.createdAt,
            updatedAt: prismaReport.updatedAt,
            completedAt: prismaReport.completedAt,
        };
    }
}
async function main() {
    const prisma = new client_1.PrismaClient();
    const queueService = new infrastructure_1.QueueService({
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        queueName: 'reports',
    });
    const s3Service = new infrastructure_1.S3Service({
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.AWS_S3_BUCKET || '',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    });
    const geminiService = new infrastructure_1.GeminiService({
        apiKey: process.env.GOOGLE_API_KEY || '',
        model: 'gemini-1.5-pro',
        temperature: 0.2,
        maxTokens: 8192,
    });
    const whisperService = new infrastructure_1.WhisperService({
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'whisper-1',
    });
    const reportRepo = new WorkerReportRepository(prisma);
    const generateReportUseCase = new use_cases_1.GenerateReportUseCase({
        reportRepo,
        geminiService,
        whisperService,
    });
    console.log('Worker started, waiting for jobs...');
    await queueService.startWorker(async (job) => {
        if (job.name === 'generate-report') {
            const { reportId } = job.data;
            console.log(`Processing report: ${reportId}`);
            await generateReportUseCase.execute(reportId);
            console.log(`Finished report: ${reportId}`);
        }
    });
    const shutdown = async (signal) => {
        console.log(`${signal} received, shutting down worker...`);
        await queueService.close();
        await prisma.$disconnect();
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
main().catch((error) => {
    console.error('Worker crashed:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map