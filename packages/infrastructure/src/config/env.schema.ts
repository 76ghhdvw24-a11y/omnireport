import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),

  REDIS_URL: z.string().url('Invalid REDIS_URL'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  NVIDIA_API_KEY: z.string().min(1, 'NVIDIA_API_KEY is required'),

  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_S3_BUCKET: z.string().min(1, 'AWS_S3_BUCKET is required'),
  AWS_REGION: z.string().default('us-east-2'),

  CORS_ORIGINS: z.string().optional(),
});

export type EnvSchema = z.infer<typeof envSchema>;

export function validateEnv(): EnvSchema {
  return envSchema.parse(process.env);
}

export function safeValidateEnv(): { success: true; data: EnvSchema } | { success: false; error: z.ZodError } {
  const result = envSchema.safeParse(process.env);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
