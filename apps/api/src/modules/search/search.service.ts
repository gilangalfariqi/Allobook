import { FastifyInstance } from 'fastify';
import { SearchQuery, SearchSuggest } from '@allobook/shared-types';
import { logger } from '../../lib/logger';

export class SearchService {
  constructor(private server: FastifyInstance) {}

  async search(query: SearchQuery) {
    const { q = '', genre, author, page = 1 } = query;
    const limit = 12;
    const offset = (page - 1) * limit;

    // Try Meilisearch first if available
    if (this.server.meilisearch) {
      try {
        const filters: string[] = [];
        if (genre) filters.push(`categories = "${genre}"`);
        if (author) filters.push(`author = "${author}"`);

        const searchRes = await this.server.meilisearch.index('books').search(q, {
          limit,
          offset,
          filter: filters.length > 0 ? filters.join(' AND ') : undefined,
        });

        return {
          items: searchRes.hits,
          pagination: {
            page,
            limit,
            total: searchRes.estimatedTotalHits ?? searchRes.hits.length,
            totalPages: Math.ceil((searchRes.estimatedTotalHits ?? searchRes.hits.length) / limit),
          },
        };
      } catch (err) {
        logger.warn({ err }, 'Meilisearch query failed, falling back to database query');
      }
    }

    // Database fallback (PostgreSQL ILIKE)
    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { author: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (genre) {
      where.categories = {
        some: {
          category: { slug: genre },
        },
      };
    }
    if (author) {
      where.author = { contains: author, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.server.prisma.book.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          categories: { include: { category: true } },
          reviews: { select: { rating: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.server.prisma.book.count({ where }),
    ]);

    const formatted = items.map((b) => {
      const avg =
        b.reviews.length > 0
          ? Number((b.reviews.reduce((acc, r) => acc + r.rating, 0) / b.reviews.length).toFixed(1))
          : 0;
      return {
        ...b,
        price: Number(b.price),
        categories: b.categories.map((c) => c.category),
        averageRating: avg,
        reviewCount: b.reviews.length,
      };
    });

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async suggest(input: SearchSuggest) {
    const { q } = input;

    if (this.server.meilisearch) {
      try {
        const searchRes = await this.server.meilisearch.index('books').search(q, {
          limit: 6,
          attributesToRetrieve: ['id', 'slug', 'title', 'author', 'coverUrl', 'price'],
        });
        return searchRes.hits;
      } catch {
        // Fallback
      }
    }

    const books = await this.server.prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { author: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 6,
      select: {
        id: true,
        slug: true,
        title: true,
        author: true,
        coverUrl: true,
        price: true,
      },
    });

    return books.map((b) => ({
      ...b,
      price: Number(b.price),
    }));
  }
}
