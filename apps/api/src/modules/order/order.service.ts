import { FastifyInstance } from 'fastify';
import { OrderRepository } from './order.repository';
import { CreateOrderInput, OrderStatus, ORDER_STATUS_LABELS } from '@allobook/shared-types';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { getEnv } from '../../config/env';

export class OrderService {
  private repo: OrderRepository;

  constructor(private server: FastifyInstance) {
    this.repo = new OrderRepository(server.prisma);
  }

  async createOrder(input: CreateOrderInput, userId?: string | null) {
    // 1. Fetch books to calculate price and ensure valid IDs
    const bookIds = input.items.map((i) => i.bookId);
    const books = await this.server.prisma.book.findMany({
      where: { id: { in: bookIds } },
    });

    if (books.length !== bookIds.length) {
      throw new BadRequestError('One or more books in the order do not exist');
    }

    const bookMap = new Map(books.map((b) => [b.id, b]));

    // 2. Prepare items and calculate total amount
    let totalAmount = 0;
    const orderItemsData = input.items.map((item) => {
      const book = bookMap.get(item.bookId)!;
      const priceAtOrder = Number(book.price);
      totalAmount += priceAtOrder * item.quantity;

      return {
        bookId: item.bookId,
        quantity: item.quantity,
        priceAtOrder,
      };
    });

    // 3. Create order in DB
    const order = await this.repo.create({
      userId: userId ?? null,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      shippingAddress: input.shippingAddress,
      totalAmount,
      items: orderItemsData,
    });

    // 4. Generate WhatsApp Concierge URL
    const whatsappUrl = await this.generateWhatsAppUrl(order);

    // 5. Trigger n8n Automation Webhook (non-blocking)
    this.triggerN8nOrderNotification(order);

    return {
      order,
      whatsappUrl,
    };
  }

  private triggerN8nOrderNotification(order: any) {
    const webhookUrl = getEnv().N8N_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl.trim() === '') return;

    setImmediate(async () => {
      try {
        const secret = getEnv().N8N_WEBHOOK_SECRET;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(secret ? { 'X-Webhook-Secret': secret } : {}),
          },
          body: JSON.stringify({
            orderId: order.id,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            totalAmount: Number(order.totalAmount),
            status: order.status,
          }),
        });
      } catch (err: any) {
        // Non-blocking n8n webhook notification
      }
    });
  }

  async getOrderById(id: string) {
    const order = await this.repo.findById(id);
    if (!order) {
      throw new NotFoundError(`Order not found with id: ${id}`);
    }
    const whatsappUrl = await this.generateWhatsAppUrl(order);
    return {
      ...order,
      statusLabel: ORDER_STATUS_LABELS[order.status as OrderStatus],
      whatsappUrl,
    };
  }

  async getUserOrders(userId: string) {
    const orders = await this.repo.findByUserId(userId);
    return orders.map((order) => ({
      ...order,
      statusLabel: ORDER_STATUS_LABELS[order.status as OrderStatus],
    }));
  }

  async getAllOrders(params: { status?: OrderStatus; page: number; limit: number }) {
    const result = await this.repo.findAll(params as any);
    return {
      ...result,
      items: result.items.map((order) => ({
        ...order,
        statusLabel: ORDER_STATUS_LABELS[order.status as OrderStatus],
      })),
    };
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    await this.getOrderById(id);
    const updated = await this.repo.updateStatus(id, status);
    return {
      ...updated,
      statusLabel: ORDER_STATUS_LABELS[updated.status as OrderStatus],
    };
  }

  private async generateWhatsAppUrl(order: any): Promise<string> {
    const env = getEnv();
    let whatsappNumber = env.WHATSAPP_NUMBER;

    // Check StoreSettings in DB
    try {
      const setting = await this.server.prisma.storeSettings.findUnique({
        where: { key: 'whatsapp_number' },
      });
      if (setting?.value) {
        whatsappNumber = setting.value;
      }
    } catch {
      // Fallback to env
    }

    // Clean phone number (strip '+', spaces, dashes)
    const cleanPhone = whatsappNumber.replace(/\D/g, '');

    const itemsSummary = order.items
      ?.map(
        (i: any) =>
          `• ${i.book?.title ?? 'Book'} x${i.quantity} (Rp ${Number(i.priceAtOrder).toLocaleString('id-ID')})`
      )
      .join('\n');

    const message = [
      `Halo AlloBook, saya ingin konfirmasi pre-order buku berikut:`,
      ``,
      `*Order ID:* ${order.id}`,
      `*Nama:* ${order.customerName}`,
      `*Telepon:* ${order.customerPhone}`,
      ``,
      `*Daftar Buku:*`,
      itemsSummary,
      ``,
      `*Total:* Rp ${Number(order.totalAmount).toLocaleString('id-ID')}`,
      ``,
      `Mohon informasikan ketersediaan dan detail instruksi pembayaran. Terima kasih!`,
    ].join('\n');

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
}
