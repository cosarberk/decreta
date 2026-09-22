import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { modulesService } from './modules.service.js';
import { activityService } from '../activity/index.js';

const createModuleSchema = z.object({
  name: z.string().trim().min(1, 'Modül adı zorunlu').max(80, 'Modül adı çok uzun'),
  description: z.string().trim().max(300).optional().nullable(),
});
const idParams = z.object({ id: z.string().uuid('Geçersiz modül kimliği') });
const mergeSchema = z.object({ intoId: z.string().uuid('Geçersiz hedef modül') });

/** Modül rotaları — kayıt formundaki "etkilenen modül" combo'sunu besler. */
export async function modulesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/modules', { preHandler: app.authenticate }, async () => {
    return modulesService.list();
  });

  app.post('/modules', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { name, description } = createModuleSchema.parse(request.body);
    const module = await modulesService.create(name, description);
    void activityService.log({
      action: 'module_created',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: module.name,
    });
    return reply.code(201).send(module);
  });

  app.patch('/modules/:id', { preHandler: app.requireAdmin }, async (request) => {
    const { id } = idParams.parse(request.params);
    const { name, description } = createModuleSchema.parse(request.body);
    const module = await modulesService.update(id, name, description);
    void activityService.log({
      action: 'module_updated',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: module.name,
    });
    return module;
  });

  app.post('/modules/:id/merge', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const { intoId } = mergeSchema.parse(request.body);
    const res = await modulesService.merge(id, intoId);
    void activityService.log({
      action: 'module_deleted',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: res.name,
      targetText: `→ ${res.into} (birleştirildi)`,
    });
    return reply.code(204).send();
  });

  app.delete('/modules/:id', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const name = await modulesService.remove(id);
    void activityService.log({
      action: 'module_deleted',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: name,
    });
    return reply.code(204).send();
  });
}
