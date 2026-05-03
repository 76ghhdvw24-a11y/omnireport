import { AIAnalysisResult } from '@omnireport/shared';
export interface GeminiConfig {
    apiKey: string;
    model: 'gemini-1.5-pro' | 'gemini-1.5-flash';
    temperature: number;
    maxTokens: number;
}
export interface AnalysisRequest {
    transcript: string;
    images: Array<{
        url: string;
        mimeType: string;
    }>;
    systemPrompt: string;
    outputFormat: Record<string, unknown>;
}
export declare class GeminiService {
    private client;
    private config;
    constructor(config: GeminiConfig);
    analyzeMedia(request: AnalysisRequest): Promise<AIAnalysisResult>;
    private fetchImageAsBase64;
    private constructPrompt;
    private parseAnalysisResponse;
    private validateAndNormalize;
    private normalizeFindings;
}
//# sourceMappingURL=gemini.service.d.ts.map