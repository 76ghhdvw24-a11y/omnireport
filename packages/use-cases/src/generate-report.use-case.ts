import { Report, TranscriptionResult, AIAnalysisResult } from '@omnireport/shared';
import { ReportRepository } from '@omnireport/domain';
import { GeminiService, WhisperService, S3Service } from '@omnireport/infrastructure';

export interface GenerateReportUseCaseDeps {
  reportRepo: ReportRepository;
  geminiService: GeminiService;
  whisperService: WhisperService;
  s3Service: S3Service;
}

export class GenerateReportUseCase {
  private reportRepo: ReportRepository;
  private geminiService: GeminiService;
  private whisperService: WhisperService;
  private s3Service: S3Service;

  constructor(deps: GenerateReportUseCaseDeps) {
    this.reportRepo = deps.reportRepo;
    this.geminiService = deps.geminiService;
    this.whisperService = deps.whisperService;
    this.s3Service = deps.s3Service;
  }

  async execute(reportId: string): Promise<void> {
    await this.reportRepo.update(reportId, { status: 'PROCESSING' });

    try {
      const report = await this.reportRepo.findById(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      let transcript = '';
      if (report.audioUrl) {
        await this.reportRepo.update(reportId, { status: 'TRANSCRIBING' });

        const audioKey = report.audioUrl.replace(/^https:\/\/[^/]+\//, '');
        const presignedAudioUrl = await this.s3Service.generatePresignedDownloadUrl(decodeURIComponent(audioKey));

        const transcription = await this.whisperService.transcribe({
          audioUrl: presignedAudioUrl,
          language: 'en',
        });
        transcript = transcription.text;

        await this.reportRepo.update(reportId, {
          audioTranscript: transcript,
        });
      }

      await this.reportRepo.update(reportId, { status: 'ANALYZING' });

      const template = report.templateId
        ? await this.reportRepo.getTemplate(report.templateId)
        : null;

      const startTime = Date.now();

      const analysis = await this.geminiService.analyzeMedia({
        transcript,
        images: await Promise.all(report.imageUrls.map(async (url: string) => {
          const key = url.replace(/^https:\/\/[^/]+\//, '');
          const presignedUrl = await this.s3Service.generatePresignedDownloadUrl(decodeURIComponent(key));
          return {
            url: presignedUrl,
            mimeType: 'image/jpeg',
          };
        })),
        systemPrompt: template?.systemPrompt || this.getDefaultSystemPrompt(),
        outputFormat: template?.outputFormat || this.getDefaultOutputFormat(),
      });

      const responseTime = Date.now() - startTime;

      await this.reportRepo.update(reportId, {
        status: 'COMPLETED',
        findings: analysis.findings,
        executiveSummary: analysis.executiveSummary,
        recommendedAction: analysis.recommendedAction,
        aiModel: 'gemini-1.5-pro',
        aiResponseTime: responseTime,
        completedAt: new Date(),
      });

    } catch (error) {
      await this.reportRepo.update(reportId, { status: 'FAILED' });
      throw error;
    }
  }

  private getDefaultSystemPrompt(): string {
    return `You are an expert technical analyst specializing in inspection reports.

Analyze the provided images and transcript to produce a comprehensive technical report.

Focus on:
- Identifying issues and their severity
- Understanding the context and components involved
- Providing actionable recommendations
- Estimating impact and urgency

Be precise and technical in your analysis. If information is insufficient, acknowledge limitations rather than making assumptions.`;
  }

  private getDefaultOutputFormat(): Record<string, unknown> {
    return {
      findings: [
        {
          description: 'string',
          severity: 'CRITICAL | HIGH | MEDIUM | LOW | INFO',
          confidence: 0.0,
        },
      ],
      executiveSummary: 'string',
      recommendedAction: 'string',
    };
  }
}
