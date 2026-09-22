import type { FastifyInstance } from 'fastify';
import { usersService } from './users.service.js';
import { activityService } from '../activity/index.js';
import { z } from 'zod';
import {
  createUserSchema,
  setActiveSchema,
  setRoleSchema,
  userIdParamsSchema,
} from './users.schema.js';

const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, 'İsim soyisim zorunlu'),
  email: z.string().email('Geçerli bir e-posta girin'),
});
const setPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Parola en az 6 karakter olmalı'),
});

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
    void activityService.log({
      action: 'user_created',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: user.full_name,
      targetText: user.email,
    });
    return reply.code(201).send(user);
  });

  app.patch('/users/:id', { preHandler: app.requireAdmin }, async (request) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const { fullName, email } = updateUserSchema.parse(request.body);
    const user = await usersService.adminUpdate(id, fullName, email);
    void activityService.log({
      action: 'user_updated',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: user.full_name,
    });
    return user;
  });

  app.post('/users/:id/password', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const { newPassword } = setPasswordSchema.parse(request.body);
    await usersService.adminSetPassword(id, newPassword);
    void activityService.log({
      action: 'user_updated',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetText: 'parola belirlendi',
    });
    return reply.code(204).send();
  });

  app.delete('/users/:id', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const user = await usersService.remove(id);
    void activityService.log({
      action: 'user_deleted',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: user.full_name,
    });
    return reply.code(204).send();
  });

  app.patch('/users/:id/active', { preHandler: app.requireAdmin }, async (request) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const { isActive } = setActiveSchema.parse(request.body);
    const user = await usersService.setActive(id, isActive);
    void activityService.log({
      action: isActive ? 'user_activated' : 'user_deactivated',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: user.full_name,
    });
    return user;
  });

  app.patch('/users/:id/role', { preHandler: app.requireAdmin }, async (request) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const { role } = setRoleSchema.parse(request.body);
    const user = await usersService.setRole(id, role);
    void activityService.log({
      action: 'user_role_changed',
      actorId: request.user.sub,
      actorName: request.user.fullName,
      targetRef: user.full_name,
      targetText: role,
    });
    return user;
  });
}
