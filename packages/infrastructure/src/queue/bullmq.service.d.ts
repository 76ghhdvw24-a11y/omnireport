import { Queue, Job } from 'bullmq';
export type JobData = Record<string, unknown>;
export type JobResult = Record<string, unknown> | void;
export interface QueueServiceConfig {
    redisUrl: string;
    queueName: string;
}
export declare class QueueService {
    private queue;
    private worker;
    private connection;
    constructor(config: QueueServiceConfig);
    addJob(name: string, data: JobData, options?: {
        delay?: number;
        priority?: number;
    }): Promise<Job<JobData, JobResult>>;
    getQueue(): Queue<JobData, JobResult>;
    startWorker(handler: (job: Job<JobData, JobResult>) => Promise<JobResult>): Promise<void>;
    stopWorker(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=bullmq.service.d.ts.map