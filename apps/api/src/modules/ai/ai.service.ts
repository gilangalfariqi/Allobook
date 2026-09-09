import { FastifyInstance } from 'fastify';
import { AiRepository, SimilarBookResult } from './ai.repository';
import { EmbeddingService } from './embedding.service';
import { SummarizationService } from './summarization.service';
import { NotFoundError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { getEnv } from '../../config/env';
import { Queue, Worker } from 'bullmq';
import Anthropic from '@anthropic-ai/sdk';
import { ChatbotService, ChatResponse, ChatMessage } from './chatbot.service';

export interface EnrichedContentResult {
  description: string;
  suggestedTags: string[];
}

export class AiService {
  private repo: AiRepository;
  private embeddingService: EmbeddingService;
  private summarizationService: SummarizationService;
  private chatbotService: ChatbotService;
  private anthropic: Anthropic | null = null;
  private embeddingQueue: Queue | null = null;

  constructor(private server: FastifyInstance) {
    this.repo = new AiRepository(server.prisma);
    this.embeddingService = new EmbeddingService(this.repo);
    this.summarizationService = new SummarizationService(this.repo);
    this.chatbotService = new ChatbotService(this.repo, this.embeddingService);

    const apiKey = getEnv().ANTHROPIC_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      this.anthropic = new Anthropic({ apiKey });
    }

    this.initBackgroundQueue();
  }

  private initBackgroundQueue() {
    try {
      const redisUrl = new URL(getEnv().REDIS_URL);
      const connection: any = {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port || '6379', 10),
      };

      if (redisUrl.password) {
        connection.password = decodeURIComponent(redisUrl.password);
      }
      if (redisUrl.username && redisUrl.username !== 'default') {
        connection.username = decodeURIComponent(redisUrl.username);
      }
      if (redisUrl.protocol === 'rediss:') {
        connection.tls = { rejectUnauthorized: false };
      }

      this.embeddingQueue = new Queue('book-embedding', { connection });

      // BullMQ Worker to process background embedding jobs
      new Worker(
        'book-embedding',
        async (job) => {
          const { bookId } = job.data;
          logger.info({ bookId }, 'Processing background book embedding job');

          const book = await this.server.prisma.book.findUnique({
            where: { id: bookId },
            include: { categories: { include: { category: true } } },
          });

          if (!book) return;

          await this.embeddingService.generateAndSaveBookEmbedding({
            id: book.id,
            title: book.title,
            author: book.author,
            description: book.description,
            categories: book.categories.map((c) => c.category.name),
          });
        },
        { connection }
      );

      logger.info('BullMQ book-embedding queue worker initialized');
    } catch (err) {
      logger.warn({ err }, 'Failed to initialize BullMQ for AI embedding jobs');
    }
  }

  async queueBookEmbedding(bookId: string) {
    if (this.embeddingQueue) {
      try {
        await this.embeddingQueue.add('generate-embedding', { bookId });
        return;
      } catch (err) {
        logger.warn({ err }, 'Could not add job to embedding queue, generating synchronously');
      }
    }

    // Fallback if BullMQ is unavailable
    setImmediate(async () => {
      try {
        const book = await this.server.prisma.book.findUnique({
          where: { id: bookId },
          include: { categories: { include: { category: true } } },
        });
        if (book) {
          await this.embeddingService.generateAndSaveBookEmbedding({
            id: book.id,
            title: book.title,
            author: book.author,
            description: book.description,
            categories: book.categories.map((c) => c.category.name),
          });
        }
      } catch (err) {
        logger.error({ err }, 'Fallback background embedding failed');
      }
    });
  }

  async getRecommendations(slug: string, limit = 6, minSimilarity = 0.2): Promise<SimilarBookResult[]> {
    const book = await this.server.prisma.book.findUnique({
      where: { slug },
      include: { categories: true },
    });

    if (!book) {
      throw new NotFoundError(`Book not found with slug: ${slug}`);
    }

    let existingEmbedding = await this.repo.getBookEmbedding(book.id);

    // If embedding is not yet cached, attempt to generate it
    if (!existingEmbedding) {
      const generated = await this.embeddingService.generateAndSaveBookEmbedding({
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        categories: book.categories.map((c) => c.categoryId),
      });

      if (generated) {
        existingEmbedding = await this.repo.getBookEmbedding(book.id);
      }
    }

    let results: SimilarBookResult[] = [];

    if (existingEmbedding) {
      results = await this.repo.findSimilarBooksByVector(
        existingEmbedding,
        book.id,
        limit,
        minSimilarity
      );
    }

    // Fallback if vector search returned fewer items than requested
    if (results.length < limit) {
      const categoryIds = book.categories.map((c) => c.categoryId);
      const needed = limit - results.length;
      const excludeIds = [book.id, ...results.map((r) => r.id)];

      const fallbackBooks = await this.repo.findFallbackRecommendations(
        book.id,
        categoryIds,
        book.author,
        needed + 5
      );

      for (const fb of fallbackBooks) {
        if (!excludeIds.includes(fb.id) && results.length < limit) {
          results.push(fb);
          excludeIds.push(fb.id);
        }
      }
    }

    return results;
  }

  async getReviewSummary(slug: string): Promise<{
    summary: string;
    cachedAt: Date | null;
    reviewCount: number;
    isFresh: boolean;
  }> {
    const book = await this.server.prisma.book.findUnique({
      where: { slug },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
          select: { rating: true, body: true, createdAt: true },
        },
      },
    });

    if (!book) {
      throw new NotFoundError(`Book not found with slug: ${slug}`);
    }

    const reviewCount = book.reviews.length;
    const latestReview = book.reviews[0];

    // Check if cache is still valid
    const hasCache = Boolean(book.reviewSummaryCache);
    const cacheIsFresh =
      hasCache &&
      book.reviewSummaryUpdatedAt &&
      (!latestReview || new Date(latestReview.createdAt) <= new Date(book.reviewSummaryUpdatedAt));

    if (cacheIsFresh && book.reviewSummaryCache) {
      return {
        summary: book.reviewSummaryCache,
        cachedAt: book.reviewSummaryUpdatedAt,
        reviewCount,
        isFresh: true,
      };
    }

    // Regenerate summary
    const newSummary = await this.summarizationService.summarizeReviews(
      { id: book.id, title: book.title, author: book.author },
      book.reviews
    );

    return {
      summary: newSummary,
      cachedAt: new Date(),
      reviewCount,
      isFresh: false,
    };
  }

  async enrichBook(title: string, author: string): Promise<EnrichedContentResult> {
    if (!this.anthropic) {
      return this.generateFallbackEnrichment(title, author);
    }

    const model = 'claude-3-5-haiku-20241022';
    const prompt = `Sebagai editor dan kurator buku profesional untuk toko buku AlloBook, tolong buatkan:
1. Deskripsi / sinopsis promosi singkat yang menarik (100 - 150 kata) dalam Bahasa Indonesia untuk buku berikut:
Judul: "${title}"
Penulis: "${author}"
2. Tiga sampai lima tag/kategori genre yang relevan (misal: Fiksi, Sastra, Sejarah, Sains, Filsafat, Pengembangan Diri).

Kembalikan HANYA dalam format JSON valid dengan struktur:
{
  "description": "isi sinopsis disini...",
  "suggestedTags": ["Tag 1", "Tag 2", "Tag 3"]
}`;

    try {
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find((c) => c.type === 'text');
      if (!textBlock) return this.generateFallbackEnrichment(title, author);

      const promptTokens = response.usage.input_tokens;
      const completionTokens = response.usage.output_tokens;
      const tokensUsed = promptTokens + completionTokens;
      const cost = promptTokens * 0.0000008 + completionTokens * 0.000004;

      await this.repo.logAiUsage({
        endpoint: '/admin/books/enrich',
        model,
        promptTokens,
        completionTokens,
        tokensUsed,
        estimatedCost: cost,
      });

      const rawJson = textBlock.text.trim().replace(/^```json\s*|\s*```$/gi, '');
      const parsed = JSON.parse(rawJson);

      return {
        description: parsed.description || this.generateFallbackEnrichment(title, author).description,
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : ['Buku Populer', 'Literasi'],
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Claude enrichment failed, using fallback');
      return this.generateFallbackEnrichment(title, author);
    }
  }

  private generateFallbackEnrichment(title: string, author: string): EnrichedContentResult {
    return {
      description: `Karya istimewa persembahan ${author}. Buku "${title}" menyajikan wawasan mendalam dan perspektif kaya yang layak menjadi koleksi bacaan penting bagi Anda. Dituturkan dengan gaya narasi memikat yang menggabungkan kedalaman materi dan keasyikan membaca.`,
      suggestedTags: ['Rekomendasi Editor', 'Koleksi Pilihan', 'Buku Populer'],
    };
  }

  async backfillAllEmbeddings(onProgress?: (msg: string) => void): Promise<{ processed: number; success: number }> {
    const books = await this.server.prisma.book.findMany({
      where: {
        // Find books without embedding
        reviewSummaryCache: undefined,
      },
      include: {
        categories: { include: { category: true } },
      },
    });

    let processed = 0;
    let success = 0;

    for (const book of books) {
      const existing = await this.repo.getBookEmbedding(book.id);
      if (existing) continue;

      processed++;
      const ok = await this.embeddingService.generateAndSaveBookEmbedding({
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        categories: book.categories.map((c) => c.category.name),
      });

      if (ok) success++;

      const logMsg = `[Backfill] (${processed}/${books.length}) ${book.title}: ${ok ? 'Success' : 'Failed/Skipped'}`;
      if (onProgress) onProgress(logMsg);
      logger.info(logMsg);

      // Delay to respect rate limits
      await new Promise((r) => setTimeout(r, 400));
    }

    return { processed, success };
  }

  async chat(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    return this.chatbotService.chat(message, history);
  }
}
