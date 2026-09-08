import { FastifyInstance } from 'fastify';
import { WishlistRepository } from './wishlist.repository';
import { NotFoundError } from '../../lib/errors';

export class WishlistService {
  private repo: WishlistRepository;

  constructor(private server: FastifyInstance) {
    this.repo = new WishlistRepository(server.prisma);
  }

  async getUserWishlist(userId: string) {
    return this.repo.findByUserId(userId);
  }

  async addToWishlist(userId: string, bookId: string) {
    // Check book exists
    const book = await this.server.prisma.book.findUnique({
      where: { id: bookId },
    });
    if (!book) {
      throw new NotFoundError(`Book not found with id: ${bookId}`);
    }

    return this.repo.add(userId, bookId);
  }

  async removeFromWishlist(userId: string, bookId: string) {
    await this.repo.remove(userId, bookId);
    return { success: true };
  }

  async checkWishlist(userId: string, bookId: string) {
    const isWishlisted = await this.repo.check(userId, bookId);
    return { isWishlisted };
  }
}
