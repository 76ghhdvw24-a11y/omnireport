"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateReportUseCase = void 0;
class GenerateReportUseCase {
    reportRepo;
    geminiService;
    whisperService;
    constructor(deps) {
        this.reportRepo = deps.reportRepo;
        this.geminiService = deps.geminiService;
        this.whisperService = deps.whisperService;
    }
    async execute(reportId) {
        await this.reportRepo.update(reportId, { status: 'PROCESSING' });
        try {
            const report = await this.reportRepo.findById(reportId);
            if (!report) {
                throw new Error('Report not found');
            }
            let transcript = '';
            if (report.audioUrl) {
                await this.reportRepo.update(reportId, { status: 'TRANSCRIBING' });
                const transcription = await this.whisperService.transcribe({
                    audioUrl: report.audioUrl,
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
                images: report.imageUrls.map(url => ({
                    url,
                    mimeType: 'image/jpeg',
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
        }
        catch (error) {
            await this.reportRepo.update(reportId, { status: 'FAILED' });
            throw error;
        }
    }
    getDefaultSystemPrompt() {
        return `You are an expert technical analyst specializing in inspection reports.

Analyze the provided images and transcript to produce a comprehensive technical report.

Focus on:
- Identifying issues and their severity
- Understanding the context and components involved
- Providing actionable recommendations
- Estimating impact and urgency

Be precise and technical in your analysis. If information is insufficient, acknowledge limitations rather than making assumptions.`;
    }
    getDefaultOutputFormat() {
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
exports.GenerateReportUseCase = GenerateReportUseCase;
//# sourceMappingURL=generate-report.use-case.js.map