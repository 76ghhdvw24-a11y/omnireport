import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Finding, AIAnalysisResult, Severity } from '@omnireport/shared';

export interface GeminiConfig {
  apiKey: string;
  model: 'gemini-1.5-pro' | 'gemini-1.5-flash';
  temperature: number;
  maxTokens: number;
}

export interface AnalysisRequest {
  transcript: string;
  images: Array<{ url: string; mimeType: string }>;
  systemPrompt: string;
  outputFormat: Record<string, unknown>;
}

export class GeminiService {
  private client: GoogleGenerativeAI;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.config = config;
  }

  async analyzeMedia(request: AnalysisRequest): Promise<AIAnalysisResult> {
    const model = this.client.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        responseMimeType: 'application/json',
      },
    });

    const imageParts = await Promise.all(
      request.images.map(async (img) => {
        const imageData = await this.fetchImageAsBase64(img.url);
        return {
          inlineData: {
            data: imageData,
            mimeType: img.mimeType,
          },
        };
      })
    );

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

  private async fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  private constructPrompt(request: AnalysisRequest): string {
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

  private parseAnalysisResponse(text: string): AIAnalysisResult {
    try {
      const cleaned = text.trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return this.validateAndNormalize(parsed);
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateAndNormalize(parsed: unknown): AIAnalysisResult {
    const data = parsed as Record<string, unknown>;

    return {
      findings: this.normalizeFindings(data.findings),
      executiveSummary: String(data.executiveSummary || ''),
      recommendedAction: String(data.recommendedAction || ''),
      estimatedTotalCost: data.estimatedTotalCost ? Number(data.estimatedTotalCost) : undefined,
      overallCondition: data.overallCondition ? String(data.overallCondition) : undefined,
    };
  }

  private normalizeFindings(findings: unknown): Finding[] {
    if (!Array.isArray(findings)) return [];

    return findings.map(f => ({
      description: String((f as Record<string, unknown>).description || ''),
      severity: (String((f as Record<string, unknown>).severity || 'INFO') as Severity),
      confidence: Number((f as Record<string, unknown>).confidence || 0),
      component: (f as Record<string, unknown>).component ? String((f as Record<string, unknown>).component) : undefined,
      condition: (f as Record<string, unknown>).condition ? String((f as Record<string, unknown>).condition) : undefined,
      estimatedCost: (f as Record<string, unknown>).estimatedCost ? Number((f as Record<string, unknown>).estimatedCost) : undefined,
      quantity: (f as Record<string, unknown>).quantity ? Number((f as Record<string, unknown>).quantity) : undefined,
      urgency: (f as Record<string, unknown>).urgency ? String((f as Record<string, unknown>).urgency) as Severity : undefined,
    }));
  }
}
