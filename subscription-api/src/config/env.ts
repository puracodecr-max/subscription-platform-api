import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_SCHEMA: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).default('adm'),
  DB_SSL: booleanString.default('false'),
  DB_SSL_REJECT_UNAUTHORIZED: booleanString.default('true'),
  VERIFY_DB_ON_START: booleanString.default('false'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('8h'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  SWAGGER_SERVER_URL: z.string().url().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration: ${details.join('; ')}`);
}

export const env = {
  ...parsed.data,
  CORS_ALLOWED_ORIGINS: parsed.data.CORS_ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
};
