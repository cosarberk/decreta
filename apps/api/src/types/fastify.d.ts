import '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';

/** JWT içinde taşınan ve doğrulama sonrası `request.user` olan kimlik. */
export interface AuthUser {
  sub: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Geçerli JWT gerektirir; yoksa 401 döner. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Geçerli JWT + admin rolü gerektirir; aksi halde 401/403 döner. */
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
