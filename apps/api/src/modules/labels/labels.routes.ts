import type { FastifyInstance } from 'fastify';
import { labelsService } from './labels.service.js';
import { createLabelSchema } from './labels.schema.js';

/** Etiket rotaları — filtre paneli ve kayıt formundaki etiket seçimi. */
export async function labelsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/labels', { preHandler: app.authenticate }, async () => {
    return labelsService.list();
  });

  app.post('/labels', { preHandler: app.authenticate }, async (request, reply) => {
    const { name, color } = createLabelSchema.parse(request.body);
    const label = await labelsService.create(name, color);
    return reply.code(201).send(label);
  });
}
