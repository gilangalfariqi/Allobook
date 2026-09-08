import { PrismaClient } from '@prisma/client';

export class WishlistRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        book: {
          include: {
            categories: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => ({
      id: item.id,
      userId: item.userId,
      bookId: item.bookId,
      createdAt: item.createdAt,
      book: {
        ...item.book,
        price: Number(item.book.price),
        categories: item.book.categories.map((c) => c.category),
      },
    }));
  }

  async add(userId: string, bookId: string) {
    return this.prisma.wishlist.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      update: {},
      create: {
        userId,
        bookId,
      },
    });
  }

  async remove(userId: string, bookId: string) {
    return this.prisma.wishlist.deleteMany({
      where: {
        userId,
        bookId,
      },
    });
  }

  async check(userId: string, bookId: string): Promise<boolean> {
    const item = await this.prisma.wishlist.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });
    return !!item;
  }
}
