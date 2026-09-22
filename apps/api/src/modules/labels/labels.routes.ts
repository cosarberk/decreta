import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { labelsService } from './labels.service.js';
import { activityService } from '../activity/index.js';
import { createLabelSchema } from './labels.schema.js';

const idParams = z.object({ id: z.string().uuid('Geçersiz etiket kimliği') });
const updateLabelSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Renk #rrggbb biçiminde olmalı')
    .optional()
    .nullable(),
});

/** Etiket rotaları — filtre paneli ve kayıt formundaki etiket seçimi. */
export async function labelsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/labels', { preHandler: app.authenticate }, async () => {
    return labelsService.list();
  });

  app.post('/labels', { preHandler: app.authenticate }, async (request, reply) => {
    const { name, color } = createLabelSchema.parse(request.body);
    const label = await labelsService.create(name, color);
    void activityService.log({
      action: 'label_created',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: label.name,
    });
    return reply.code(201).send(label);
  });

  app.patch('/labels/:id', { preHandler: app.requireAdmin }, async (request) => {
    const { id } = idParams.parse(request.params);
    const { name, color } = updateLabelSchema.parse(request.body);
    const label = await labelsService.update(id, name, color);
    void activityService.log({
      action: 'label_updated',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: label.name,
    });
    return label;
  });

  app.delete('/labels/:id', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const name = await labelsService.remove(id);
    void activityService.log({
      action: 'label_deleted',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: name,
    });
    return reply.code(204).send();
  });
}
