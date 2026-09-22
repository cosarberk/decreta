import type { FastifyInstance } from 'fastify';
import { usersService } from './users.service.js';
import {
  createUserSchema,
  setActiveSchema,
  setRoleSchema,
  userIdParamsSchema,
} from './users.schema.js';

/**
 * Kullanıcı yönetimi rotaları — tamamı yönetici yetkisi ister.
 * Admin panelinin kullanıcı sekmesini besler.
 */
export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/users', { preHandler: app.requireAdmin }, async () => {
    return usersService.list();
  });

  app.post('/users', { preHandler: app.requireAdmin }, async (request, reply) => {
    const input = createUserSchema.parse(request.body);
    const user = await usersService.create(input);
    return reply.code(201).send(user);
  });

  app.patch('/users/:id/active', { preHandler: app.requireAdmin }, async (request) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const { isActive } = setActiveSchema.parse(request.body);
    return usersService.setActive(id, isActive);
  });

  app.patch('/users/:id/role', { preHandler: app.requireAdmin }, async (request) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const { role } = setRoleSchema.parse(request.body);
    return usersService.setRole(id, role);
  });
}
