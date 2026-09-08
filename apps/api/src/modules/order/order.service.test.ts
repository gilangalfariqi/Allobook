import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  book: {
    findMany: vi.fn(),
  },
  order: {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findAll: vi.fn(),
    updateStatus: vi.fn(),
  },
  storeSettings: {
    findUnique: vi.fn(),
  },
};

const mockServer = {
  prisma: mockPrisma,
} as any;

import { OrderService } from './order.service';
import { BadRequestError, NotFoundError } from '../../lib/errors';
import { OrderStatus } from '@allobook/shared-types';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrderService(mockServer);
  });

  describe('createOrder', () => {
    it('should throw BadRequestError if one of books is not found', async () => {
      mockPrisma.book.findMany.mockResolvedValue([]);

      await expect(
        service.createOrder({
          customerName: 'Budi',
          customerPhone: '628123456789',
          shippingAddress: {
            address: 'Jl. Merdeka No. 1',
            city: 'Jakarta',
            state: 'DKI',
            postcode: '10110',
          },
          items: [{ bookId: 'b1', quantity: 2 }],
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should create order and generate WhatsApp URL', async () => {
      mockPrisma.book.findMany.mockResolvedValue([
        { id: 'b1', title: 'Buku A', price: 50000 },
      ]);
      mockPrisma.storeSettings.findUnique.mockResolvedValue({
        key: 'whatsapp_number',
        value: '628111111111',
      });
      mockPrisma.order.create.mockResolvedValue({
        id: 'ord-123',
        customerName: 'Budi',
        customerPhone: '628123456789',
        totalAmount: 100000,
        status: OrderStatus.PENDING,
        items: [
          {
            bookId: 'b1',
            quantity: 2,
            priceAtOrder: 50000,
            book: { title: 'Buku A' },
          },
        ],
      });

      const result = await service.createOrder({
        customerName: 'Budi',
        customerPhone: '628123456789',
        shippingAddress: {
          address: 'Jl. Merdeka No. 1',
          city: 'Jakarta',
          state: 'DKI',
          postcode: '10110',
        },
        items: [{ bookId: 'b1', quantity: 2 }],
      });

      expect(result.order.id).toBe('ord-123');
      expect(result.whatsappUrl).toContain('https://wa.me/628111111111');
      expect(result.whatsappUrl).toContain('ord-123');
    });
  });
});
