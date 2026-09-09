import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  MEILISEARCH_HOST: z.string().optional().default(''),
  MEILISEARCH_API_KEY: z.string().optional().default(''),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  WHATSAPP_NUMBER: z.string().default(''),
  SENTRY_DSN_API: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(process.env.PORT ? Number(process.env.PORT) : 3001),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  N8N_WEBHOOK_URL: z.string().optional().default(''),
  N8N_WEBHOOK_SECRET: z.string().optional().default(''),
  N8N_BASIC_AUTH_USER: z.string().optional().default('admin'),
  N8N_BASIC_AUTH_PASSWORD: z.string().optional().default('admin'),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env;

export function getEnv(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  _env = parsed.data;
  return _env;
}
