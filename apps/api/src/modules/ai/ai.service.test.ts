import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue(true),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
  })),
}));

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    ANTHROPIC_API_KEY: 'test-key',
    OPENAI_API_KEY: 'test-key',
    REDIS_URL: 'redis://localhost:6379',
  })),
}));

import { AiService } from './ai.service';
import { NotFoundError } from '../../lib/errors';

describe('AiService', () => {
  let service: AiService;
  let mockServer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockServer = {
      prisma: {
        book: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          update: vi.fn(),
        },
      },
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
    };

    service = new AiService(mockServer);
  });

  describe('getRecommendations', () => {
    it('should throw NotFoundError when book does not exist', async () => {
      mockServer.prisma.book.findUnique.mockResolvedValue(null);

      await expect(service.getRecommendations('non-existent-book')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should return similar books using vector search and fallback', async () => {
      const mockBook = {
        id: 'b1',
        slug: 'bumi-manusia',
        title: 'Bumi Manusia',
        author: 'Pramoedya Ananta Toer',
        description: 'Novel sejarah',
        categories: [{ categoryId: 'c1' }],
      };

      mockServer.prisma.book.findUnique.mockResolvedValue(mockBook);

      // Mock repository methods
      const mockEmbedding = new Array(1536).fill(0.02);
      (service as any).repo.getBookEmbedding = vi.fn().mockResolvedValue(mockEmbedding);
      (service as any).repo.findSimilarBooksByVector = vi.fn().mockResolvedValue([
        {
          id: 'b2',
          slug: 'anak-semua-bangsa',
          title: 'Anak Semua Bangsa',
          author: 'Pramoedya Ananta Toer',
          price: 90000,
          coverUrl: null,
          similarity: 0.92,
        },
      ]);
      (service as any).repo.findFallbackRecommendations = vi.fn().mockResolvedValue([]);

      const recommendations = await service.getRecommendations('bumi-manusia', 6);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe('Anak Semua Bangsa');
      expect((service as any).repo.findSimilarBooksByVector).toHaveBeenCalled();
    });
  });

  describe('getReviewSummary', () => {
    it('should return cached summary if fresh', async () => {
      const cachedDate = new Date();
      const mockBook = {
        id: 'b1',
        slug: 'bumi-manusia',
        title: 'Bumi Manusia',
        author: 'Pramoedya',
        reviewSummaryCache: 'Ringkasan ulasan tersimpan.',
        reviewSummaryUpdatedAt: cachedDate,
        reviews: [
          { rating: 5, body: 'Bagus', createdAt: new Date(cachedDate.getTime() - 10000) },
        ],
      };

      mockServer.prisma.book.findUnique.mockResolvedValue(mockBook);

      const result = await service.getReviewSummary('bumi-manusia');

      expect(result.isFresh).toBe(true);
      expect(result.summary).toBe('Ringkasan ulasan tersimpan.');
      expect(result.reviewCount).toBe(1);
    });

    it('should regenerate summary when cache is missing or stale', async () => {
      const mockBook = {
        id: 'b1',
        slug: 'bumi-manusia',
        title: 'Bumi Manusia',
        author: 'Pramoedya',
        reviewSummaryCache: null,
        reviewSummaryUpdatedAt: null,
        reviews: [{ rating: 5, body: 'Ulasan baru', createdAt: new Date() }],
      };

      mockServer.prisma.book.findUnique.mockResolvedValue(mockBook);
      (service as any).summarizationService.summarizeReviews = vi
        .fn()
        .mockResolvedValue('Ringkasan baru yang baru di-generate.');

      const result = await service.getReviewSummary('bumi-manusia');

      expect(result.isFresh).toBe(false);
      expect(result.summary).toBe('Ringkasan baru yang baru di-generate.');
      expect((service as any).summarizationService.summarizeReviews).toHaveBeenCalled();
    });
  });

  describe('enrichBook', () => {
    it('should return fallback enrichment when Anthropic client is not available', async () => {
      (service as any).anthropic = null;

      const result = await service.enrichBook('Judul Buku Baru', 'Penulis Hebat');

      expect(result.description).toContain('Penulis Hebat');
      expect(result.description).toContain('Judul Buku Baru');
      expect(result.suggestedTags).toBeInstanceOf(Array);
      expect(result.suggestedTags.length).toBeGreaterThan(0);
    });

    it('should parse Anthropic response JSON correctly', async () => {
      (service as any).anthropic = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  description: 'Sinopsis buku fiksi spektakuler.',
                  suggestedTags: ['Fiksi', 'Sastra'],
                }),
              },
            ],
            usage: { input_tokens: 50, output_tokens: 40 },
          }),
        },
      };
      (service as any).repo.logAiUsage = vi.fn().mockResolvedValue({ id: 'log-1' });

      const result = await service.enrichBook('Buku Fiksi', 'Penulis Fiksi');

      expect(result.description).toBe('Sinopsis buku fiksi spektakuler.');
      expect(result.suggestedTags).toEqual(['Fiksi', 'Sastra']);
    });
  });
});
