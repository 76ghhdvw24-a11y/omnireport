import { Finding, AIAnalysisResult, Severity } from '@omnireport/shared';

export interface NvidiaConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface NvidiaAnalysisRequest {
  transcript: string;
  images: Array<{ url: string; mimeType: string }>;
  systemPrompt: string;
  outputFormat: Record<string, unknown>;
}

export class NvidiaService {
  private config: NvidiaConfig;
  private invokeUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';

  constructor(config: NvidiaConfig) {
    this.config = config;
  }

  async analyzeMedia(request: NvidiaAnalysisRequest): Promise<AIAnalysisResult> {
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    const hasTranscript = request.transcript.trim().length > 0;
    const transcriptSection = hasTranscript
      ? `TRANSCRIPT:\n${request.transcript}\n\n`
      : '';

    const prompt = `ANALYZE THE FOLLOWING:\n\n${transcriptSection}${request.images.length > 0 ? `${request.images.length} image(s) provided` : 'No images provided'}\n\nProvide a structured analysis following this format:\n${JSON.stringify(request.outputFormat, null, 2)}\n\nEnsure the response is valid JSON with all required fields.`;

    content.push({ type: 'text', text: prompt });

    for (const img of request.images) {
      const base64 = await this.fetchImageAsBase64(img.url);
      content.push({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${base64}` },
      });
    }

    const response = await fetch(this.invokeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`NVIDIA API error ${response.status}: ${body}`);
    }

    const data = await response.json() as Record<string, any>;
    const text = data.choices?.[0]?.message?.content || '';

    return this.parseAnalysisResponse(text);
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch image: ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
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
      urgency: (f as Record<string, unknown>).urgency ? String((f as Record<string, unknown>).urgency) as Severity : undefined,
    }));
  }
}