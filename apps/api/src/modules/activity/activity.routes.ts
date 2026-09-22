import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { activityService } from './activity.service.js';

const searchSchema = z.object({
  q: z.string().default(''),
  action: z.string().optional().nullable(),
  dateFrom: z.string().datetime().optional().nullable(),
  dateTo: z.string().datetime().optional().nullable(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});

/** Aktivite/log rotaları — tüm oturum açmış kullanıcılar görebilir. */
export async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/activity', { preHandler: app.authenticate }, async (request) => {
    const input = searchSchema.parse(request.query);
    const { items, total } = await activityService.search({
      q: input.q,
      action: input.action ?? null,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
    });
    return {
      items,
      total,
      page: input.page,
      pageSize: input.pageSize,
      pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    };
  });

  app.get('/activity/actions', { preHandler: app.authenticate }, async () => {
    return activityService.distinctActions();
  });

  app.get('/activity/export', { preHandler: app.authenticate }, async (request, reply) => {
    const input = searchSchema.parse(request.query);
    const csv = await activityService.exportCsv({
      q: input.q,
      action: input.action ?? null,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="decreta-log-${stamp}.csv"`)
      .send(csv);
  });
}
