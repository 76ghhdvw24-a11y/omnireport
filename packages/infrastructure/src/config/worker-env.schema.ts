import { z } from 'zod';

export const workerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),

  REDIS_URL: z.string().url('Invalid REDIS_URL'),

  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  NVIDIA_API_KEY: z.string().min(1, 'NVIDIA_API_KEY is required'),

  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_S3_BUCKET: z.string().min(1, 'AWS_S3_BUCKET is required'),
  AWS_REGION: z.string().default('us-east-2'),
});

export type WorkerEnvSchema = z.infer<typeof workerEnvSchema>;

export function validateWorkerEnv(): WorkerEnvSchema {
  return workerEnvSchema.parse(process.env);
}
