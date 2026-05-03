import { PrismaClient } from '@prisma/client';
import { Report } from '@omnireport/shared';
import { ReportRepository } from '@omnireport/use-cases';
export declare class PrismaReportRepository implements ReportRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    findById(id: string): Promise<Report | null>;
    findMany(organizationId: string, options?: {
        skip?: number;
        take?: number;
        status?: string;
    }): Promise<{
        items: Report[];
        total: number;
    }>;
    create(data: Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'> & {
        id?: string;
    }): Promise<Report>;
    update(id: string, data: Partial<Report>): Promise<void>;
    delete(id: string): Promise<void>;
    getTemplate(id: string): Promise<{
        systemPrompt: string;
        outputFormat: Record<string, unknown>;
    } | null>;
    private mapToReport;
}
//# sourceMappingURL=prisma-report.repository.d.ts.map