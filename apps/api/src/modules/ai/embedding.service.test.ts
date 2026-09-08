import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingService } from './embedding.service';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    OPENAI_API_KEY: 'mock-key',
  })),
}));

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      logAiUsage: vi.fn().mockResolvedValue({ id: 'log-1' }),
      updateBookEmbedding: vi.fn().mockResolvedValue(undefined),
    };
    service = new EmbeddingService(mockRepo);
  });

  describe('prepareBookContent', () => {
    it('should format title, author, categories, and description', () => {
      const book = {
        title: 'Bumi Manusia',
        author: 'Pramoedya Ananta Toer',
        description: 'Kisah Minke di era kolonial Hindia Belanda.',
        categories: [{ name: 'Sastra' }, { name: 'Sejarah' }],
      };

      const content = service.prepareBookContent(book);
      expect(content).toContain('Judul: Bumi Manusia');
      expect(content).toContain('Penulis: Pramoedya Ananta Toer');
      expect(content).toContain('Kategori: Sastra, Sejarah');
      expect(content).toContain('Deskripsi: Kisah Minke di era kolonial Hindia Belanda.');
    });

    it('should handle missing or string categories', () => {
      const book = {
        title: 'Laskar Pelangi',
        author: 'Andrea Hirata',
        description: 'Perjalanan anak-anak Belitung.',
        categories: ['Fiksi' as any],
      };

      const content = service.prepareBookContent(book);
      expect(content).toContain('Kategori: Fiksi');
    });
  });

  describe('generateEmbedding & save', () => {
    it('should return null when API key is missing', async () => {
      const { getEnv } = await import('../../config/env');
      (getEnv as any).mockReturnValueOnce({ OPENAI_API_KEY: '' });
      const unconfiguredService = new EmbeddingService(mockRepo);

      const result = await unconfiguredService.generateEmbedding('test text');
      expect(result).toBeNull();
    });

    it('should generate embedding and call repo.updateBookEmbedding', async () => {
      const mockVector = new Array(1536).fill(0.01);
      (service as any).openai = {
        embeddings: {
          create: vi.fn().mockResolvedValue({
            data: [{ embedding: mockVector }],
            usage: { total_tokens: 15 },
          }),
        },
      };

      const saved = await service.generateAndSaveBookEmbedding({
        id: 'book-1',
        title: 'Bumi Manusia',
        author: 'Pramoedya',
        description: 'Sebuah roman sejarah',
      });

      expect(saved).toBe(true);
      expect(mockRepo.updateBookEmbedding).toHaveBeenCalledWith('book-1', mockVector);
      expect(mockRepo.logAiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/embeddings',
          model: 'text-embedding-3-small',
          tokensUsed: 15,
        })
      );
    });
  });
});
