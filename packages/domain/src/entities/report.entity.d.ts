import { ReportStatus, Severity, Finding, AIAnalysisResult } from '@omnireport/shared';
export interface ReportProps {
    id: string;
    title: string;
    description: string | null;
    status: ReportStatus;
    severity: Severity | null;
    organizationId: string;
    userId: string;
    templateId: string | null;
    audioUrl: string | null;
    audioTranscript: string | null;
    imageUrls: string[];
    findings: Finding[] | null;
    executiveSummary: string | null;
    recommendedAction: string | null;
    aiModel: string | null;
    aiResponseTime: number | null;
    metadata: Record<string, unknown> | null;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
}
export declare class Report {
    readonly id: string;
    title: string;
    readonly description: string | null;
    status: ReportStatus;
    severity: Severity | null;
    readonly organizationId: string;
    readonly userId: string;
    readonly templateId: string | null;
    audioUrl: string | null;
    audioTranscript: string | null;
    imageUrls: string[];
    findings: Finding[] | null;
    executiveSummary: string | null;
    recommendedAction: string | null;
    aiModel: string | null;
    aiResponseTime: number | null;
    readonly metadata: Record<string, unknown> | null;
    tags: string[];
    readonly createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    constructor(props: ReportProps);
    static create(props: Omit<ReportProps, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>): Report;
    startProcessing(): void;
    setTranscribing(): void;
    setAnalyzing(): void;
    completeWithAnalysis(analysis: AIAnalysisResult, aiModel: string, responseTime: number): void;
    fail(): void;
    private calculateSeverity;
    isProcessing(): boolean;
    isCompleted(): boolean;
    isFailed(): boolean;
}
//# sourceMappingURL=report.entity.d.ts.map