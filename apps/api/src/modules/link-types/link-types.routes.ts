import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { linkTypesService } from './link-types.service.js';
import { activityService } from '../activity/index.js';

const createLinkTypeSchema = z.object({
  forwardName: z.string().trim().min(1, 'İleri yön adı zorunlu').max(40),
  inverseName: z.string().trim().min(1, 'Ters yön adı zorunlu').max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Renk #rrggbb biçiminde olmalı')
    .optional(),
  isSupersede: z.boolean().default(false),
});

const idParamsSchema = z.object({ id: z.string().uuid('Geçersiz link tipi kimliği') });

/** Link tipi rotaları — dinamik bağlantı tiplerinin yönetimi. */
export async function linkTypesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/link-types', { preHandler: app.authenticate }, async () => {
    return linkTypesService.list();
  });

  app.post('/link-types', { preHandler: app.requireAdmin }, async (request, reply) => {
    const input = createLinkTypeSchema.parse(request.body);
    const type = await linkTypesService.create(input);
    void activityService.log({
      action: 'link_type_created',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: type.forward_name,
    });
    return reply.code(201).send(type);
  });

  app.patch('/link-types/:id', { preHandler: app.requireAdmin }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = createLinkTypeSchema.parse(request.body);
    const type = await linkTypesService.update(id, input);
    void activityService.log({
      action: 'link_type_updated',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: type.forward_name,
    });
    return type;
  });

  app.delete('/link-types/:id', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const name = await linkTypesService.remove(id);
    void activityService.log({
      action: 'link_type_deleted',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: name,
    });
    return reply.code(204).send();
  });
}
