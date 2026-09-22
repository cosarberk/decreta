import type { FastifyInstance } from 'fastify';
import { authService } from './auth.service.js';
import { loginSchema } from './auth.schema.js';

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
}
