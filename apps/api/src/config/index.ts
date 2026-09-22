import { z } from 'zod';

/**
 * Ortam değişkenlerinin şeması. Uygulama, geçersiz/eksik yapılandırmayla
 * ayağa kalkmak yerine erkenden ve anlaşılır bir hatayla durur.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),

  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),

  JWT_SECRET: z.string().min(8),

  BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(1).optional(),
  BOOTSTRAP_ADMIN_NAME: z.string().min(1).optional(),

  // Uygulamanın dışarıdan erişilen kök adresi (e-posta linkleri bununla kurulur).
  PUBLIC_URL: z.string().default('http://localhost:4000'),

  // SMTP — hepsi opsiyonel. SMTP_HOST boşsa e-posta özelliği sessizce devre dışı.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Decreta <no-reply@decreta.local>'),
  // Self-signed sertifikalı (kendi kendine imzalı) mail sunucuları için 'false'.
  SMTP_TLS_REJECT_UNAUTHORIZED: z
    .preprocess((v) => v !== 'false' && v !== false, z.boolean())
    .default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Geçersiz ortam yapılandırması:\n${issues}`);
}

/** Doğrulanmış, salt-okunur uygulama yapılandırması. */
export const config = Object.freeze({
  env: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  port: parsed.data.API_PORT,
  db: {
    host: parsed.data.POSTGRES_HOST,
    port: parsed.data.POSTGRES_PORT,
    user: parsed.data.POSTGRES_USER,
    password: parsed.data.POSTGRES_PASSWORD,
    database: parsed.data.POSTGRES_DB,
  },
  jwtSecret: parsed.data.JWT_SECRET,
  publicUrl: parsed.data.PUBLIC_URL.replace(/\/+$/, ''),
  mail: {
    enabled: Boolean(parsed.data.SMTP_HOST),
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    secure: parsed.data.SMTP_SECURE,
    user: parsed.data.SMTP_USER,
    pass: parsed.data.SMTP_PASS,
    from: parsed.data.SMTP_FROM,
    rejectUnauthorized: parsed.data.SMTP_TLS_REJECT_UNAUTHORIZED,
  },
  bootstrapAdmin:
    parsed.data.BOOTSTRAP_ADMIN_EMAIL && parsed.data.BOOTSTRAP_ADMIN_PASSWORD
      ? {
          email: parsed.data.BOOTSTRAP_ADMIN_EMAIL,
          password: parsed.data.BOOTSTRAP_ADMIN_PASSWORD,
          fullName: parsed.data.BOOTSTRAP_ADMIN_NAME ?? 'Sistem Yöneticisi',
        }
      : null,
});

export type AppConfig = typeof config;
