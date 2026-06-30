import { z } from 'zod';

/**
 * Strongly-typed, validated configuration. Fails fast at boot if the
 * environment is misconfigured rather than erroring deep in a request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  API_GLOBAL_PREFIX: z.string().default('api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // base64-encoded 32-byte key
  ENCRYPTION_KEY: z.string().min(32),

  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  META_VERIFY_TOKEN: z.string().default('autonode-verify-token'),
  META_GRAPH_VERSION: z.string().default('v21.0'),
  META_OAUTH_REDIRECT_URI: z.string().optional().default(''),

  // Instagram API with Instagram Login (distinct from the Facebook app creds).
  // Found under the Meta App → Instagram product → API setup with Instagram login.
  INSTAGRAM_APP_ID: z.string().optional().default(''),
  INSTAGRAM_APP_SECRET: z.string().optional().default(''),

  AI_PROVIDER: z.enum(['openai', 'anthropic']).default('anthropic'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-8'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional().default(''),
  STRIPE_PRICE_ENTERPRISE_MONTHLY: z.string().optional().default(''),
  APP_URL: z.string().default('http://localhost:3000'),
});

export type AppConfig = z.infer<typeof envSchema>;

/**
 * Used as ConfigModule's `validate`. NestJS passes the merged config
 * (env-file vars + process.env) as the argument — validate THAT, not
 * process.env, because env-file-only vars aren't on process.env yet here.
 */
export function loadConfiguration(config: Record<string, unknown>): AppConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
