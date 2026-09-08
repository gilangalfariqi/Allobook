import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  book: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn().mockResolvedValue([]),
};

const mockMeilisearch = {
  index: vi.fn().mockReturnValue({
    addDocuments: vi.fn(),
    deleteDocument: vi.fn(),
  }),
};

const mockServer = {
  prisma: mockPrisma,
  redis: mockRedis,
  meilisearch: mockMeilisearch,
} as any;

import { BookService } from './book.service';
import { NotFoundError } from '../../lib/errors';

describe('BookService', () => {
  let service: BookService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BookService(mockServer);
  });

  describe('getBooks', () => {
    it('should return cached result if present in redis', async () => {
      const cachedData = {
        items: [{ id: 'b1', title: 'Cached Book', price: 50000 }],
        pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getBooks({ page: 1, limit: 12, sort: 'newest' });
      expect(result).toEqual(cachedData);
      expect(mockPrisma.book.findMany).not.toHaveBeenCalled();
    });

    it('should query DB and populate cache if not cached', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.book.findMany.mockResolvedValue([
        {
          id: 'b1',
          title: 'DB Book',
          price: 99000,
          categories: [],
          reviews: [{ rating: 5 }],
        },
      ]);
      mockPrisma.book.count.mockResolvedValue(1);

      const result = await service.getBooks({ page: 1, limit: 12, sort: 'newest' });
      expect(result.items.length).toBe(1);
      expect(result.items[0].averageRating).toBe(5);
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('getBookBySlug', () => {
    it('should throw NotFoundError if book is missing', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.book.findUnique.mockResolvedValue(null);

      await expect(service.getBookBySlug('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('should return book if found', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.book.findUnique.mockResolvedValue({
        id: 'b1',
        slug: 'great-book',
        title: 'Great Book',
        price: 120000,
        categories: [],
        reviews: [],
      });

      const result = await service.getBookBySlug('great-book');
      expect(result.title).toBe('Great Book');
    });
  });
});
