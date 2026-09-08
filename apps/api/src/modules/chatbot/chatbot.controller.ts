import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env';
import { ChatbotService } from './chatbot.service';
import { ChatbotRepository } from './chatbot.repository';
import { EmbeddingService } from '../ai/embedding.service';
import {
  ChatMessageInput,
  VerifyOrderInput,
  FaqAdminCreateInput,
  FaqAdminUpdateInput,
} from './chatbot.schema';

export class ChatbotController {
  constructor(
    private service: ChatbotService,
    private repo: ChatbotRepository,
    private embeddingService: EmbeddingService
  ) {}

  // ─── POST /chatbot/message (Supports SSE streaming & standard JSON) ────────

  async sendMessage(
    request: FastifyRequest<{
      Body: ChatMessageInput;
      Querystring: { stream?: string };
    }>,
    reply: FastifyReply
  ) {
    const { message, sessionId, orderSessionToken } = request.body;
    const isStream =
      request.query.stream === 'true' ||
      (request.headers.accept && request.headers.accept.includes('text/event-stream'));

    if (isStream) {
      const origin = request.headers.origin || 'http://localhost:3000';
      reply.raw.setHeader('Access-Control-Allow-Origin', origin);
      reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.flushHeaders?.();

      try {
        const fullResponse = await this.service.processMessage(
          message,
          sessionId,
          orderSessionToken,
          (delta) => {
            reply.raw.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`);
          }
        );

        reply.raw.write(
          `data: ${JSON.stringify({
            type: 'done',
            intent: fullResponse.intent,
            suggestedBooks: fullResponse.suggestedBooks,
            requiresOrderVerification: fullResponse.requiresOrderVerification,
            orderSummary: fullResponse.orderSummary,
            whatsAppHandoffUrl: fullResponse.whatsAppHandoffUrl,
          })}\n\n`
        );
      } catch (err: any) {
        reply.raw.write(
          `data: ${JSON.stringify({ type: 'error', message: err.message || 'Terjadi kesalahan sistem' })}\n\n`
        );
      } finally {
        reply.raw.end();
      }
      return;
    }

    // Standard JSON mode
    const response = await this.service.processMessage(
      message,
      sessionId,
      orderSessionToken
    );

    return reply.send(response);
  }

  // ─── POST /chatbot/verify-order ───────────────────────────────────────────

  async verifyOrder(
    request: FastifyRequest<{
      Body: VerifyOrderInput;
    }>,
    reply: FastifyReply
  ) {
    const { orderIdOrPhone, customerPhone } = request.body;

    const order = await this.repo.verifyOrderOwnership(orderIdOrPhone, customerPhone);

    if (!order) {
      return reply.status(404).send({
        success: false,
        message:
          'Pesanan tidak ditemukan atau nomor WhatsApp tidak sesuai dengan data saat checkout. Silakan periksa kembali data Anda.',
      });
    }

    // Generate short-lived session token (15 minutes)
    const token = jwt.sign(
      {
        type: 'order_session',
        orderId: order.id,
        customerPhone: order.customerPhone,
      },
      getEnv().JWT_SECRET,
      { expiresIn: '15m' }
    );

    return reply.send({
      success: true,
      orderSessionToken: token,
      orderSummary: {
        id: order.id,
        customerName: order.customerName,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt,
        itemsCount: order.items.length,
      },
      message: 'Verifikasi pesanan berhasil. Token sesi aktif selama 15 menit.',
    });
  }

  // ─── GET /chatbot/history/:sessionId ──────────────────────────────────────

  async getHistory(
    request: FastifyRequest<{
      Params: { sessionId: string };
    }>,
    reply: FastifyReply
  ) {
    const { sessionId } = request.params;
    const history = await this.repo.getSessionHistory(sessionId, 10);
    return reply.send({ history });
  }

  // ─── Admin FAQ CRUD Handlers ──────────────────────────────────────────────

  async getFaqs(
    request: FastifyRequest<{
      Querystring: { category?: string };
    }>,
    reply: FastifyReply
  ) {
    const faqs = await this.repo.getAllFaqs(request.query.category);
    return reply.send({ items: faqs });
  }

  async createFaq(
    request: FastifyRequest<{
      Body: FaqAdminCreateInput;
    }>,
    reply: FastifyReply
  ) {
    const data = request.body;

    // Generate embedding for FAQ question and answer
    let embedding: number[] | null = null;
    try {
      embedding = await this.embeddingService.generateEmbedding(`${data.question} ${data.answer}`);
    } catch {
      embedding = null;
    }

    const faq = await this.repo.createFaq(data, embedding);
    return reply.status(201).send(faq);
  }

  async updateFaq(
    request: FastifyRequest<{
      Params: { id: string };
      Body: FaqAdminUpdateInput;
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const data = request.body;

    let embedding: number[] | null = null;
    if (data.question || data.answer) {
      const existing = await this.repo.getFaqById(id);
      const text = `${data.question || existing?.question} ${data.answer || existing?.answer}`;
      try {
        embedding = await this.embeddingService.generateEmbedding(text);
      } catch {
        embedding = null;
      }
    }

    const updated = await this.repo.updateFaq(id, data, embedding);
    return reply.send(updated);
  }

  async deleteFaq(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    await this.repo.deleteFaq(id);
    return reply.send({ success: true, message: 'FAQ berhasil dihapus' });
  }
}
