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
export declare class Template {
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
    constructor(props: TemplateProps);
    static create(props: Omit<TemplateProps, 'id' | 'createdAt' | 'updatedAt'>): Template;
    activate(): void;
    deactivate(): void;
    isGlobal(): boolean;
}
//# sourceMappingURL=template.entity.d.ts.map