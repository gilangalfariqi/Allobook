import { FastifyInstance } from 'fastify';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { IntentRouterService } from './intent-router.service';
import { RetrievalService } from './retrieval.service';
import { ChatbotRepository } from './chatbot.repository';
import { EmbeddingService } from '../ai/embedding.service';
import { AiRepository } from '../ai/ai.repository';
import {
  chatMessageInputSchema,
  verifyOrderInputSchema,
  faqAdminCreateSchema,
  faqAdminUpdateSchema,
} from './chatbot.schema';

export async function chatbotRoutes(server: FastifyInstance) {
  const repo = new ChatbotRepository(server.prisma, server.redis);
  const aiRepo = new AiRepository(server.prisma);
  const embeddingService = new EmbeddingService(aiRepo);
  const routerService = new IntentRouterService();
  const retrievalService = new RetrievalService(repo, embeddingService);
  const service = new ChatbotService(routerService, retrievalService, repo);
  const controller = new ChatbotController(service, repo, embeddingService);

  // ─── 1. POST /chatbot/message (Rate Limit: 20 req/min) ──────────────────────
  server.post(
    '/message',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['chatbot'],
        summary: 'Send message to AlloBot RAG Chatbot (Supports SSE streaming or JSON)',
        body: zodToJsonSchema(chatMessageInputSchema),
      },
    },
    controller.sendMessage.bind(controller)
  );

  // ─── 2. POST /chatbot/verify-order ─────────────────────────────────────────
  server.post(
    '/verify-order',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['chatbot'],
        summary: 'Verify order ownership by Order ID and WhatsApp phone number',
        body: zodToJsonSchema(verifyOrderInputSchema),
      },
    },
    controller.verifyOrder.bind(controller)
  );

  // ─── 3. GET /chatbot/history/:sessionId ───────────────────────────────────
  server.get(
    '/history/:sessionId',
    {
      schema: {
        tags: ['chatbot'],
        summary: 'Get conversation history for a session (Stored in Redis, max 10 messages)',
        params: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string' },
          },
        },
      },
    },
    controller.getHistory.bind(controller)
  );
}

// ─── Admin FAQ Routes ────────────────────────────────────────────────────────
export async function faqAdminRoutes(server: FastifyInstance) {
  const repo = new ChatbotRepository(server.prisma, server.redis);
  const aiRepo = new AiRepository(server.prisma);
  const embeddingService = new EmbeddingService(aiRepo);
  const routerService = new IntentRouterService();
  const retrievalService = new RetrievalService(repo, embeddingService);
  const service = new ChatbotService(routerService, retrievalService, repo);
  const controller = new ChatbotController(service, repo, embeddingService);

  // GET /admin/faq (Public or Admin view)
  server.get(
    '/',
    {
      schema: {
        tags: ['admin', 'faq'],
        summary: 'Get list of FAQ entries',
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string' },
          },
        },
      },
    },
    controller.getFaqs.bind(controller)
  );

  // POST /admin/faq (Admin only)
  server.post(
    '/',
    {
      preValidation: [server.authenticateAdmin],
      schema: {
        tags: ['admin', 'faq'],
        summary: 'Create a new FAQ entry with vector embedding (Admin only)',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(faqAdminCreateSchema),
      },
    },
    controller.createFaq.bind(controller)
  );

  // PUT /admin/faq/:id (Admin only)
  server.put(
    '/:id',
    {
      preValidation: [server.authenticateAdmin],
      schema: {
        tags: ['admin', 'faq'],
        summary: 'Update an existing FAQ entry (Admin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: zodToJsonSchema(faqAdminUpdateSchema),
      },
    },
    controller.updateFaq.bind(controller)
  );

  // DELETE /admin/faq/:id (Admin only)
  server.delete(
    '/:id',
    {
      preValidation: [server.authenticateAdmin],
      schema: {
        tags: ['admin', 'faq'],
        summary: 'Delete an FAQ entry (Admin only)',
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
    controller.deleteFaq.bind(controller)
  );
}
