import { v4 as uuidv4 } from 'uuid';
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

export class Report {
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
  readonly taxRate: number | null;
  paymentTerms: string | null;
  metadata: Record<string, unknown> | null;
  tags: string[];
  readonly createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;

  constructor(props: ReportProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.status = props.status;
    this.severity = props.severity;
    this.organizationId = props.organizationId;
    this.userId = props.userId;
    this.templateId = props.templateId;
    this.audioUrl = props.audioUrl;
    this.audioTranscript = props.audioTranscript;
    this.imageUrls = props.imageUrls;
    this.findings = props.findings;
    this.executiveSummary = props.executiveSummary;
    this.recommendedAction = props.recommendedAction;
    this.aiModel = props.aiModel;
    this.aiResponseTime = props.aiResponseTime;
    this.taxRate = (props as any).taxRate ?? null;
    this.paymentTerms = (props as any).paymentTerms ?? null;
    this.metadata = props.metadata;
    this.tags = props.tags;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.completedAt = props.completedAt;
  }

  static create(props: Omit<ReportProps, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>): Report {
    const now = new Date();
    return new Report({
      ...props,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });
  }

  startProcessing(): void {
    this.status = 'PROCESSING';
    this.updatedAt = new Date();
  }

  setTranscribing(): void {
    this.status = 'TRANSCRIBING';
    this.updatedAt = new Date();
  }

  setAnalyzing(): void {
    this.status = 'ANALYZING';
    this.updatedAt = new Date();
  }

  completeWithAnalysis(analysis: AIAnalysisResult, aiModel: string, responseTime: number): void {
    this.status = 'COMPLETED';
    this.findings = analysis.findings;
    this.executiveSummary = analysis.executiveSummary;
    this.recommendedAction = analysis.recommendedAction;
    this.severity = this.calculateSeverity(analysis.findings);
    this.aiModel = aiModel;
    this.aiResponseTime = responseTime;
    this.updatedAt = new Date();
    this.completedAt = new Date();
  }

  fail(): void {
    this.status = 'FAILED';
    this.updatedAt = new Date();
  }

  private calculateSeverity(findings: Finding[]): Severity {
    if (findings.length === 0) return 'INFO';

    const hasCritical = findings.some(f => f.severity === 'CRITICAL');
    if (hasCritical) return 'CRITICAL';

    const hasHigh = findings.some(f => f.severity === 'HIGH');
    if (hasHigh) return 'HIGH';

    const hasMedium = findings.some(f => f.severity === 'MEDIUM');
    if (hasMedium) return 'MEDIUM';

    const hasLow = findings.some(f => f.severity === 'LOW');
    if (hasLow) return 'LOW';

    return 'INFO';
  }

  isProcessing(): boolean {
    return ['PENDING', 'PROCESSING', 'TRANSCRIBING', 'ANALYZING'].includes(this.status);
  }

  isCompleted(): boolean {
    return this.status === 'COMPLETED';
  }

  isFailed(): boolean {
    return this.status === 'FAILED';
  }
}
