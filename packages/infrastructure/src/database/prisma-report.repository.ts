import { PrismaClient, Prisma } from '@prisma/client';
import { Report } from '@omnireport/shared';
import { ReportRepository } from '@omnireport/domain';

export class PrismaReportRepository implements ReportRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Report | null> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) return null;
    return this.mapToReport(report);
  }

  async findMany(
    organizationId: string,
    options?: { skip?: number; take?: number; status?: string }
  ): Promise<{ items: Report[]; total: number }> {
    const where: Prisma.ReportWhereInput = { organizationId };
    if (options?.status) {
      where.status = options.status as any;
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

  async create(
    data: Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'> & { id?: string }
  ): Promise<Report> {
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
        findings: data.findings as any,
        executiveSummary: data.executiveSummary,
        recommendedAction: data.recommendedAction,
        aiModel: data.aiModel,
        aiResponseTime: data.aiResponseTime,
        metadata: data.metadata as any,
        tags: data.tags,
      },
    });
    return this.mapToReport(report);
  }

  async update(id: string, data: Partial<Report>): Promise<void> {
    const updateData: Prisma.ReportUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status as any;
    if (data.severity !== undefined) updateData.severity = data.severity as any;
    if (data.audioUrl !== undefined) updateData.audioUrl = data.audioUrl;
    if (data.audioTranscript !== undefined) updateData.audioTranscript = data.audioTranscript;
    if (data.imageUrls !== undefined) updateData.imageUrls = data.imageUrls;
    if (data.findings !== undefined) updateData.findings = data.findings as any;
    if (data.executiveSummary !== undefined) updateData.executiveSummary = data.executiveSummary;
    if (data.recommendedAction !== undefined) updateData.recommendedAction = data.recommendedAction;
    if (data.aiModel !== undefined) updateData.aiModel = data.aiModel;
    if (data.aiResponseTime !== undefined) updateData.aiResponseTime = data.aiResponseTime;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as any;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;

    await this.prisma.report.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.report.delete({ where: { id } });
  }

  async getTemplate(
    id: string
  ): Promise<{ systemPrompt: string; outputFormat: Record<string, unknown> } | null> {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) return null;
    return {
      systemPrompt: template.systemPrompt,
      outputFormat: template.outputFormat as Record<string, unknown>,
    };
  }

  private mapToReport(prismaReport: any): Report {
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
      findings: prismaReport.findings as any,
      executiveSummary: prismaReport.executiveSummary,
      recommendedAction: prismaReport.recommendedAction,
      aiModel: prismaReport.aiModel,
      aiResponseTime: prismaReport.aiResponseTime,
      metadata: prismaReport.metadata as any,
      tags: prismaReport.tags || [],
      createdAt: prismaReport.createdAt,
      updatedAt: prismaReport.updatedAt,
      completedAt: prismaReport.completedAt,
    };
  }
}
