import { FastifyInstance } from 'fastify';
import { ReviewRepository } from './review.repository';
import { CreateReviewInput } from '@allobook/shared-types';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

export class ReviewService {
  private repo: ReviewRepository;

  constructor(private server: FastifyInstance) {
    this.repo = new ReviewRepository(server.prisma);
  }

  async getReviewsByBookSlug(slug: string) {
    return this.repo.findByBookSlug(slug);
  }

  async createReview(userId: string, input: CreateReviewInput) {
    // Verify book exists
    const book = await this.server.prisma.book.findUnique({
      where: { id: input.bookId },
    });

    if (!book) {
      throw new NotFoundError(`Book not found with id: ${input.bookId}`);
    }

    const review = await this.repo.create({ ...input, userId });

    // Invalidate book cache so new review and updated rating average reflect immediately
    if (this.server.redis) {
      try {
        await this.server.redis.del(`books:slug:${book.slug}`);
        const listKeys = await this.server.redis.keys('books:list:*');
        if (listKeys.length > 0) {
          await this.server.redis.del(...listKeys);
        }
      } catch {
        // Non-blocking cache error
      }
    }

    // Invalidate review summary cache so the next request refreshes it
    await this.server.prisma.book
      .update({
        where: { id: input.bookId },
        data: { reviewSummaryUpdatedAt: null },
      })
      .catch(() => {});

    return review;
  }

  async deleteReview(id: string, user: { id: string; role: string }) {
    const review = await this.repo.findById(id);
    if (!review) {
      throw new NotFoundError(`Review not found with id: ${id}`);
    }

    if (review.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenError('You can only delete your own reviews');
    }

    const deleted = await this.repo.delete(id);

    // Invalidate book cache
    if (this.server.redis && review.book?.slug) {
      try {
        await this.server.redis.del(`books:slug:${review.book.slug}`);
      } catch {
        // Non-blocking
      }
    }

    return deleted;
  }
}
