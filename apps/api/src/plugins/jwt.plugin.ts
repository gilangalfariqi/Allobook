import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { getEnv } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    authenticateAdmin: (request: FastifyRequest) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: string };
    user: { sub: string; email: string; role: string };
  }
}

const jwtPlugin: FastifyPluginAsync = fp(async (server) => {
  const env = getEnv();

  await server.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES },
  });

  server.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  });

  server.decorate('authenticateAdmin', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }
  });
});

export default jwtPlugin;
