import { Report } from '@omnireport/shared';

export interface ReportRepository {
  findById(id: string): Promise<Report | null>;
  update(id: string, data: Partial<Report>): Promise<void>;
  getTemplate(id: string): Promise<{ systemPrompt: string; outputFormat: Record<string, unknown> } | null>;
}
