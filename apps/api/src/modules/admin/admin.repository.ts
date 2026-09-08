import { PrismaClient } from '@prisma/client';

export class AdminRepository {
  constructor(private prisma: PrismaClient) {}

  async getAllSettings(): Promise<Record<string, string>> {
    const settings = await this.prisma.storeSettings.findMany();
    const result: Record<string, string> = {};
    for (const item of settings) {
      result[item.key] = item.value;
    }
    return result;
  }

  async updateSettings(settings: Record<string, string>) {
    const updates = Object.entries(settings).map(([key, value]) =>
      this.prisma.storeSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );
    await this.prisma.$transaction(updates);
    return this.getAllSettings();
  }

  async getDashboardStats() {
    const [totalBooks, totalOrders, totalUsers, orders, revenueAgg] = await Promise.all([
      this.prisma.book.count(),
      this.prisma.order.count(),
      this.prisma.user.count(),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      }),
      this.prisma.order.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          status: { not: 'CANCELLED' },
        },
      }),
    ]);

    const ordersByStatus: Record<string, number> = {};
    orders.forEach((group) => {
      ordersByStatus[group.status] = group._count.id;
    });

    return {
      totalBooks,
      totalOrders,
      totalUsers,
      totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
      ordersByStatus,
    };
  }
}
