"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaReportRepository = void 0;
class PrismaReportRepository {
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
    async findMany(organizationId, options) {
        const where = { organizationId };
        if (options?.status) {
            where.status = options.status;
        }
        const [items, total] = await Promise.all([
            this.prisma.report.findMany({
                where,
                skip: options?.skip,
                take: options?.take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.report.count({ where }),
        ]);
        return { items: items.map((r) => this.mapToReport(r)), total };
    }
    async create(data) {
        const report = await this.prisma.report.create({
            data: {
                id: data.id,
                title: data.title,
                description: data.description,
                status: data.status,
                severity: data.severity,
                organizationId: data.organizationId,
                userId: data.userId,
                templateId: data.templateId,
                audioUrl: data.audioUrl,
                audioTranscript: data.audioTranscript,
                imageUrls: data.imageUrls,
                findings: data.findings,
                executiveSummary: data.executiveSummary,
                recommendedAction: data.recommendedAction,
                aiModel: data.aiModel,
                aiResponseTime: data.aiResponseTime,
                metadata: data.metadata,
                tags: data.tags,
            },
        });
        return this.mapToReport(report);
    }
    async update(id, data) {
        const updateData = {};
        if (data.title !== undefined)
            updateData.title = data.title;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.status !== undefined)
            updateData.status = data.status;
        if (data.severity !== undefined)
            updateData.severity = data.severity;
        if (data.audioUrl !== undefined)
            updateData.audioUrl = data.audioUrl;
        if (data.audioTranscript !== undefined)
            updateData.audioTranscript = data.audioTranscript;
        if (data.imageUrls !== undefined)
            updateData.imageUrls = data.imageUrls;
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
        if (data.metadata !== undefined)
            updateData.metadata = data.metadata;
        if (data.tags !== undefined)
            updateData.tags = data.tags;
        if (data.completedAt !== undefined)
            updateData.completedAt = data.completedAt;
        await this.prisma.report.update({
            where: { id },
            data: updateData,
        });
    }
    async delete(id) {
        await this.prisma.report.delete({ where: { id } });
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
exports.PrismaReportRepository = PrismaReportRepository;
//# sourceMappingURL=prisma-report.repository.js.map