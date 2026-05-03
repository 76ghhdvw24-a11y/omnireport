"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
class QueueService {
    queue;
    worker = null;
    connection;
    constructor(config) {
        this.connection = new ioredis_1.Redis(config.redisUrl);
        const queueOptions = {
            connection: this.connection,
            defaultJobOptions: {
                attempts: 3,
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
        this.queue = new bullmq_1.Queue(config.queueName, queueOptions);
    }
    async addJob(name, data, options) {
        return this.queue.add(name, data, {
            delay: options?.delay,
            priority: options?.priority,
        });
    }
    getQueue() {
        return this.queue;
    }
    async startWorker(handler) {
        const workerOptions = {
            connection: this.connection,
            concurrency: 5,
        };
        this.worker = new bullmq_1.Worker(this.queue.name, handler, workerOptions);
        this.worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed`);
        });
        this.worker.on('failed', (job, err) => {
            console.error(`Job ${job?.id} failed:`, err.message);
        });
    }
    async stopWorker() {
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
        }
    }
    async close() {
        await this.stopWorker();
        await this.queue.close();
        await this.connection.quit();
    }
}
exports.QueueService = QueueService;
//# sourceMappingURL=bullmq.service.js.map