export type ReportStatus = 'PENDING' | 'PROCESSING' | 'TRANSCRIBING' | 'ANALYZING' | 'COMPLETED' | 'DRAFT' | 'APPROVED' | 'FAILED';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Industry = 'AUTOMOTIVE' | 'CONSTRUCTION' | 'MANUFACTURING' | 'INSURANCE' | 'REAL_ESTATE' | 'GENERAL';

export interface Finding {
  description: string;
  severity: Severity;
  confidence: number;
  component?: string;
  condition?: string;
  estimatedCost?: number;
  quantity?: number;
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
  clientId: string | null;
  audioUrl: string | null;
  audioTranscript: string | null;
  imageUrls: string[];
  findings: Finding[] | null;
  executiveSummary: string | null;
  recommendedAction: string | null;
  aiModel: string | null;
  aiResponseTime: number | null;
  subtotal: number | null;
  taxRate: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  language: string | null;
  paymentTerms: string | null;
  metadata: Record<string, unknown> | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface ChatMessage {
  id: string;
  reportId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}