import 'dotenv/config';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import { Queue, Worker, Job } from 'bullmq';
import { S3Service, WhisperService, NvidiaService, logger, validateWorkerEnv } from '@omnireport/infrastructure';
import { Report, Finding } from '@omnireport/shared';

let env: ReturnType<typeof validateWorkerEnv>;
try {
  env = validateWorkerEnv();
} catch (error) {
  console.error('❌ Invalid environment variables:', error);
  process.exit(1);
}

class WorkerReportRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Report | null> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) return null;
    return this.mapToReport(report);
  }

  async update(id: string, data: Partial<Report> & Record<string, unknown>): Promise<void> {
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
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
    if (data.tax !== undefined) updateData.tax = data.tax;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
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
      clientId: prismaReport.clientId,
      audioUrl: prismaReport.audioUrl,
      audioTranscript: prismaReport.audioTranscript,
      imageUrls: prismaReport.imageUrls || [],
      findings: prismaReport.findings,
      executiveSummary: prismaReport.executiveSummary,
      recommendedAction: prismaReport.recommendedAction,
      aiModel: prismaReport.aiModel,
      aiResponseTime: prismaReport.aiResponseTime,
      subtotal: prismaReport.subtotal,
      taxRate: prismaReport.taxRate,
      tax: prismaReport.tax,
      total: prismaReport.total,
      currency: prismaReport.currency,
      language: prismaReport.language,
      paymentTerms: prismaReport.paymentTerms,
      metadata: prismaReport.metadata,
      tags: prismaReport.tags || [],
      createdAt: prismaReport.createdAt,
      updatedAt: prismaReport.updatedAt,
      completedAt: prismaReport.completedAt,
    };
  }
}

const LANGUAGE_PROMPTS: Record<string, string> = {
  es: `Eres un analista técnico experto en generación de presupuestos e inspecciones. Tu objetivo es producir un PRESUPUESTO profesional que pueda ser entregado a un cliente.

IMPORTANTE:
- Responde SIEMPRE en español.
- Para cada hallazgo, incluye un costo estimado de reparación cuando sea posible.
- El resumen ejecutivo debe ser claro y orientado al cliente final.
- La acción recomendada debe ser específica y con prioridades claras.
- Estima el costo total del presupuesto (sumando hallazgos o dando un estimado global).

Analiza las imágenes y/o transcripción proporcionadas para producir un presupuesto técnico completo. Identifica problemas, evalúa severidad, y proporciona estimaciones de costo realistas.`,
  en: `You are an expert technical analyst specializing in inspection quotes and estimates. Your goal is to produce a professional QUOTE that can be delivered to a client.

IMPORTANT:
- Always respond in English.
- For each finding, include an estimated repair cost when possible.
- The executive summary should be clear and client-oriented.
- Recommended actions should be specific with clear priorities.
- Estimate the total cost of the quote (summing findings or providing a global estimate).

Analyze the provided images and/or transcript to produce a complete technical quote. Identify issues, assess severity, and provide realistic cost estimates.`,
  pt: `Você é um analista técnico especialista em orçamentos e inspeções. Seu objetivo é produzir um ORÇAMENTO profissional que possa ser entregue a um cliente.

IMPORTANTE:
- Responda SEMPRE em português.
- Para cada constatação, inclua um custo estimado de reparo quando possível.
- O resumo executivo deve ser claro e orientado ao cliente final.
- A ação recomendada deve ser específica com prioridades claras.
- Estime o custo total do orçamento (somando constatações ou dando uma estimativa global).

Analise as imagens e/ou transcrição fornecidas para produzir um orçamento técnico completo. Identifique problemas, avalie a severidade e forneça estimativas de custo realistas.`,
};

async function main() {
  const prisma = new PrismaClient();

  logger.info({ redisUrl: env.REDIS_URL }, '[Worker] Connecting to Redis');

  const redisConnectionOptions = {
    host: new URL(env.REDIS_URL).hostname,
    port: parseInt(new URL(env.REDIS_URL).port) || 6379,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };

  const queue = new Queue('reports', { connection: redisConnectionOptions });

  const s3Service = new S3Service({
    region: env.AWS_REGION,
    bucket: env.AWS_S3_BUCKET,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  });

  const whisperService = new WhisperService({
    apiKey: env.OPENAI_API_KEY,
    model: 'whisper-1',
  });

  const nvidiaService = new NvidiaService({
    apiKey: env.NVIDIA_API_KEY,
    model: 'google/gemma-4-31b-it',
    temperature: 0.2,
    maxTokens: 16384,
  });

  const reportRepo = new WorkerReportRepository(prisma);

  const healthPort = parseInt(process.env.PORT || '8080', 10);
  const healthServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  });

  healthServer.listen(healthPort, () => {
    logger.info(`Health check server listening on port ${healthPort}`);
  });

  logger.info('Worker started, waiting for jobs...');

  const extractS3Key = (url: string): string => {
    return decodeURIComponent(url.replace(/^https:\/\/[^/]+\//, ''));
  };

  const worker = new Worker(
    'reports',
    async (job: Job) => {
      if (job.name === 'generate-report') {
        const { reportId } = job.data as { reportId: string };
        logger.info(`Processing report: ${reportId}`);

        try {
          await reportRepo.update(reportId, { status: 'PROCESSING' });

          const report = await reportRepo.findById(reportId);
          if (!report) throw new Error('Report not found');

          const language = report.language || 'es';

          logger.info(`[Worker] Generating presigned URLs for ${report.imageUrls.length} images`);
          const presignedImageUrls = await Promise.all(
            report.imageUrls.map((url: string) => s3Service.generatePresignedDownloadUrl(extractS3Key(url)))
          );
          let presignedAudioUrl: string | null = null;
          if (report.audioUrl) {
            presignedAudioUrl = await s3Service.generatePresignedDownloadUrl(extractS3Key(report.audioUrl));
          }

          let transcript = '';
          if (presignedAudioUrl) {
            await reportRepo.update(reportId, { status: 'TRANSCRIBING' });
            const whisperLanguage = language === 'en' ? 'en' : language === 'pt' ? 'pt' : 'es';
            const transcription = await whisperService.transcribe({
              audioUrl: presignedAudioUrl,
              language: whisperLanguage,
            });
            transcript = transcription.text;
            await reportRepo.update(reportId, { audioTranscript: transcript });
          }

          await reportRepo.update(reportId, { status: 'ANALYZING' });

          let systemPrompt = LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS['es'];

          let outputFormat: Record<string, unknown> = {
            findings: [{ description: 'string', severity: 'CRITICAL | HIGH | MEDIUM | LOW | INFO', confidence: 0.0, component: 'string', estimatedCost: 0.0 }],
            executiveSummary: 'string',
            recommendedAction: 'string',
            estimatedTotalCost: 0.0,
          };

          if (report.templateId) {
            const template = await reportRepo.getTemplate(report.templateId);
            if (template) {
              systemPrompt = template.systemPrompt;
              outputFormat = template.outputFormat;
            }
          }

          const startTime = Date.now();
          const analysis = await nvidiaService.analyzeMedia({
            transcript,
            images: presignedImageUrls.map(url => ({ url, mimeType: 'image/jpeg' })),
            systemPrompt,
            outputFormat,
            language,
          });

          const responseTime = Date.now() - startTime;

          let subtotal: number | undefined;
          if (analysis.findings) {
            subtotal = analysis.findings.reduce((sum: number, f: Finding) => sum + (f.estimatedCost || 0) * (f.quantity || 1), 0);
          }
          const taxRate = report.taxRate ?? 19;
          const tax = subtotal ? subtotal * (taxRate / 100) : undefined;
          const total = analysis.estimatedTotalCost || (subtotal && tax ? subtotal + tax : subtotal);

          await reportRepo.update(reportId, {
            status: 'COMPLETED',
            findings: analysis.findings as any,
            executiveSummary: analysis.executiveSummary,
            recommendedAction: analysis.recommendedAction,
            aiModel: 'google/gemma-4-31b-it',
            aiResponseTime: responseTime,
            subtotal: subtotal ?? null,
            taxRate: taxRate,
            tax: tax ?? null,
            total: total ?? null,
            completedAt: new Date(),
          } as any);

          logger.info(`Finished report: ${reportId}`);
        } catch (error: any) {
          logger.error(`Error processing report ${reportId}:`, error.message);
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
    logger.info(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down worker...`);
    healthServer.close();
    await worker.close();
    await queue.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Worker crashed:', error);
  process.exit(1);
});