import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { accountService, type BulkMailResult, type SendProgress } from './account.service.js';

const bulkSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'En az bir kullanıcı seçin'),
});

/** İlerlemeyi satır satır (NDJSON) akıtan ortak gönderim akışı. */
async function streamSend(
  reply: FastifyReply,
  userIds: string[],
  run: (ids: string[], onProgress: (p: SendProgress) => void) => Promise<BulkMailResult>,
): Promise<void> {
  reply.hijack();
  const raw = reply.raw;
  raw.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
  });
  const write = (obj: unknown): void => {
    raw.write(`${JSON.stringify(obj)}\n`);
  };
  try {
    const result = await run(userIds, (p) => write({ type: 'progress', ...p }));
    write({ type: 'done', ...result });
  } catch (error) {
    write({ type: 'error', message: (error as Error).message });
  } finally {
    raw.end();
  }
}

/** Admin toplu e-posta işlemleri: hesap bilgisi ve parola sıfırlama gönderimi. */
export async function accountRoutes(app: FastifyInstance): Promise<void> {
  app.post('/users/send-info', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { userIds } = bulkSchema.parse(request.body);
    await streamSend(reply, userIds, (ids, onP) => accountService.sendInfo(ids, onP));
  });

  app.post('/users/send-reset', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { userIds } = bulkSchema.parse(request.body);
    await streamSend(reply, userIds, (ids, onP) => accountService.sendReset(ids, onP));
  });
}
