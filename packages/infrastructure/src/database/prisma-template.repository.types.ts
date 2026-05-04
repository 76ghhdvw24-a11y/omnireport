export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  industry: 'AUTOMOTIVE' | 'CONSTRUCTION' | 'MANUFACTURING' | 'INSURANCE' | 'REAL_ESTATE' | 'GENERAL';
  systemPrompt: string;
  outputFormat: Record<string, unknown>;
  isActive?: boolean;
  organizationId?: string | null;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  industry?: 'AUTOMOTIVE' | 'CONSTRUCTION' | 'MANUFACTURING' | 'INSURANCE' | 'REAL_ESTATE' | 'GENERAL';
  systemPrompt?: string;
  outputFormat?: Record<string, unknown>;
  isActive?: boolean;
}
