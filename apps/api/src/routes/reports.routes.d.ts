import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { QueueService, S3Service } from '@omnireport/infrastructure';
import { ProcessMediaUseCase } from '@omnireport/use-cases';
export declare function createReportsRoutes(prisma: PrismaClient, processMediaUseCase: ProcessMediaUseCase, queueService: QueueService, s3Service: S3Service): Router;
//# sourceMappingURL=reports.routes.d.ts.map