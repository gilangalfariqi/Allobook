import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { getEnv } from './config/env';
import { logger } from './lib/logger';
import { AppError } from './lib/errors';
import { initSentry, Sentry } from './lib/sentry';

import prismaPlugin from './plugins/prisma.plugin';
import redisPlugin from './plugins/redis.plugin';
import meilisearchPlugin from './plugins/meilisearch.plugin';
import jwtPlugin from './plugins/jwt.plugin';
import multipart from '@fastify/multipart';

import { authRoutes } from './modules/auth/auth.routes';
import { bookRoutes } from './modules/book/book.routes';
import { reviewRoutes } from './modules/review/review.routes';
import { orderRoutes } from './modules/order/order.routes';
import { wishlistRoutes } from './modules/wishlist/wishlist.routes';
import { uploadRoutes } from './modules/upload/upload.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { searchRoutes } from './modules/search/search.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { chatbotRoutes, faqAdminRoutes } from './modules/chatbot/chatbot.routes';

export async function buildServer() {
  const env = getEnv();
  initSentry();

  const server = Fastify({
    logger: false, // Using pino directly via logger.ts
  });

  // ─── Security ───────────────────────────────────────────────────────────────
  await server.register(cors, {
    origin: env.NODE_ENV === 'production' ? env.NEXT_PUBLIC_APP_URL ?? false : true,
    credentials: true,
  });
  await server.register(helmet);

  // ─── Multipart ──────────────────────────────────────────────────────────────
  await server.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
  });

  // ─── Rate Limiting ──────────────────────────────────────────────────────────
  await server.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
  });

  // ─── OpenAPI / Swagger ──────────────────────────────────────────────────────
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'AlloBook API',
        description: 'AlloBook - Semi e-commerce platform for books',
        version: '1.0.0',
      },
      tags: [
        { name: 'auth', description: 'Authentication' },
        { name: 'books', description: 'Book catalog' },
        { name: 'reviews', description: 'Book reviews' },
        { name: 'orders', description: 'Pre-orders (WhatsApp concierge)' },
        { name: 'wishlist', description: 'User wishlist' },
        { name: 'search', description: 'Search & auto-suggest' },
        { name: 'upload', description: 'File upload (Cloudflare R2)' },
        { name: 'admin', description: 'Admin endpoints' },
      ],
    },
  });
  await server.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // ─── Plugins ─────────────────────────────────────────────────────────────────
  await server.register(prismaPlugin);
  await server.register(redisPlugin);
  await server.register(meilisearchPlugin);
  await server.register(jwtPlugin);

  // ─── Routes ──────────────────────────────────────────────────────────────────
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(bookRoutes, { prefix: '/books' });
  await server.register(reviewRoutes);
  await server.register(orderRoutes, { prefix: '/orders' });
  await server.register(wishlistRoutes, { prefix: '/wishlist' });
  await server.register(uploadRoutes, { prefix: '/uploads' });
  await server.register(adminRoutes, { prefix: '/admin' });
  await server.register(searchRoutes, { prefix: '/search' });
  await server.register(aiRoutes);
  await server.register(chatbotRoutes, { prefix: '/chatbot' });
  await server.register(faqAdminRoutes, { prefix: '/admin/faq' });
  server.setErrorHandler((error, request, reply) => {
    logger.error({ err: error, url: request.url }, 'Request error');

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code ?? 'ERROR',
        message: error.message,
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.validation,
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: 'TOO_MANY_REQUESTS',
        message: error.message,
      });
    }

    Sentry.captureException(error);
    return reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  });

  // ─── Health Check ────────────────────────────────────────────────────────────
  server.get('/', async () => ({
    status: 'ok',
    name: 'AlloBook API',
    timestamp: new Date().toISOString(),
  }));

  server.get('/health', { schema: { tags: ['health'] } }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  return server;
}

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  const env = getEnv();
  try {
    const server = await buildServer();
    await server.listen({ port: env.API_PORT, host: '0.0.0.0' });
    logger.info(`🚀 AlloBook API running on http://localhost:${env.API_PORT}`);
    logger.info(`📚 Swagger docs at http://localhost:${env.API_PORT}/docs`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
