import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  book: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  review: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

const mockRedis = {
  del: vi.fn(),
  keys: vi.fn().mockResolvedValue([]),
};

const mockServer = {
  prisma: mockPrisma,
  redis: mockRedis,
} as any;

import { ReviewService } from './review.service';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReviewService(mockServer);
  });

  describe('createReview', () => {
    it('should throw NotFoundError if book does not exist', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(null);

      await expect(
        service.createReview('user1', {
          bookId: 'book1',
          rating: 5,
          body: 'Amazing book!',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should create review and invalidate book cache if book exists', async () => {
      mockPrisma.book.findUnique.mockResolvedValue({ id: 'book1', slug: 'awesome-book' });
      mockPrisma.review.create.mockResolvedValue({
        id: 'rev1',
        userId: 'user1',
        bookId: 'book1',
        rating: 5,
        body: 'Amazing book!',
      });

      const result = await service.createReview('user1', {
        bookId: 'book1',
        rating: 5,
        body: 'Amazing book!',
      });

      expect(result.id).toBe('rev1');
      expect(mockRedis.del).toHaveBeenCalledWith('books:slug:awesome-book');
    });
  });

  describe('deleteReview', () => {
    it('should throw ForbiddenError if user is not author and not admin', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev1',
        userId: 'other-user',
        book: { slug: 'book-slug' },
      });

      await expect(
        service.deleteReview('rev1', { id: 'user1', role: 'USER' })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow deletion if user is ADMIN', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev1',
        userId: 'other-user',
        book: { slug: 'book-slug' },
      });
      mockPrisma.review.delete.mockResolvedValue({ id: 'rev1' });

      const res = await service.deleteReview('rev1', { id: 'admin1', role: 'ADMIN' });
      expect(res.id).toBe('rev1');
    });
  });
});
