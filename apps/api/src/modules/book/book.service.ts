import { FastifyInstance } from 'fastify';
import { BookRepository } from './book.repository';
import { CreateBookInput, UpdateBookInput, BookQuery } from '@allobook/shared-types';
import { NotFoundError, ConflictError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { AiService } from '../ai/ai.service';

export class BookService {
  private repo: BookRepository;
  private aiService: AiService;

  constructor(private server: FastifyInstance) {
    this.repo = new BookRepository(server.prisma);
    this.aiService = new AiService(server);
  }

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  async getBooks(query: BookQuery) {
    const cacheKey = `books:list:${JSON.stringify(query)}`;

    if (this.server.redis) {
      try {
        const cached = await this.server.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        logger.warn({ err }, 'Redis get error');
      }
    }

    const result = await this.repo.findAll(query);

    if (this.server.redis) {
      try {
        // Cache catalog listing for 5 minutes (300 seconds)
        await this.server.redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
      } catch (err) {
        logger.warn({ err }, 'Redis set error');
      }
    }

    return result;
  }

  async getBookBySlug(slug: string) {
    const cacheKey = `books:slug:${slug}`;

    if (this.server.redis) {
      try {
        const cached = await this.server.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        logger.warn({ err }, 'Redis get error');
      }
    }

    const book = await this.repo.findBySlug(slug);
    if (!book) {
      throw new NotFoundError(`Book not found with slug: ${slug}`);
    }

    if (this.server.redis) {
      try {
        // Cache detail for 10 minutes (600 seconds)
        await this.server.redis.set(cacheKey, JSON.stringify(book), 'EX', 600);
      } catch (err) {
        logger.warn({ err }, 'Redis set error');
      }
    }

    return book;
  }

  async getBookById(id: string) {
    const book = await this.repo.findById(id);
    if (!book) {
      throw new NotFoundError(`Book not found with id: ${id}`);
    }
    return book;
  }

  async createBook(input: CreateBookInput) {
    const slug = this.generateSlug(input.title);

    const existingSlug = await this.repo.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictError('A book with this slug already exists');
    }

    const book = await this.repo.create({ ...input, slug });
    await this.invalidateCache();
    await this.syncToMeilisearch(book);
    await this.aiService.queueBookEmbedding(book.id);

    return book;
  }

  async updateBook(id: string, input: UpdateBookInput) {
    await this.getBookById(id);
    const updated = await this.repo.update(id, input);
    await this.invalidateCache(updated.slug);
    await this.syncToMeilisearch(updated);
    await this.aiService.queueBookEmbedding(updated.id);

    return updated;
  }

  async deleteBook(id: string) {
    const existing = await this.getBookById(id);
    const deleted = await this.repo.delete(id);
    await this.invalidateCache(existing.slug);
    await this.removeFromMeilisearch(id);

    return deleted;
  }

  async invalidateCache(slug?: string) {
    if (!this.server.redis) return;
    try {
      if (slug) {
        await this.server.redis.del(`books:slug:${slug}`);
      }
      const listKeys = await this.server.redis.keys('books:list:*');
      if (listKeys.length > 0) {
        await this.server.redis.del(...listKeys);
      }
    } catch (err) {
      logger.warn({ err }, 'Redis cache invalidation error');
    }
  }

  private async syncToMeilisearch(book: any) {
    if (!this.server.meilisearch) return;
    try {
      await this.server.meilisearch.index('books').addDocuments([
        {
          id: book.id,
          slug: book.slug,
          title: book.title,
          author: book.author,
          description: book.description,
          coverUrl: book.coverUrl,
          price: Number(book.price),
          stock: book.stock,
          isPreOrder: book.isPreOrder,
          categories: book.categories?.map((c: any) => c.category?.name ?? c.name) ?? [],
          publishedAt: book.publishedAt ? new Date(book.publishedAt).toISOString() : null,
          createdAt: new Date(book.createdAt).toISOString(),
        },
      ]);
    } catch (err) {
      logger.warn({ err }, 'Meilisearch document sync error');
    }
  }

  private async removeFromMeilisearch(id: string) {
    if (!this.server.meilisearch) return;
    try {
      await this.server.meilisearch.index('books').deleteDocument(id);
    } catch (err) {
      logger.warn({ err }, 'Meilisearch document delete error');
    }
  }
}
