"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReportsRoutes = createReportsRoutes;
const express_1 = require("express");
const zod_1 = require("zod");
const infrastructure_1 = require("@omnireport/infrastructure");
const createReportSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    templateId: zod_1.z.string().optional(),
    audioUrl: zod_1.z.string().optional(),
    imageUrls: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
function createReportsRoutes(prisma, processMediaUseCase, queueService, s3Service) {
    const router = (0, express_1.Router)();
    const reportRepo = new infrastructure_1.PrismaReportRepository(prisma);
    router.post('/', async (req, res) => {
        try {
            if (!req.orgId || !req.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const result = createReportSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
            }
            const { title, description, templateId, audioUrl, imageUrls, tags } = result.data;
            const report = await reportRepo.create({
                title,
                description: description || null,
                status: 'PENDING',
                severity: null,
                organizationId: req.orgId,
                userId: req.userId,
                templateId: templateId || null,
                audioUrl: audioUrl || null,
                audioTranscript: null,
                imageUrls: imageUrls || [],
                findings: null,
                executiveSummary: null,
                recommendedAction: null,
                aiModel: null,
                aiResponseTime: null,
                metadata: null,
                tags: tags || [],
                completedAt: null,
            });
            res.status(201).json(report);
        }
        catch (error) {
            console.error('Error creating report:', error);
            res.status(500).json({ error: 'Failed to create report' });
        }
    });
    router.get('/', async (req, res) => {
        try {
            if (!req.orgId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const skip = parseInt(req.query.skip) || 0;
            const take = Math.min(parseInt(req.query.take) || 20, 100);
            const status = req.query.status;
            const { items, total } = await reportRepo.findMany(req.orgId, { skip, take, status });
            res.json({ items, total, skip, take });
        }
        catch (error) {
            console.error('Error listing reports:', error);
            res.status(500).json({ error: 'Failed to list reports' });
        }
    });
    router.get('/:id', async (req, res) => {
        try {
            if (!req.orgId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const report = await reportRepo.findById(req.params.id);
            if (!report || report.organizationId !== req.orgId) {
                return res.status(404).json({ error: 'Report not found' });
            }
            res.json(report);
        }
        catch (error) {
            console.error('Error getting report:', error);
            res.status(500).json({ error: 'Failed to get report' });
        }
    });
    router.post('/upload-url', async (req, res) => {
        try {
            const { reportId, type, index, contentType } = req.body;
            if (!req.orgId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const report = await reportRepo.findById(reportId);
            if (!report || report.organizationId !== req.orgId) {
                return res.status(404).json({ error: 'Report not found' });
            }
            const result = await processMediaUseCase.generateUploadUrl(req.orgId, reportId, type, index, contentType);
            res.json(result);
        }
        catch (error) {
            console.error('Error generating upload URL:', error);
            res.status(500).json({ error: 'Failed to generate upload URL' });
        }
    });
    router.post('/:id/generate', async (req, res) => {
        try {
            if (!req.orgId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const report = await reportRepo.findById(req.params.id);
            if (!report || report.organizationId !== req.orgId) {
                return res.status(404).json({ error: 'Report not found' });
            }
            await queueService.addJob('generate-report', { reportId: req.params.id });
            res.json({ message: 'Report generation started', reportId: req.params.id });
        }
        catch (error) {
            console.error('Error generating report:', error);
            res.status(500).json({ error: 'Failed to generate report' });
        }
    });
    router.delete('/:id', async (req, res) => {
        try {
            if (!req.orgId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const report = await reportRepo.findById(req.params.id);
            if (!report || report.organizationId !== req.orgId) {
                return res.status(404).json({ error: 'Report not found' });
            }
            if (report.audioUrl) {
                const key = report.audioUrl.split('/').slice(-4).join('/');
                await s3Service.deleteFile(key).catch(() => { });
            }
            for (const url of report.imageUrls) {
                const key = url.split('/').slice(-4).join('/');
                await s3Service.deleteFile(key).catch(() => { });
            }
            await reportRepo.delete(req.params.id);
            res.json({ message: 'Report deleted' });
        }
        catch (error) {
            console.error('Error deleting report:', error);
            res.status(500).json({ error: 'Failed to delete report' });
        }
    });
    return router;
}
//# sourceMappingURL=reports.routes.js.map