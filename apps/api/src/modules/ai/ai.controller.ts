import { FastifyRequest, FastifyReply } from 'fastify';
import { AiService } from './ai.service';
import {
  EnrichBookInput,
  RecommendationsQuery,
  OrderNotifyWebhookInput,
  ImportSuggestionsInput,
  ChatMessageInput,
} from './ai.schema';
import { NotFoundError } from '../../lib/errors';
import { logger } from '../../lib/logger';

export class AiController {
  constructor(private service: AiService) {}

  async getRecommendations(
    request: FastifyRequest<{
      Params: { slug: string };
      Querystring: RecommendationsQuery;
    }>,
    reply: FastifyReply
  ) {
    const { slug } = request.params;
    const { limit, minSimilarity } = request.query;

    const recommendations = await this.service.getRecommendations(slug, limit, minSimilarity);
    return reply.send({ items: recommendations });
  }

  async getReviewSummary(
    request: FastifyRequest<{
      Params: { slug: string };
    }>,
    reply: FastifyReply
  ) {
    const { slug } = request.params;
    const result = await this.service.getReviewSummary(slug);
    return reply.send(result);
  }

  async enrichBookDraft(
    request: FastifyRequest<{
      Body: EnrichBookInput;
    }>,
    reply: FastifyReply
  ) {
    const { title, author } = request.body;
    const result = await this.service.enrichBook(title, author);
    return reply.send(result);
  }

  async enrichBookById(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const book = await request.server.prisma.book.findUnique({
      where: { id },
    });

    if (!book) {
      throw new NotFoundError(`Book not found with id: ${id}`);
    }

    const result = await this.service.enrichBook(book.title, book.author);
    return reply.send(result);
  }

  async handleOrderNotifyWebhook(
    request: FastifyRequest<{
      Body: OrderNotifyWebhookInput;
    }>,
    reply: FastifyReply
  ) {
    logger.info({ body: request.body }, 'Received n8n order notification webhook');
    return reply.send({
      success: true,
      receivedAt: new Date().toISOString(),
      orderId: request.body.orderId,
    });
  }

  async handleImportSuggestions(
    request: FastifyRequest<{
      Body: ImportSuggestionsInput;
    }>,
    reply: FastifyReply
  ) {
    const { books } = request.body;
    logger.info({ count: books.length }, 'Received imported book suggestions from n8n');

    // Return received suggestions for admin review queue
    return reply.send({
      success: true,
      count: books.length,
      suggestions: books,
      message: `${books.length} saran buku baru berhasil diterima untuk antrean kurasi admin.`,
    });
  }

  async handleChat(
    request: FastifyRequest<{
      Body: ChatMessageInput;
    }>,
    reply: FastifyReply
  ) {
    const { message, history } = request.body;
    const result = await this.service.chat(message, history);
    return reply.send(result);
  }
}
