import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../config/index.js';
import { AppError } from '../lib/index.js';

/**
 * JWT eklentisi. `authenticate` ve `requireAdmin` preHandler'larını
 * uygulamaya kaydeder. Rota dosyaları bunları `preHandler` olarak kullanır.
 */
async function authPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: '12h' },
  });

  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw AppError.unauthorized('Oturum geçersiz veya süresi dolmuş');
    }
  });

  app.decorate('requireAdmin', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw AppError.unauthorized('Oturum geçersiz veya süresi dolmuş');
    }
    if (request.user.role !== 'admin') {
      throw AppError.forbidden('Bu işlem yalnızca yöneticilere açık');
    }
  });
}

export default fp(authPlugin, { name: 'auth' });
