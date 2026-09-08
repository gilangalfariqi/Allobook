import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SummarizationService } from './summarization.service';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    ANTHROPIC_API_KEY: 'mock-anthropic-key',
  })),
}));

describe('SummarizationService', () => {
  let service: SummarizationService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      updateReviewSummary: vi.fn().mockResolvedValue(undefined),
      logAiUsage: vi.fn().mockResolvedValue({ id: 'log-1' }),
    };
    service = new SummarizationService(mockRepo);
  });

  describe('generateFallbackSummary', () => {
    it('should return empty review message when no reviews', () => {
      const summary = service.generateFallbackSummary('Bumi Manusia', []);
      expect(summary).toContain('Belum ada ulasan');
      expect(summary).toContain('Bumi Manusia');
    });

    it('should calculate average and include quote when reviews exist', () => {
      const reviews = [
        { rating: 5, body: 'Buku yang sangat luar biasa dan membuka mata.' },
        { rating: 4, body: 'Cerita sangat bagus meskipun agak panjang.' },
      ];
      const summary = service.generateFallbackSummary('Bumi Manusia', reviews);
      expect(summary).toContain('Berdasarkan 2 ulasan');
      expect(summary).toContain('4.5 dari 5 bintang');
      expect(summary).toContain('Buku yang sangat luar biasa');
    });
  });

  describe('summarizeReviews', () => {
    const book = { id: 'book-1', title: 'Cantik Itu Luka', author: 'Eka Kurniawan' };
    const reviews = [
      { rating: 5, body: 'Sangat menyukai gaya realisme magisnya.' },
      { rating: 5, body: 'Salah satu sastra terbaik Indonesia.' },
    ];

    it('should call Anthropic and save result with usage log', async () => {
      (service as any).anthropic = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Ringkasan kuratorial buku Cantik Itu Luka.' }],
            usage: {
              input_tokens: 120,
              output_tokens: 65,
            },
          }),
        },
      };

      const result = await service.summarizeReviews(book, reviews);

      expect(result).toBe('Ringkasan kuratorial buku Cantik Itu Luka.');
      expect(mockRepo.updateReviewSummary).toHaveBeenCalledWith('book-1', 'Ringkasan kuratorial buku Cantik Itu Luka.');
      expect(mockRepo.logAiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/books/:slug/review-summary',
          model: 'claude-3-5-haiku-20241022',
          promptTokens: 120,
          completionTokens: 65,
          tokensUsed: 185,
        })
      );
    });

    it('should fall back gracefully on Anthropic API error', async () => {
      (service as any).anthropic = {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('Rate limit exceeded')),
        },
      };

      const result = await service.summarizeReviews(book, reviews);

      expect(result).toContain('Berdasarkan 2 ulasan pembaca');
      expect(mockRepo.updateReviewSummary).toHaveBeenCalled();
    });
  });
});
