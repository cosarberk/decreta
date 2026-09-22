import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { modulesService } from './modules.service.js';

const createModuleSchema = z.object({
  name: z.string().trim().min(1, 'Modül adı zorunlu').max(80, 'Modül adı çok uzun'),
});

/** Modül rotaları — kayıt formundaki "etkilenen modül" combo'sunu besler. */
export async function modulesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/modules', { preHandler: app.authenticate }, async () => {
    return modulesService.list();
  });

  app.post('/modules', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { name } = createModuleSchema.parse(request.body);
    const module = await modulesService.create(name);
    return reply.code(201).send(module);
  });
}
