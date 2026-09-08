import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatbotService } from './chatbot.service';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    ANTHROPIC_API_KEY: 'test-key',
  })),
}));

describe('ChatbotService', () => {
  let service: ChatbotService;
  let mockRepo: any;
  let mockEmbeddingService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      searchBooksForContext: vi.fn().mockResolvedValue([
        {
          id: 'b1',
          slug: 'sapiens',
          title: 'Sapiens',
          author: 'Yuval Noah Harari',
          description: 'Sejarah singkat umat manusia',
          price: 150000,
          stock: 12,
          isPreOrder: false,
          coverUrl: null,
          similarity: 0.88,
        },
      ]),
      logAiUsage: vi.fn().mockResolvedValue(undefined),
    };

    mockEmbeddingService = {
      generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    };

    service = new ChatbotService(mockRepo, mockEmbeddingService);
  });

  describe('chat with Anthropic API configured', () => {
    it('should generate embedding, retrieve books, call Anthropic and log usage', async () => {
      (service as any).anthropic = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Halo! Sapiens adalah bacaan yang sangat memikat mengenai sejarah peradaban.' }],
            usage: { input_tokens: 80, output_tokens: 45 },
          }),
        },
      };

      const result = await service.chat('Apakah ada buku sejarah peradaban?');

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('Apakah ada buku sejarah peradaban?');
      expect(mockRepo.searchBooksForContext).toHaveBeenCalled();
      expect(result.reply).toContain('Sapiens');
      expect(result.suggestedBooks).toHaveLength(1);
      expect(mockRepo.logAiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/ai/chat',
          model: 'claude-3-5-haiku-20241022',
          tokensUsed: 125,
        })
      );
    });

    it('should fall back gracefully if Anthropic API throws error', async () => {
      (service as any).anthropic = {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('Network connection timeout')),
        },
      };

      const result = await service.chat('Tolong rekomendasi buku');

      expect(result.reply).toBeDefined();
      expect(result.suggestedBooks).toHaveLength(1);
      expect(result.reply).toContain('Sapiens');
    });
  });

  describe('chat fallback mode without Anthropic API', () => {
    beforeEach(() => {
      (service as any).anthropic = null;
    });

    it('should explain pre-order flow when asked about pre-order or WA', async () => {
      const result = await service.chat('Bagaimana cara melakukan pre-order buku via WhatsApp?');

      expect(result.reply).toContain('Pre-Order (PO)');
      expect(result.reply).toContain('WhatsApp Concierge');
      expect(result.reply).toContain('PENDING → PROCESSING → CONFIRMED → SHIPPED → DONE');
    });

    it('should explain order tracking when asked about status', async () => {
      const result = await service.chat('Bagaimana cara tracking status pesanan saya?');

      expect(result.reply).toContain('Riwayat Pesanan');
      expect(result.reply).toContain('Akun Saya');
    });

    it('should recommend retrieved books when available', async () => {
      const result = await service.chat('Buku apa yang menarik?');

      expect(result.reply).toContain('Sapiens');
      expect(result.suggestedBooks).toHaveLength(1);
    });
  });
});
