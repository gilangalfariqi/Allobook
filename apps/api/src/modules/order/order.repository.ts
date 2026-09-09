import { PrismaClient, Prisma } from '@prisma/client';
import { CreateOrderInput, OrderStatus } from '@allobook/shared-types';

export class OrderRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    userId?: string | null;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    shippingAddress: Prisma.InputJsonValue;
    totalAmount: number;
    items: Array<{ bookId: string; quantity: number; priceAtOrder: number }>;
  }) {
    return this.prisma.order.create({
      data: {
        userId: data.userId ?? null,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        shippingAddress: data.shippingAddress,
        totalAmount: data.totalAmount,
        status: OrderStatus.PENDING,
        items: {
          create: data.items.map((item) => ({
            bookId: item.bookId,
            quantity: item.quantity,
            priceAtOrder: item.priceAtOrder,
          })),
        },
      },
      include: {
        items: {
          include: {
            book: {
              select: {
                id: true,
                slug: true,
                title: true,
                author: true,
                coverUrl: true,
                price: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            book: {
              select: {
                id: true,
                slug: true,
                title: true,
                author: true,
                coverUrl: true,
                price: true,
              },
            },
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            book: {
              select: {
                id: true,
                slug: true,
                title: true,
                author: true,
                coverUrl: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(params: { status?: OrderStatus; page: number; limit: number }) {
    const { status, page, limit } = params;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              book: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  coverUrl: true,
                  price: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            book: true,
          },
        },
      },
    });
  }
}
