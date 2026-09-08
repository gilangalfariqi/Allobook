import { PrismaClient } from '@prisma/client';
import { CreateReviewInput } from '@allobook/shared-types';

export class ReviewRepository {
  constructor(private prisma: PrismaClient) {}

  async findByBookSlug(slug: string) {
    return this.prisma.review.findMany({
      where: {
        book: { slug },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.review.findUnique({
      where: { id },
      include: {
        book: {
          select: { id: true, slug: true },
        },
      },
    });
  }

  async create(data: CreateReviewInput & { userId: string }) {
    return this.prisma.review.create({
      data: {
        userId: data.userId,
        bookId: data.bookId,
        rating: data.rating,
        body: data.body,
        imageUrls: data.imageUrls ?? [],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.review.delete({
      where: { id },
    });
  }
}
