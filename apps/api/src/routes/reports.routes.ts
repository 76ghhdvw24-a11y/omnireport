import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { QueueService, S3Service, PDFGeneratorService } from '@omnireport/infrastructure';
import { ProcessMediaUseCase } from '@omnireport/use-cases';
import { PrismaReportRepository } from '@omnireport/infrastructure';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const createReportSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  templateId: z.string().optional(),
  audioUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

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

      const { title, description, templateId, audioUrl, imageUrls, tags } = result.data;

      const report = await reportRepo.create({
        title,
        description: description || null,
        status: 'PENDING',
        severity: null,
        organizationId: req.orgId,
        userId: req.userId,
        templateId: templateId || null,
        audioUrl: audioUrl || null,
        audioTranscript: null,
        imageUrls: imageUrls || [],
        findings: null,
        executiveSummary: null,
        recommendedAction: null,
        aiModel: null,
        aiResponseTime: null,
        metadata: null,
        tags: tags || [],
      });

      res.status(201).json(report);
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(500).json({ error: 'Failed to create report' });
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

      const { items, total } = await reportRepo.findMany(req.orgId, { skip, take, status });

      res.json({ items, total, skip, take });
    } catch (error) {
      console.error('Error listing reports:', error);
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

      res.json({
        ...report,
        imageUrls: signedImageUrls,
        audioUrl: signedAudioUrl,
      });
    } catch (error) {
      console.error('Error getting report:', error);
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
      console.error('Error generating upload URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });

  router.post('/:id/upload', upload.array('files', 10), async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const report = await reportRepo.findById(req.params.id as string);
      if (!report || report.organizationId !== req.orgId) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const files = req.files as Express.Multer.File[];
      console.log('[UPLOAD] Received', files?.length || 0, 'files, orgId:', req.orgId, 'reportId:', report.id);
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      const imageUrls: string[] = report.imageUrls ? [...report.imageUrls] : [];
      let audioUrl: string | null = report.audioUrl;

      const s3 = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
      const bucket = process.env.AWS_S3_BUCKET || '';

      for (const file of files) {
        const isImage = file.mimetype.startsWith('image/');
        const isAudio = file.mimetype.startsWith('audio/');
        const type = isImage ? 'image' : isAudio ? 'audio' : 'image';
        const extension = file.originalname.split('.').pop() || 'bin';

        const key = s3Service.generateFileKey(
          req.orgId,
          report.id,
          type,
          type === 'image' ? imageUrls.length : 0,
          extension
        );

        console.log('[UPLOAD] Uploading to S3:', key, 'type:', file.mimetype, 'size:', file.size);

        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));

        const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

        if (isImage) {
          imageUrls.push(s3Url);
        } else if (isAudio) {
          audioUrl = s3Url;
        }
      }

      await reportRepo.update(report.id, { imageUrls, audioUrl });

      res.json({ imageUrls, audioUrl });
    } catch (error: any) {
      console.error('Error uploading files:', error);
      res.status(500).json({ error: 'Failed to upload files', detail: error?.message, stack: error?.stack });
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

      const updateData: Partial<any> = {};
      if (req.body.imageUrls !== undefined) updateData.imageUrls = req.body.imageUrls;
      if (req.body.audioUrl !== undefined) updateData.audioUrl = req.body.audioUrl;
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;

      await reportRepo.update(req.params.id, updateData);
      res.json({ message: 'Report updated' });
    } catch (error) {
      console.error('Error updating report:', error);
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
      console.error('Error generating report:', error);
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

      const pdfBuffer = await pdfService.generateReport(report);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
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
      console.error('Error deleting report:', error);
      res.status(500).json({ error: 'Failed to delete report' });
    }
  });

  return router;
}