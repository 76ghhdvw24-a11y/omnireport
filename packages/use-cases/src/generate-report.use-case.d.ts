import { Report } from '@omnireport/shared';
import { GeminiService, WhisperService } from '@omnireport/infrastructure';
export interface ReportRepository {
    findById(id: string): Promise<Report | null>;
    update(id: string, data: Partial<Report>): Promise<void>;
    getTemplate(id: string): Promise<{
        systemPrompt: string;
        outputFormat: Record<string, unknown>;
    } | null>;
}
export interface GenerateReportUseCaseDeps {
    reportRepo: ReportRepository;
    geminiService: GeminiService;
    whisperService: WhisperService;
}
export declare class GenerateReportUseCase {
    private reportRepo;
    private geminiService;
    private whisperService;
    constructor(deps: GenerateReportUseCaseDeps);
    execute(reportId: string): Promise<void>;
    private getDefaultSystemPrompt;
    private getDefaultOutputFormat;
}
//# sourceMappingURL=generate-report.use-case.d.ts.map