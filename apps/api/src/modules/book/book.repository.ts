import { PrismaClient, Prisma } from '@prisma/client';
import { CreateBookInput, UpdateBookInput, BookQuery } from '@allobook/shared-types';

export class BookRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(query: BookQuery) {
    const { page, limit, genre, author, sort, search, isPreOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookWhereInput = {};

    if (genre) {
      where.categories = {
        some: {
          category: {
            slug: genre,
          },
        },
      };
    }

    if (author) {
      where.author = { contains: author, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (typeof isPreOrder === 'boolean') {
      where.isPreOrder = isPreOrder;
    }

    let orderBy: Prisma.BookOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price-low') orderBy = { price: 'asc' };
    if (sort === 'price-high') orderBy = { price: 'desc' };
    if (sort === 'title') orderBy = { title: 'asc' };

    const [items, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      }),
      this.prisma.book.count({ where }),
    ]);

    const formattedItems = items.map((book) => {
      const ratingCount = book.reviews.length;
      const averageRating =
        ratingCount > 0
          ? Number((book.reviews.reduce((acc, r) => acc + r.rating, 0) / ratingCount).toFixed(1))
          : 0;

      return {
        ...book,
        price: Number(book.price),
        categories: book.categories.map((c) => c.category),
        averageRating,
        reviewCount: ratingCount,
      };
    });

    return {
      items: formattedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const book = await this.prisma.book.findUnique({
      where: { slug },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!book) return null;

    const ratingCount = book.reviews.length;
    const averageRating =
      ratingCount > 0
        ? Number((book.reviews.reduce((acc, r) => acc + r.rating, 0) / ratingCount).toFixed(1))
        : 0;

    return {
      ...book,
      price: Number(book.price),
      categories: book.categories.map((c) => c.category),
      averageRating,
      reviewCount: ratingCount,
    };
  }

  async findById(id: string) {
    return this.prisma.book.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async create(data: CreateBookInput & { slug: string }) {
    const { categoryIds, ...bookData } = data;

    return this.prisma.book.create({
      data: {
        ...bookData,
        price: new Prisma.Decimal(bookData.price),
        publishedAt: bookData.publishedAt ? new Date(bookData.publishedAt) : null,
        categories: categoryIds?.length
          ? {
              create: categoryIds.map((categoryId) => ({
                category: { connect: { id: categoryId } },
              })),
            }
          : undefined,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateBookInput) {
    const { categoryIds, ...bookData } = data;

    return this.prisma.book.update({
      where: { id },
      data: {
        ...bookData,
        price: bookData.price !== undefined ? new Prisma.Decimal(bookData.price) : undefined,
        publishedAt: bookData.publishedAt ? new Date(bookData.publishedAt) : undefined,
        categories: categoryIds
          ? {
              deleteMany: {},
              create: categoryIds.map((categoryId) => ({
                category: { connect: { id: categoryId } },
              })),
            }
          : undefined,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.book.delete({
      where: { id },
    });
  }
}
