import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// apps/api y apps/worker no cargan dotenv por su cuenta; sin esto, `pnpm dev`
// falla siempre fuera de Docker Compose (que sí inyecta env vars) a menos que
// el shell ya las tenga exportadas. No pisa variables que la plataforma de
// hosting ya haya inyectado (dotenv nunca sobreescribe process.env existente).
const rootEnvPath = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnvPath)) loadDotenv({ path: rootEnvPath });

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.preprocess((value) => (value === '' ? undefined : value), z.string().min(1).optional()),
  // The production queues use PostgreSQL row locking. Redis remains an
  // optional compatibility setting for legacy local integrations only.
  REDIS_URL: optionalUrl,
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DEV_AUTH_BYPASS: z.preprocess((value) => value === 'true', z.boolean()).default(false),
  // Segundo interruptor requerido ademas de DEV_AUTH_BYPASS para permitir el
  // bypass con NODE_ENV=production. Exigir ambos evita que alguien active
  // DEV_AUTH_BYPASS en prod por error sin darse cuenta de que deja la
  // plataforma sin login para cualquiera con el link.
  ALLOW_DEV_BYPASS_IN_PRODUCTION: z.preprocess((value) => value === 'true', z.boolean()).default(false),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  FX_PROVIDER: z.string().min(1),
  REGULATORY_POLL_CRON: z.string().min(1),
  JURISPRUDENCE_POLL_CRON: z.string().min(1).default('0 12 * * 5'),
  LOG_LEVEL: z.string().default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
});

export const env = schema.parse(process.env);
