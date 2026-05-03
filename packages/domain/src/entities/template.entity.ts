import { v4 as uuidv4 } from 'uuid';
import { Industry } from '@omnireport/shared';

export interface TemplateProps {
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

export class Template {
  readonly id: string;
  name: string;
  readonly description: string | null;
  readonly industry: Industry;
  readonly systemPrompt: string;
  readonly outputFormat: Record<string, unknown>;
  isActive: boolean;
  readonly organizationId: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: TemplateProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.industry = props.industry;
    this.systemPrompt = props.systemPrompt;
    this.outputFormat = props.outputFormat;
    this.isActive = props.isActive;
    this.organizationId = props.organizationId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: Omit<TemplateProps, 'id' | 'createdAt' | 'updatedAt'>): Template {
    const now = new Date();
    return new Template({
      ...props,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    });
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  isGlobal(): boolean {
    return this.organizationId === null;
  }
}
