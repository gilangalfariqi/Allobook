import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  book: {
    findUnique: vi.fn(),
  },
  wishlist: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
  },
};

const mockServer = {
  prisma: mockPrisma,
} as any;

import { WishlistService } from './wishlist.service';
import { NotFoundError } from '../../lib/errors';

describe('WishlistService', () => {
  let service: WishlistService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WishlistService(mockServer);
  });

  describe('addToWishlist', () => {
    it('should throw NotFoundError if book does not exist', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(null);

      await expect(service.addToWishlist('u1', 'b999')).rejects.toThrow(NotFoundError);
    });

    it('should upsert wishlist item if book exists', async () => {
      mockPrisma.book.findUnique.mockResolvedValue({ id: 'b1' });
      mockPrisma.wishlist.upsert.mockResolvedValue({ id: 'w1', userId: 'u1', bookId: 'b1' });

      const res = await service.addToWishlist('u1', 'b1');
      expect(res.id).toBe('w1');
    });
  });

  describe('checkWishlist', () => {
    it('should return true if found', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue({ id: 'w1' });
      const res = await service.checkWishlist('u1', 'b1');
      expect(res.isWishlisted).toBe(true);
    });

    it('should return false if not found', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue(null);
      const res = await service.checkWishlist('u1', 'b1');
      expect(res.isWishlisted).toBe(false);
    });
  });
});
