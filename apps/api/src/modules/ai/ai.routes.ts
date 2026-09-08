import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import {
  enrichBookSchema,
  recommendationsQuerySchema,
  orderNotifyWebhookSchema,
  importSuggestionsSchema,
  chatMessageSchema,
} from './ai.schema';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getEnv } from '../../config/env';
import { UnauthorizedError } from '../../lib/errors';

// Helper to verify shared webhook secret for n8n automation
async function verifyWebhookSecret(request: FastifyRequest) {
  const expectedSecret = getEnv().N8N_WEBHOOK_SECRET;
  const providedSecret = request.headers['x-webhook-secret'] as string | undefined;

  if (!expectedSecret || expectedSecret.trim() === '' || !providedSecret || providedSecret !== expectedSecret) {
    throw new UnauthorizedError('Unauthorized: Invalid or missing X-Webhook-Secret header');
  }
}

// Combined guard for import suggestions: either Admin JWT or valid X-Webhook-Secret
async function verifyAdminOrWebhookSecret(
  this: FastifyInstance,
  request: FastifyRequest
) {
  const expectedSecret = getEnv().N8N_WEBHOOK_SECRET;
  const providedSecret = request.headers['x-webhook-secret'] as string | undefined;

  if (expectedSecret && providedSecret && providedSecret === expectedSecret) {
    return; // Authorized via valid webhook secret
  }

  if (providedSecret && providedSecret !== expectedSecret) {
    throw new UnauthorizedError('Unauthorized: Invalid X-Webhook-Secret header');
  }

  // Explicit ADMIN authentication
  await this.authenticateAdmin(request);
}

export async function aiRoutes(server: FastifyInstance) {
  const service = new AiService(server);
  const controller = new AiController(service);

  // 1. GET /books/:slug/recommendations (Rate-limited: 30 req/min)
  server.get(
    '/books/:slug/recommendations',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['ai', 'books'],
        summary: 'Get semantic book recommendations (pgvector cosine similarity)',
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 6 },
            minSimilarity: { type: 'number', default: 0.2 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    slug: { type: 'string' },
                    title: { type: 'string' },
                    author: { type: 'string' },
                    price: { type: 'number' },
                    stock: { type: 'number' },
                    isPreOrder: { type: 'boolean' },
                    coverUrl: { type: ['string', 'null'] },
                    similarity: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    controller.getRecommendations.bind(controller)
  );

  // 2. GET /books/:slug/review-summary (Rate-limited: 30 req/min)
  server.get(
    '/books/:slug/review-summary',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['ai', 'books'],
        summary: 'Get AI synthesized review summary (Claude Haiku 4.5)',
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              cachedAt: { type: ['string', 'null'] },
              reviewCount: { type: 'number' },
              isFresh: { type: 'boolean' },
            },
          },
        },
      },
    },
    controller.getReviewSummary.bind(controller)
  );

  // 3. POST /admin/books/enrich (Admin only - explicit ADMIN guard)
  server.post(
    '/admin/books/enrich',
    {
      preValidation: [server.authenticateAdmin],
      schema: {
        tags: ['ai', 'admin'],
        summary: 'Auto-generate book description & tags from draft title and author (Admin only)',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(enrichBookSchema),
      },
    },
    controller.enrichBookDraft.bind(controller)
  );

  // 4. POST /admin/books/:id/enrich (Admin only - explicit ADMIN guard)
  server.post(
    '/admin/books/:id/enrich',
    {
      preValidation: [server.authenticateAdmin],
      schema: {
        tags: ['ai', 'admin'],
        summary: 'Auto-generate description & tags for existing book (Admin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    controller.enrichBookById.bind(controller)
  );

  // 5. POST /webhooks/n8n/order-notify (Secured by X-Webhook-Secret)
  server.post(
    '/webhooks/n8n/order-notify',
    {
      preValidation: [verifyWebhookSecret],
      schema: {
        tags: ['ai', 'webhooks'],
        summary: 'n8n Webhook: Receive order notification triggers',
        body: zodToJsonSchema(orderNotifyWebhookSchema),
      },
    },
    controller.handleOrderNotifyWebhook.bind(controller)
  );

  // 6. POST /admin/books/import-suggestions (Secured by Admin JWT OR X-Webhook-Secret)
  server.post(
    '/admin/books/import-suggestions',
    {
      preValidation: [verifyAdminOrWebhookSecret.bind(server)],
      schema: {
        tags: ['ai', 'admin'],
        summary: 'Receive suggested new release book imports from n8n or admin curation',
        body: zodToJsonSchema(importSuggestionsSchema),
      },
    },
    controller.handleImportSuggestions.bind(controller)
  );

  // 7. POST /ai/chat (AlloBot RAG Chatbot - Rate-limited: 20 req/min)
  server.post(
    '/ai/chat',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['ai'],
        summary: 'AlloBot RAG Chatbot: Conversational assistant for book curation & customer support',
        body: zodToJsonSchema(chatMessageSchema),
        response: {
          200: {
            type: 'object',
            properties: {
              reply: { type: 'string' },
              suggestedBooks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    slug: { type: 'string' },
                    title: { type: 'string' },
                    author: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    coverUrl: { type: ['string', 'null'] },
                    price: { type: 'number' },
                    stock: { type: 'number' },
                    isPreOrder: { type: 'boolean' },
                    similarity: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    controller.handleChat.bind(controller)
  );
}
