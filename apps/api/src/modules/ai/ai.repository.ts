import { PrismaClient } from '@prisma/client';

export interface SimilarBookResult {
  id: string;
  slug: string;
  title: string;
  author: string;
  description?: string;
  coverUrl: string | null;
  price: number;
  stock: number;
  isPreOrder: boolean;
  similarity: number;
}

export class AiRepository {
  constructor(private prisma: PrismaClient) {}

  async findSimilarBooksByVector(
    embedding: number[],
    excludeBookId: string,
    limit = 6,
    minSimilarity = 0.25
  ): Promise<SimilarBookResult[]> {
    const vectorString = `[${embedding.join(',')}]`;

    const results = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        b.id, 
        b.slug, 
        b.title, 
        b.author, 
        b."coverUrl", 
        CAST(b.price AS FLOAT) as price, 
        b.stock, 
        b."isPreOrder", 
        CAST(1 - (b.embedding <=> $1::vector) AS FLOAT) as similarity
      FROM books b
      WHERE b.id != $2 
        AND b.embedding IS NOT NULL
        AND (1 - (b.embedding <=> $1::vector)) >= $3
      ORDER BY b.embedding <=> $1::vector ASC
      LIMIT $4;`,
      vectorString,
      excludeBookId,
      minSimilarity,
      limit
    );

    return results.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      author: r.author,
      coverUrl: r.coverUrl,
      price: Number(r.price),
      stock: Number(r.stock),
      isPreOrder: Boolean(r.isPreOrder),
      similarity: Number(r.similarity),
    }));
  }

  async findFallbackRecommendations(
    excludeBookId: string,
    categoryIds: string[] = [],
    author?: string,
    limit = 6
  ): Promise<SimilarBookResult[]> {
    const books = await this.prisma.book.findMany({
      where: {
        id: { not: excludeBookId },
        OR: [
          categoryIds.length > 0
            ? {
                categories: {
                  some: {
                    categoryId: { in: categoryIds },
                  },
                },
              }
            : {},
          author ? { author: { contains: author, mode: 'insensitive' } } : {},
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        author: true,
        coverUrl: true,
        price: true,
        stock: true,
        isPreOrder: true,
      },
    });

    return books.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      author: b.author,
      coverUrl: b.coverUrl,
      price: Number(b.price),
      stock: b.stock,
      isPreOrder: b.isPreOrder,
      similarity: 0.5,
    }));
  }

  async updateBookEmbedding(bookId: string, embedding: number[]): Promise<void> {
    const vectorString = `[${embedding.join(',')}]`;
    await this.prisma.$executeRawUnsafe(
      `UPDATE books SET embedding = $1::vector WHERE id = $2;`,
      vectorString,
      bookId
    );
  }

  async getBookEmbedding(bookId: string): Promise<number[] | null> {
    const res = await this.prisma.$queryRawUnsafe<Array<{ embedding: string }>>(
      `SELECT embedding::text FROM books WHERE id = $1 AND embedding IS NOT NULL;`,
      bookId
    );
    if (!res || res.length === 0 || !res[0].embedding) return null;

    try {
      // res[0].embedding is format "[0.123, -0.456, ...]"
      return JSON.parse(res[0].embedding);
    } catch {
      return null;
    }
  }

  async updateReviewSummary(bookId: string, summary: string): Promise<void> {
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        reviewSummaryCache: summary,
        reviewSummaryUpdatedAt: new Date(),
      },
    });
  }

  async logAiUsage(data: {
    endpoint: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    tokensUsed: number;
    estimatedCost: number;
  }): Promise<void> {
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          endpoint: data.endpoint,
          model: data.model,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          tokensUsed: data.tokensUsed,
          estimatedCost: data.estimatedCost,
        },
      });
    } catch (err) {
      console.error('Failed to log AI usage:', err);
    }
  }

  async searchBooksForContext(
    queryEmbedding: number[] | null,
    textQuery: string,
    limit = 5
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
        console.error('Vector search for context error:', err);
      }
    }

    // Fallback: search by text keywords
    const rawWords = textQuery.split(/\s+/).filter((w) => w.length > 2);
    const keywords = rawWords.length > 0 ? rawWords.slice(0, 3) : [];

    const books = await this.prisma.book.findMany({
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
      select: {
        id: true,
        slug: true,
        title: true,
        author: true,
        description: true,
        coverUrl: true,
        price: true,
        stock: true,
        isPreOrder: true,
      },
    });

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
}
