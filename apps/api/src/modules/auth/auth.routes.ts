import type { FastifyInstance } from 'fastify';
import { authService } from './auth.service.js';
import {
  changePasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './auth.schema.js';

/** Kimlik doğrulama rotaları: giriş ve oturum profili. */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', async (request) => {
    const { email, password } = loginSchema.parse(request.body);
    const identity = await authService.validateCredentials(email, password);
    const token = app.jwt.sign(identity);
    return {
      token,
      user: {
        id: identity.sub,
        email: identity.email,
        fullName: identity.fullName,
        role: identity.role,
      },
    };
  });

  app.get('/auth/me', { preHandler: app.authenticate }, async (request) => {
    return authService.currentUser(request.user.sub);
  });

  app.patch('/auth/me', { preHandler: app.authenticate }, async (request) => {
    const { fullName } = updateProfileSchema.parse(request.body);
    return authService.updateProfile(request.user.sub, fullName);
  });

  app.post('/auth/me/password', { preHandler: app.authenticate }, async (request, reply) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
    await authService.changePassword(request.user.sub, currentPassword, newPassword);
    return reply.code(204).send();
  });

  // Public: e-postayla gelen token ile parola belirleme (giriş gerektirmez).
  app.post('/auth/reset', async (request, reply) => {
    const { token, newPassword } = resetPasswordSchema.parse(request.body);
    await authService.resetPassword(token, newPassword);
    return reply.code(204).send();
  });
}
