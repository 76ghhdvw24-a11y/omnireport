import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';

export type JobData = Record<string, unknown>;
export type JobResult = Record<string, unknown> | void;

export interface QueueServiceConfig {
  redisUrl: string;
  queueName: string;
}

function parseRedisUrl(redisUrl: string): { host: string; port: number; username?: string; password?: string; db?: number } {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    ...(url.username ? { username: url.username } : {}),
    ...(url.password ? { password: url.password } : {}),
    ...(url.pathname && url.pathname !== '/' ? { db: parseInt(url.pathname.slice(1)) } : {}),
  };
}

export class QueueService {
  private queue: Queue<JobData, JobResult>;
  private worker: Worker<JobData, JobResult> | null = null;
  private config: QueueServiceConfig;

  constructor(config: QueueServiceConfig) {
    this.config = config;
    const parsed = parseRedisUrl(config.redisUrl);

    const queueOptions: QueueOptions = {
      connection: {
        ...parsed,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      } as any,
      defaultJobOptions: {
        attempts: 1,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 1000,
          age: 3600,
        },
        removeOnFail: {
          count: 5000,
        },
      },
    };

    this.queue = new Queue<JobData, JobResult>(config.queueName, queueOptions);
  }

  async addJob(name: string, data: JobData, options?: { delay?: number; priority?: number }): Promise<Job<JobData, JobResult>> {
    return this.queue.add(name, data, {
      delay: options?.delay,
      priority: options?.priority,
    });
  }

  getQueue(): Queue<JobData, JobResult> {
    return this.queue;
  }

  async startWorker(handler: (job: Job<JobData, JobResult>) => Promise<JobResult>): Promise<void> {
    const parsed = parseRedisUrl(this.config.redisUrl);

    const workerOptions: WorkerOptions = {
      connection: {
        ...parsed,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      } as any,
      concurrency: 5,
    };

    this.worker = new Worker<JobData, JobResult>(
      this.queue.name,
      handler,
      workerOptions
    );

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message);
    });
  }

  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  async close(): Promise<void> {
    await this.stopWorker();
    await this.queue.close();
  }
}
