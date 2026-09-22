import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { accountService } from './account.service.js';

const bulkSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'En az bir kullanıcı seçin'),
});

/** Admin toplu e-posta işlemleri: hesap bilgisi ve parola sıfırlama gönderimi. */
export async function accountRoutes(app: FastifyInstance): Promise<void> {
  app.post('/users/send-info', { preHandler: app.requireAdmin }, async (request) => {
    const { userIds } = bulkSchema.parse(request.body);
    return accountService.sendInfo(userIds);
  });

  app.post('/users/send-reset', { preHandler: app.requireAdmin }, async (request) => {
    const { userIds } = bulkSchema.parse(request.body);
    return accountService.sendReset(userIds);
  });
}
