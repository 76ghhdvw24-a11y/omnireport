import { Industry } from '@omnireport/shared';

export interface TemplateEntity {
  id: string;
  name: string;
  description: string | null;
  industry: Industry;
  systemPrompt: string;
  outputFormat: Record<string, unknown>;
  isActive: boolean;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateRepository {
  findById(id: string): Promise<TemplateEntity | null>;
  findMany(
    organizationId?: string,
    options?: { industry?: Industry; skip?: number; take?: number }
  ): Promise<{ items: TemplateEntity[]; total: number }>;
  create(data: Omit<TemplateEntity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<TemplateEntity>;
  update(id: string, data: Partial<TemplateEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}