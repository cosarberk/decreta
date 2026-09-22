import type { FastifyInstance } from 'fastify';
import { personsService } from './persons.service.js';
import { createPersonSchema, searchPersonsSchema } from './persons.schema.js';

/**
 * Kişi rotaları — kayıt formundaki şahit/karar veren seçimini besler
 * (yazarken öneri/autocomplete).
 */
export async function personsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/persons', { preHandler: app.authenticate }, async (request) => {
    const { q, limit } = searchPersonsSchema.parse(request.query);
    return personsService.search(q, limit);
  });

  app.post('/persons', { preHandler: app.authenticate }, async (request, reply) => {
    const { fullName } = createPersonSchema.parse(request.body);
    const person = await personsService.create(fullName);
    return reply.code(201).send(person);
  });
}
