import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { config } from './config/index.js';
import { AppError } from './lib/index.js';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './modules/auth/index.js';
import { usersRoutes } from './modules/users/index.js';
import { accountRoutes } from './modules/account/index.js';
import { personsRoutes } from './modules/persons/index.js';
import { labelsRoutes } from './modules/labels/index.js';
import { modulesRoutes } from './modules/modules/index.js';
import { linkTypesRoutes } from './modules/link-types/index.js';
import { emailTemplatesRoutes } from './modules/email-templates/index.js';
import { activityRoutes } from './modules/activity/index.js';
import { reportsRoutes } from './modules/reports/index.js';
import { recordsRoutes } from './modules/records/index.js';

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * Fastify örneğini kurar: eklentiler, global hata yakalayıcı, `/api` altındaki
 * rotalar ve üretimde derlenmiş web arayüzünün statik servisi.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.isProduction ? 'info' : 'debug',
      transport: config.isProduction
        ? undefined
        : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    },
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(authPlugin);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Girdi doğrulaması başarısız',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.code, message: error.message });
    }
    request.log.error(error);
    return reply.code(500).send({ error: 'INTERNAL', message: 'Beklenmeyen bir hata oluştu' });
  });

  await app.register(
    async (api) => {
      api.get('/health', async () => ({ status: 'ok' }));
      await api.register(authRoutes);
      await api.register(usersRoutes);
      await api.register(accountRoutes);
      await api.register(personsRoutes);
      await api.register(labelsRoutes);
      await api.register(modulesRoutes);
      await api.register(linkTypesRoutes);
      await api.register(emailTemplatesRoutes);
      await api.register(activityRoutes);
      await api.register(reportsRoutes);
      await api.register(recordsRoutes);
    },
    { prefix: '/api' },
  );

  if (config.isProduction) {
    await registerStaticWeb(app);
  }

  return app;
}

/**
 * Üretimde derlenmiş React uygulamasını servis eder ve API dışı tüm yolları
 * SPA girişine (index.html) yönlendirir.
 */
async function registerStaticWeb(app: FastifyInstance): Promise<void> {
  const publicDir = join(currentDir, '../public');
  await app.register(fastifyStatic, { root: publicDir, prefix: '/' });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api')) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Uç nokta bulunamadı' });
    }
    return reply.sendFile('index.html');
  });
}
