import type { FastifyInstance } from 'fastify';
import { recordsService } from './records.service.js';
import {
  addLinkSchema,
  createRecordSchema,
  linkParamsSchema,
  recordIdParamsSchema,
  searchRecordsSchema,
} from './records.schema.js';

/** Kayıt rotaları: gelişmiş arama, görüntüleme, append-only oluşturma ve bağlantılar. */
export async function recordsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/records', { preHandler: app.authenticate }, async (request) => {
    const input = searchRecordsSchema.parse(request.query);
    const { items, total } = await recordsService.search({
      q: input.q,
      affects: input.affects,
      labelIds: input.labels,
      moduleIds: input.modules,
      personId: input.personId ?? null,
      createdBy: input.createdBy ?? null,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
      status: input.status,
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

  app.get('/records/:id', { preHandler: app.authenticate }, async (request) => {
    const { id } = recordIdParamsSchema.parse(request.params);
    return recordsService.getById(id);
  });

  app.post('/records', { preHandler: app.authenticate }, async (request, reply) => {
    const body = createRecordSchema.parse(request.body);
    const record = await recordsService.create(body, request.user.sub);
    return reply.code(201).send(record);
  });

  app.post('/records/:id/links', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = recordIdParamsSchema.parse(request.params);
    const link = addLinkSchema.parse(request.body);
    const record = await recordsService.addLink(id, link, request.user.sub);
    return reply.code(201).send(record);
  });

  app.delete('/records/:id/links/:linkId', { preHandler: app.authenticate }, async (request, reply) => {
    const { linkId } = linkParamsSchema.parse(request.params);
    await recordsService.removeLink(linkId);
    return reply.code(204).send();
  });
}
