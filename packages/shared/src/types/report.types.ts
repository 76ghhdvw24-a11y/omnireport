export type ReportStatus = 'PENDING' | 'PROCESSING' | 'TRANSCRIBING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Industry = 'AUTOMOTIVE' | 'CONSTRUCTION' | 'MANUFACTURING' | 'INSURANCE' | 'REAL_ESTATE' | 'GENERAL';

export interface Finding {
  description: string;
  severity: Severity;
  confidence: number;
  component?: string;
  condition?: string;
  estimatedCost?: number;
  urgency?: Severity;
}

export interface AIAnalysisResult {
  findings: Finding[];
  executiveSummary: string;
  recommendedAction: string;
  estimatedTotalCost?: number;
  overallCondition?: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
}

export interface Report {
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