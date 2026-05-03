"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
class GeminiService {
    client;
    config;
    constructor(config) {
        this.client = new generative_ai_1.GoogleGenerativeAI(config.apiKey);
        this.config = config;
    }
    async analyzeMedia(request) {
        const model = this.client.getGenerativeModel({
            model: this.config.model,
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxTokens,
                responseMimeType: 'application/json',
            },
        });
        const imageParts = await Promise.all(request.images.map(async (img) => {
            const imageData = await this.fetchImageAsBase64(img.url);
            return {
                inlineData: {
                    data: imageData,
                    mimeType: img.mimeType,
                },
            };
        }));
        const prompt = this.constructPrompt(request);
        const result = await model.generateContent([
            request.systemPrompt,
            prompt,
            ...imageParts,
        ]);
        const response = result.response;
        const text = response.text();
        return this.parseAnalysisResponse(text);
    }
    async fetchImageAsBase64(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
    }
    constructPrompt(request) {
        const hasTranscript = request.transcript.trim().length > 0;
        const transcriptSection = hasTranscript
            ? `TRANSCRIPT:\n${request.transcript}\n\n`
            : '';
        return `
ANALYZE THE FOLLOWING:

${transcriptSection}${request.images.length > 0 ? `${request.images.length} image(s) provided` : 'No images provided'}

Provide a structured analysis following this format:
${JSON.stringify(request.outputFormat, null, 2)}

Ensure the response is valid JSON with all required fields.
`.trim();
    }
    parseAnalysisResponse(text) {
        try {
            const cleaned = text.trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return this.validateAndNormalize(parsed);
        }
        catch (error) {
            throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    validateAndNormalize(parsed) {
        const data = parsed;
        return {
            findings: this.normalizeFindings(data.findings),
            executiveSummary: String(data.executiveSummary || ''),
            recommendedAction: String(data.recommendedAction || ''),
            estimatedTotalCost: data.estimatedTotalCost ? Number(data.estimatedTotalCost) : undefined,
            overallCondition: data.overallCondition ? String(data.overallCondition) : undefined,
        };
    }
    normalizeFindings(findings) {
        if (!Array.isArray(findings))
            return [];
        return findings.map(f => ({
            description: String(f.description || ''),
            severity: String(f.severity || 'INFO'),
            confidence: Number(f.confidence || 0),
            component: f.component ? String(f.component) : undefined,
            condition: f.condition ? String(f.condition) : undefined,
            estimatedCost: f.estimatedCost ? Number(f.estimatedCost) : undefined,
            urgency: f.urgency ? String(f.urgency) : undefined,
        }));
    }
}
exports.GeminiService = GeminiService;
//# sourceMappingURL=gemini.service.js.map