import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Queue, Worker, Job } from 'bullmq';
import { S3Service, WhisperService } from '@omnireport/infrastructure';
import { Report, Finding, Severity, AIAnalysisResult } from '@omnireport/shared';

async function callNvidiaAI(request: {
  transcript: string;
  images: Array<{ url: string; mimeType: string }>;
  systemPrompt: string;
  outputFormat: Record<string, unknown>;
}): Promise<AIAnalysisResult> {
  const apiKey = process.env.NVIDIA_API_KEY || '';
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  const hasTranscript = request.transcript.trim().length > 0;
  const transcriptSection = hasTranscript ? `TRANSCRIPT:\n${request.transcript}\n\n` : '';
  const prompt = `ANALYZE THE FOLLOWING:\n\n${transcriptSection}${request.images.length > 0 ? `${request.images.length} image(s) provided` : 'No images provided'}\n\nProvide a structured analysis following this format:\n${JSON.stringify(request.outputFormat, null, 2)}\n\nEnsure the response is valid JSON with all required fields.`;

  content.push({ type: 'text', text: prompt });

  for (const img of request.images) {
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${base64}` } });
  }

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemma-4-31b-it',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content },
      ],
      max_tokens: 16384,
      temperature: 0.2,
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NVIDIA API error ${response.status}: ${body}`);
  }

  const data = await response.json() as Record<string, any>;
  const text = data.choices?.[0]?.message?.content || '';
  const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in AI response');
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    findings: (Array.isArray(parsed.findings) ? parsed.findings : []).map((f: any) => ({
      description: String(f.description || ''),
      severity: (String(f.severity || 'INFO') as Severity),
      confidence: Number(f.confidence || 0),
      component: f.component ? String(f.component) : undefined,
      condition: f.condition ? String(f.condition) : undefined,
    })),
    executiveSummary: String(parsed.executiveSummary || ''),
    recommendedAction: String(parsed.recommendedAction || ''),
  };
}

class WorkerReportRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Report | null> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) return null;
    return this.mapToReport(report);
  }

  async update(id: string, data: Partial<Report>): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.audioTranscript !== undefined) updateData.audioTranscript = data.audioTranscript;
    if (data.findings !== undefined) updateData.findings = data.findings;
    if (data.executiveSummary !== undefined) updateData.executiveSummary = data.executiveSummary;
    if (data.recommendedAction !== undefined) updateData.recommendedAction = data.recommendedAction;
    if (data.aiModel !== undefined) updateData.aiModel = data.aiModel;
    if (data.aiResponseTime !== undefined) updateData.aiResponseTime = data.aiResponseTime;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
    updateData.updatedAt = new Date();

    await this.prisma.report.update({ where: { id }, data: updateData });
  }

  async getTemplate(
    id: string
  ): Promise<{ systemPrompt: string; outputFormat: Record<string, unknown> } | null> {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) return null;
    return {
      systemPrompt: template.systemPrompt,
      outputFormat: template.outputFormat as Record<string, unknown>,
    };
  }

  private mapToReport(prismaReport: any): Report {
    return {
      id: prismaReport.id,
      title: prismaReport.title,
      description: prismaReport.description,
      status: prismaReport.status,
      severity: prismaReport.severity,
      organizationId: prismaReport.organizationId,
      userId: prismaReport.userId,
      templateId: prismaReport.templateId,
      audioUrl: prismaReport.audioUrl,
      audioTranscript: prismaReport.audioTranscript,
      imageUrls: prismaReport.imageUrls || [],
      findings: prismaReport.findings as any,
      executiveSummary: prismaReport.executiveSummary,
      recommendedAction: prismaReport.recommendedAction,
      aiModel: prismaReport.aiModel,
      aiResponseTime: prismaReport.aiResponseTime,
      metadata: prismaReport.metadata as any,
      tags: prismaReport.tags || [],
      createdAt: prismaReport.createdAt,
      updatedAt: prismaReport.updatedAt,
      completedAt: prismaReport.completedAt,
    };
  }
}

async function main() {
  const prisma = new PrismaClient();
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  console.log('[Worker] Connecting to Redis at:', redisUrl);

  const redisConnectionOptions = {
    host: redisUrl.includes('//') ? new URL(redisUrl).hostname : 'localhost',
    port: redisUrl.includes('//') ? parseInt(new URL(redisUrl).port) || 6379 : 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  console.log('[Worker] Redis connection options:', JSON.stringify(redisConnectionOptions, null, 2));

  const queue = new Queue('reports', { connection: redisConnectionOptions });

  const s3Service = new S3Service({
    region: process.env.AWS_REGION || 'us-east-2',
    bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  });

const whisperService = new WhisperService({
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'whisper-1',
  });

  const reportRepo = new WorkerReportRepository(prisma);

  console.log('Worker started, waiting for jobs...');

  const extractS3Key = (url: string): string => {
    return decodeURIComponent(url.replace(/^https:\/\/[^/]+\//, ''));
  };

  const worker = new Worker(
    'reports',
    async (job: Job) => {
      if (job.name === 'generate-report') {
        const { reportId } = job.data as { reportId: string };
        console.log(`Processing report: ${reportId}`);

        try {
          await reportRepo.update(reportId, { status: 'PROCESSING' });

          const report = await reportRepo.findById(reportId);
          if (!report) throw new Error('Report not found');

          const extractS3Key = (url: string): string => decodeURIComponent(url.replace(/^https:\/\/[^/]+\//, ''));

          console.log(`[Worker] Generating presigned URLs for ${report.imageUrls.length} images`);
          const presignedImageUrls = await Promise.all(
            report.imageUrls.map((url: string) => s3Service.generatePresignedDownloadUrl(extractS3Key(url)))
          );
          let presignedAudioUrl: string | null = null;
          if (report.audioUrl) {
            presignedAudioUrl = await s3Service.generatePresignedDownloadUrl(extractS3Key(report.audioUrl));
          }

          console.log(`[Worker] First presigned URL: ${presignedImageUrls[0]?.substring(0, 80)}...`);

          let transcript = '';
          if (presignedAudioUrl) {
            await reportRepo.update(reportId, { status: 'TRANSCRIBING' });
            const transcription = await whisperService.transcribe({ audioUrl: presignedAudioUrl, language: 'en' });
            transcript = transcription.text;
            await reportRepo.update(reportId, { audioTranscript: transcript });
          }

          await reportRepo.update(reportId, { status: 'ANALYZING' });

          const startTime = Date.now();
          const analysis = await callNvidiaAI({
            transcript,
            images: presignedImageUrls.map(url => ({ url, mimeType: 'image/jpeg' })),
            systemPrompt: 'You are an expert technical analyst specializing in inspection reports. Analyze the provided images and transcript to produce a comprehensive technical report. Focus on identifying issues and their severity, understanding the context and components involved, providing actionable recommendations, and estimating impact and urgency. Be precise and technical in your analysis. If information is insufficient, acknowledge limitations rather than making assumptions.',
            outputFormat: {
              findings: [{ description: 'string', severity: 'CRITICAL | HIGH | MEDIUM | LOW | INFO', confidence: 0.0 }],
              executiveSummary: 'string',
              recommendedAction: 'string',
            },
          });

          const responseTime = Date.now() - startTime;

          await reportRepo.update(reportId, {
            status: 'COMPLETED',
            findings: analysis.findings,
            executiveSummary: analysis.executiveSummary,
            recommendedAction: analysis.recommendedAction,
            aiModel: 'google/gemma-4-31b-it',
            aiResponseTime: responseTime,
            completedAt: new Date(),
          });

          console.log(`Finished report: ${reportId}`);
        } catch (error: any) {
          console.error(`Error processing report ${reportId}:`, error.message);
          await reportRepo.update(reportId, { status: 'FAILED' });
          throw error;
        }
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 5,
      maxStalledCount: 0,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down worker...`);
    await worker.close();
    await queue.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Worker crashed:', error);
  process.exit(1);
}
);