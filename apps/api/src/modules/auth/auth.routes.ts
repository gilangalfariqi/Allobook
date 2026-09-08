import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from './auth.schema';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function authRoutes(server: FastifyInstance) {
  const service = new AuthService(server);
  const controller = new AuthController(service);

  // ─── Rate limit config for auth endpoints ────────────────────────────────────
  const authRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
      },
    },
  };

  const userResponseSchema = {
    type: 'object',
    additionalProperties: true,
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string' },
      createdAt: { type: 'string' },
    },
  };

  // POST /auth/register
  server.post(
    '/register',
    {
      ...authRateLimit,
      schema: {
        tags: ['auth'],
        summary: 'Register a new user',
        body: zodToJsonSchema(RegisterSchema),
        response: {
          201: {
            type: 'object',
            properties: {
              user: userResponseSchema,
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
    },
    controller.register.bind(controller)
  );

  // POST /auth/login
  server.post(
    '/login',
    {
      ...authRateLimit,
      schema: {
        tags: ['auth'],
        summary: 'Login with email and password',
        body: zodToJsonSchema(LoginSchema),
        response: {
          200: {
            type: 'object',
            properties: {
              user: userResponseSchema,
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
    },
    controller.login.bind(controller)
  );

  // POST /auth/refresh
  server.post(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Refresh access token',
        body: zodToJsonSchema(RefreshTokenSchema),
      },
    },
    controller.refresh.bind(controller)
  );

  // POST /auth/logout
  server.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Logout (client must discard tokens)',
      },
    },
    controller.logout.bind(controller)
  );

  // GET /auth/me — requires auth
  server.get(
    '/me',
    {
      preHandler: [server.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
      },
    },
    controller.me.bind(controller)
  );
}
