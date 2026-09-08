import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { FaqAdminCreateInput, FaqAdminUpdateInput } from './chatbot.schema';
import { SimilarBookResult } from '../ai/ai.repository';

export interface FaqResult {
  id: string;
  question: string;
  answer: string;
  category: string;
  similarity?: number;
}

export interface ChatSessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export class ChatbotRepository {
  constructor(
    private prisma: PrismaClient,
    private redis: IORedis
  ) {}

  // ─── FAQ Retrieval (pgvector + keyword fallback) ───────────────────────────

  async findRelevantFaqs(
    queryEmbedding: number[] | null,
    textQuery: string,
    limit = 3
  ): Promise<FaqResult[]> {
    if (queryEmbedding && queryEmbedding.length > 0) {
      try {
        const vectorString = `[${queryEmbedding.join(',')}]`;
        const results = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT 
            id, 
            question, 
            answer, 
            category,
            CAST(1 - (embedding <=> $1::vector) AS FLOAT) as similarity
          FROM faq_entries
          WHERE "isActive" = true 
            AND embedding IS NOT NULL
          ORDER BY embedding <=> $1::vector ASC
          LIMIT $2;`,
          vectorString,
          limit
        );

        if (results && results.length > 0) {
          return results.map((r) => ({
            id: r.id,
            question: r.question,
            answer: r.answer,
            category: r.category,
            similarity: Number(r.similarity),
          }));
        }
      } catch (err) {
        console.error('Vector search for FAQ failed, using fallback:', err);
      }
    }

    // Keyword fallback
    const rawWords = textQuery.split(/\s+/).filter((w) => w.length > 2);
    const keywords = rawWords.slice(0, 3);

    const faqs = await this.prisma.faqEntry.findMany({
      where: {
        isActive: true,
        ...(keywords.length > 0
          ? {
              OR: keywords.flatMap((kw) => [
                { question: { contains: kw, mode: 'insensitive' } },
                { answer: { contains: kw, mode: 'insensitive' } },
              ]),
            }
          : {}),
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return faqs.map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category,
      similarity: 0.5,
    }));
  }

  // ─── Book Recommendation Retrieval (pgvector) ──────────────────────────────

  async searchBooksForRecommendation(
    queryEmbedding: number[] | null,
    textQuery: string,
    limit = 4
  ): Promise<SimilarBookResult[]> {
    if (queryEmbedding && queryEmbedding.length > 0) {
      try {
        const vectorString = `[${queryEmbedding.join(',')}]`;
        const results = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT 
            b.id, 
            b.slug, 
            b.title, 
            b.author, 
            b.description,
            b."coverUrl", 
            CAST(b.price AS FLOAT) as price, 
            b.stock, 
            b."isPreOrder", 
            CAST(1 - (b.embedding <=> $1::vector) AS FLOAT) as similarity
          FROM books b
          WHERE b.embedding IS NOT NULL
          ORDER BY b.embedding <=> $1::vector ASC
          LIMIT $2;`,
          vectorString,
          limit
        );

        if (results && results.length > 0) {
          return results.map((r) => ({
            id: r.id,
            slug: r.slug,
            title: r.title,
            author: r.author,
            description: r.description,
            coverUrl: r.coverUrl,
            price: Number(r.price),
            stock: Number(r.stock),
            isPreOrder: Boolean(r.isPreOrder),
            similarity: Number(r.similarity),
          }));
        }
      } catch (err) {
        console.error('Vector search for books failed in chatbot:', err);
      }
    }

    // Keyword fallback
    const stopWords = new Set([
      'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'pada', 'adalah',
      'buku', 'apa', 'tentang', 'ada', 'anak', 'usia', 'tahun', 'gimana', 'cara',
      'the', 'and', 'for', 'with', 'about', 'recommend', 'rekomendasi', 'cocok'
    ]);
    const rawWords = textQuery
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
    const keywords = rawWords.slice(0, 3);

    let books = await this.prisma.book.findMany({
      where:
        keywords.length > 0
          ? {
              OR: keywords.flatMap((kw) => [
                { title: { contains: kw, mode: 'insensitive' } },
                { author: { contains: kw, mode: 'insensitive' } },
                { description: { contains: kw, mode: 'insensitive' } },
              ]),
            }
          : undefined,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    if (books.length === 0) {
      books = await this.prisma.book.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    }

    return books.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      author: b.author,
      description: b.description,
      coverUrl: b.coverUrl,
      price: Number(b.price),
      stock: b.stock,
      isPreOrder: b.isPreOrder,
      similarity: 0.5,
    }));
  }

  // ─── Order Verification & Lookup ───────────────────────────────────────────

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) {
      return '62' + digits.slice(1);
    }
    return digits;
  }

  async verifyOrderOwnership(
    orderIdOrPhone: string,
    customerPhone: string
  ) {
    const cleanPhone = this.normalizePhone(customerPhone);
    const altPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.slice(2) : cleanPhone;

    // Search by exact order ID or phone
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: orderIdOrPhone.trim() },
          { customerPhone: { in: [cleanPhone, altPhone, customerPhone.trim()] } },
        ],
        AND: {
          customerPhone: { in: [cleanPhone, altPhone, customerPhone.trim()] },
        },
      },
      include: {
        items: {
          include: {
            book: {
              select: { title: true, author: true },
            },
          },
        },
      },
    });

    return order;
  }

  async getOrderDetailsById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            book: {
              select: { title: true, author: true, price: true },
            },
          },
        },
      },
    });
  }

  // ─── Redis Session History (TTL 24h, max 10 messages) ──────────────────────

  private getSessionKey(sessionId: string): string {
    return `chatbot:session:${sessionId}`;
  }

  async saveMessageToHistory(
    sessionId: string,
    message: { role: 'user' | 'assistant'; content: string }
  ): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const item: ChatSessionMessage = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.redis.rpush(key, JSON.stringify(item));
      // Keep only last 10 messages
      await this.redis.ltrim(key, -10, -1);
      // Set 24 hour TTL (86400 seconds)
      await this.redis.expire(key, 86400);
    } catch (err) {
      console.error('Failed to save chat message to Redis:', err);
    }
  }

  async getSessionHistory(sessionId: string, limit = 10): Promise<ChatSessionMessage[]> {
    const key = this.getSessionKey(sessionId);
    try {
      const items = await this.redis.lrange(key, -limit, -1);
      return items.map((raw) => JSON.parse(raw));
    } catch (err) {
      console.error('Failed to get chat history from Redis:', err);
      return [];
    }
  }

  // ─── Admin FAQ CRUD ────────────────────────────────────────────────────────

  async getAllFaqs(category?: string) {
    return this.prisma.faqEntry.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFaqById(id: string) {
    return this.prisma.faqEntry.findUnique({ where: { id } });
  }

  async createFaq(data: FaqAdminCreateInput, embedding?: number[] | null) {
    const faq = await this.prisma.faqEntry.create({
      data: {
        question: data.question,
        answer: data.answer,
        category: data.category,
        isActive: data.isActive ?? true,
      },
    });

    if (embedding && embedding.length > 0) {
      await this.updateFaqEmbedding(faq.id, embedding);
    }

    return faq;
  }

  async updateFaq(id: string, data: FaqAdminUpdateInput, embedding?: number[] | null) {
    const faq = await this.prisma.faqEntry.update({
      where: { id },
      data: {
        ...(data.question && { question: data.question }),
        ...(data.answer && { answer: data.answer }),
        ...(data.category && { category: data.category }),
        ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
      },
    });

    if (embedding && embedding.length > 0) {
      await this.updateFaqEmbedding(faq.id, embedding);
    }

    return faq;
  }

  async deleteFaq(id: string) {
    return this.prisma.faqEntry.delete({ where: { id } });
  }

  async updateFaqEmbedding(faqId: string, embedding: number[]) {
    const vectorString = `[${embedding.join(',')}]`;
    await this.prisma.$executeRawUnsafe(
      `UPDATE faq_entries SET embedding = $1::vector WHERE id = $2;`,
      vectorString,
      faqId
    );
  }
}
