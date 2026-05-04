import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { QueueService, S3Service, PDFGeneratorService, logger } from '@omnireport/infrastructure';
import { ProcessMediaUseCase } from '@omnireport/use-cases';
import { PrismaReportRepository } from '@omnireport/infrastructure';
import { createUploadMiddleware, validateFileContent } from '../middleware/file-validator';

const createReportSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  templateId: z.string().optional(),
  clientId: z.string().optional().nullable(),
  audioUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  language: z.string().optional(),
});

const updateReportSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).optional(),
  audioUrl: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  findings: z.array(z.any()).optional(),
  executiveSummary: z.string().optional().nullable(),
  recommendedAction: z.string().optional().nullable(),
  subtotal: z.number().optional().nullable(),
  taxRate: z.number().optional().nullable(),
  tax: z.number().optional().nullable(),
  total: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'APPROVED', 'COMPLETED']).optional(),
});

const uploadMiddleware = createUploadMiddleware({ maxSize: 50 * 1024 * 1024, maxFiles: 10 });

export function createReportsRoutes(
  prisma: PrismaClient,
  processMediaUseCase: ProcessMediaUseCase,
  queueService: QueueService,
  s3Service: S3Service,
  pdfService: PDFGeneratorService
): Router {
  const router = Router();
  const reportRepo = new PrismaReportRepository(prisma);

  router.post('/', async (req, res) => {
    try {
      if (!req.orgId || !req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = createReportSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const { title, description, templateId, clientId, audioUrl, imageUrls, tags, language } = result.data;

      const org = await prisma.organization.findUnique({ where: { id: req.orgId } });
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const reportCount = await prisma.report.count({ where: { organizationId: req.orgId } });
      const maxReports = org.plan === 'ENTERPRISE' ? -1 : org.plan === 'PRO' ? 100 : 10;
      if (maxReports !== -1 && reportCount >= maxReports) {
        return res.status(403).json({
          error: 'Report limit reached',
          details: `Your ${org.plan} plan allows up to ${maxReports} reports. Upgrade to create more.`,
          currentCount: reportCount,
          maxReports,
        });
      }

      const report = await reportRepo.create({
        title,
        description: description || null,
        status: 'PENDING',
        severity: null,
        organizationId: req.orgId,
        userId: req.userId,
        templateId: templateId || null,
        clientId: clientId || null,
        audioUrl: audioUrl || null,
        audioTranscript: null,
        imageUrls: imageUrls || [],
        findings: null,
        executiveSummary: null,
        recommendedAction: null,
        aiModel: null,
        aiResponseTime: null,
        subtotal: null,
        taxRate: null,
        tax: null,
        total: null,
        currency: org?.currency || 'CLP',
        language: language || org?.language || 'es',
        paymentTerms: null,
        metadata: null,
        tags: tags || [],
      });

      res.status(201).json(report);
    } catch (error) {
      logger.error({ err: error }, 'Error creating report');
      res.status(500).json({ error: 'Failed to create report' });
    }
  });

  router.get('/stats', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalReports,
        thisMonthReports,
        approvedReports,
        totalValueAgg,
        statusCounts,
        severityCounts,
      ] = await Promise.all([
        prisma.report.count({ where: { organizationId: req.orgId } }),
        prisma.report.count({ where: { organizationId: req.orgId, createdAt: { gte: startOfMonth } } }),
        prisma.report.count({ where: { organizationId: req.orgId, status: 'APPROVED' } }),
        prisma.report.aggregate({
          where: { organizationId: req.orgId, total: { not: null } },
          _sum: { total: true },
        }),
        prisma.report.groupBy({
          by: ['status'],
          where: { organizationId: req.orgId },
          _count: { status: true },
        }),
        prisma.report.groupBy({
          by: ['severity'],
          where: { organizationId: req.orgId, severity: { not: null } },
          _count: { severity: true },
        }),
      ]);

      const statusDistribution = statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      }, {} as Record<string, number>);

      const severityDistribution = severityCounts.reduce((acc, curr) => {
        if (curr.severity) acc[curr.severity] = curr._count.severity;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        totalReports,
        thisMonthReports,
        approvedReports,
        approvalRate: totalReports > 0 ? Math.round((approvedReports / totalReports) * 100) : 0,
        totalValue: totalValueAgg._sum.total || 0,
        statusDistribution,
        severityDistribution,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting report stats');
      res.status(500).json({ error: 'Failed to get report stats' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const skip = parseInt(req.query.skip as string) || 0;
      const take = Math.min(parseInt(req.query.take as string) || 20, 100);
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

      const { items, total } = await reportRepo.findMany(req.orgId, { skip, take, status, search, sortBy, sortOrder });

      res.json({ items, total, skip, take });
    } catch (error) {
      logger.error({ err: error }, 'Error listing reports');
      res.status(500).json({ error: 'Failed to list reports' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const report = await reportRepo.findById(req.params.id as string);
      if (!report || report.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const signedImageUrls = await Promise.all(
        report.imageUrls.map((url: string) => {
          const key = url.replace(/^https:\/\/[^/]+\//, '');
          return s3Service.generatePresignedDownloadUrl(decodeURIComponent(key));
        })
      );

      let signedAudioUrl: string | null = null;
      if (report.audioUrl) {
        const key = report.audioUrl.replace(/^https:\/\/[^/]+\//, '');
        signedAudioUrl = await s3Service.generatePresignedDownloadUrl(decodeURIComponent(key));
      }

      const client = report.clientId
        ? await prisma.client.findUnique({ where: { id: report.clientId } })
        : null;

      const org = await prisma.organization.findUnique({ where: { id: req.orgId } });

      res.json({
        ...report,
        imageUrls: signedImageUrls,
        audioUrl: signedAudioUrl,
        client: client ? {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          taxId: client.taxId,
        } : null,
        organization: org ? {
          name: org.name,
          logoUrl: org.logoUrl,
          address: org.address,
          phone: org.phone,
          taxId: org.taxId,
          currency: org.currency,
          language: org.language,
        } : null,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting report');
      res.status(500).json({ error: 'Failed to get report' });
    }
  });

  router.post('/upload-url', async (req, res) => {
    try {
      const { reportId, type, index, contentType } = req.body;

      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const report = await reportRepo.findById(reportId);
      if (!report || report.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const result = await processMediaUseCase.generateUploadUrl(
        req.orgId,
        reportId,
        type,
        index,
        contentType
      );

      res.json(result);
    } catch (error) {
      logger.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });

  router.post('/:id/upload', (req: any, res: any, next: any) => {
    uploadMiddleware(req, res, (err: any) => {
      if (err) return next(err);
      validateFileContent(req, res, next);
    });
  }, async (req: any, res: any) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const report = await reportRepo.findById(req.params.id as string);
      if (!report || report.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const videoFiles = files.filter((f: any) => f.mimetype.startsWith('video/'));
      if (videoFiles.length > 0) {
        return res.status(400).json({
          error: 'Video files are not supported. Please upload images or audio files only.',
          unsupportedFiles: videoFiles.map((f: any) => f.originalname),
        });
      }

      const imageUrls: string[] = report.imageUrls ? [...report.imageUrls] : [];
      let audioUrl: string | null = report.audioUrl;

      for (const file of files) {
        const isImage = file.mimetype.startsWith('image/');
        const isAudio = file.mimetype.startsWith('audio/');
        const type: 'image' | 'audio' = isImage ? 'image' : 'audio';
        const extension = path.extname(file.originalname).toLowerCase().replace('.', '');

        const key = s3Service.generateFileKey(
          req.orgId,
          report.id,
          type,
          type === 'image' ? imageUrls.length : 0,
          extension
        );

        await s3Service.uploadBuffer(key, file.buffer, file.mimetype);

        const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;

        if (isImage) {
          imageUrls.push(s3Url);
        } else if (isAudio) {
          audioUrl = s3Url;
        }
      }

      await reportRepo.update(report.id, { imageUrls, audioUrl });

      res.json({ imageUrls, audioUrl });
    } catch (error: any) {
      logger.error({ err: error }, 'Error uploading files');
      res.status(500).json({ error: 'Failed to upload files', detail: error?.message });
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const report = await reportRepo.findById(req.params.id as string);
      if (!report || report.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (report.status === 'APPROVED') {
        return res.status(403).json({ error: 'Cannot edit an approved report' });
      }

      const validationResult = updateReportSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: 'Invalid input', details: validationResult.error.flatten() });
      }

      const updateData: Record<string, unknown> = validationResult.data;

      if (req.body.status === 'DRAFT' && report.status === 'COMPLETED') {
        updateData.status = 'DRAFT';
      }
      if (req.body.status === 'APPROVED' && report.status === 'DRAFT') {
        updateData.status = 'APPROVED';
      }
      if (req.body.status === 'COMPLETED' && report.status === 'DRAFT') {
        updateData.status = 'COMPLETED';
      }

      await reportRepo.update(req.params.id, updateData as any);
      const updated = await reportRepo.findById(req.params.id);
      res.json(updated);
    } catch (error) {
      logger.error({ err: error }, 'Error updating report');
      res.status(500).json({ error: 'Failed to update report' });
    }
  });

  router.post('/:id/generate', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const report = await reportRepo.findById(req.params.id as string);
      if (!report || report.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Report not found' });
      }

      await queueService.addJob('generate-report', { reportId: req.params.id });

      res.json({ message: 'Report generation started', reportId: req.params.id });
    } catch (error) {
      logger.error({ err: error }, 'Error generating report');
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  router.get('/:id/pdf', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const report = await reportRepo.findById(req.params.id as string);
      if (!report || report.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const org = await prisma.organization.findUnique({ where: { id: req.orgId } });
      const client = report.clientId
        ? await prisma.client.findUnique({ where: { id: report.clientId } })
        : null;

      const orgInfo = org ? {
        name: org.name,
        address: org.address,
        phone: org.phone,
        taxId: org.taxId,
        logoUrl: org.logoUrl,
        currency: org.currency,
        language: org.language,
      } : undefined;

      const clientInfo = client ? {
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        taxId: client.taxId,
      } : undefined;

      const pdfBuffer = await pdfService.generateReport(report, orgInfo, clientInfo);

      const isPreview = req.query.preview === 'true' || req.query.preview === '1';
      const filename = `${report.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${isPreview ? 'inline' : 'attachment'}; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error({ err: error }, 'Error generating PDF');
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const report = await reportRepo.findById(req.params.id as string);
      if (!report || report.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (report.audioUrl) {
        try {
          const url = new URL(report.audioUrl);
          await s3Service.deleteFile(url.pathname.substring(1));
        } catch {}
      }

      for (const url of report.imageUrls) {
        try {
          const parsed = new URL(url);
          await s3Service.deleteFile(parsed.pathname.substring(1));
        } catch {}
      }

      await reportRepo.delete(req.params.id);

      res.json({ message: 'Report deleted' });
    } catch (error) {
      logger.error({ err: error }, 'Error deleting report');
      res.status(500).json({ error: 'Failed to delete report' });
    }
  });

  router.get('/:id/events', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const reportId = req.params.id as string;
      const report = await reportRepo.findById(reportId);
      if (!report || report.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const sendEvent = (data: unknown) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      let lastStatus = report.status;
      sendEvent({ type: 'connected', status: lastStatus, reportId });

      // Send initial heartbeat
      res.write(':heartbeat\n\n');

      const interval = setInterval(async () => {
        try {
          const current = await reportRepo.findById(reportId);
          if (!current) {
            sendEvent({ type: 'deleted', reportId });
            clearInterval(interval);
            res.end();
            return;
          }

          if (current.status !== lastStatus) {
            lastStatus = current.status;
            sendEvent({ type: 'status-change', status: current.status, reportId });
          }

          // Heartbeat to keep connection alive
          res.write(':heartbeat\n\n');

          // Close when processing is done
          if (['COMPLETED', 'FAILED', 'DRAFT', 'APPROVED'].includes(current.status)) {
            clearInterval(interval);
            sendEvent({ type: 'done', status: current.status, reportId });
            res.end();
          }
        } catch {
          res.write(':heartbeat\n\n');
        }
      }, 2000);

      req.on('close', () => {
        clearInterval(interval);
        res.end();
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in SSE');
      res.status(500).json({ error: 'Failed to establish SSE' });
    }
  });

  return router;
}