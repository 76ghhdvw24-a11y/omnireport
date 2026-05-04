import { Report } from '@omnireport/shared';

export interface ReportRepository {
  findById(id: string): Promise<Report | null>;
  findMany(
    organizationId: string,
    options?: { skip?: number; take?: number; status?: string; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ): Promise<{ items: Report[]; total: number }>;
  create(data: Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'> & { id?: string }): Promise<Report>;
  update(id: string, data: Partial<Report>): Promise<void>;
  delete(id: string): Promise<void>;
  getTemplate(id: string): Promise<{ systemPrompt: string; outputFormat: Record<string, unknown> } | null>;
}