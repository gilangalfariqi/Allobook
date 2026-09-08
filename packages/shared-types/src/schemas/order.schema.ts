import { z } from 'zod';
import { OrderStatus } from '../constants/order-status';

export const ShippingAddressSchema = z.object({
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  postcode: z.string().min(4),
  notes: z.string().optional(),
});

export const CreateOrderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  customerEmail: z.string().email().optional(),
  shippingAddress: ShippingAddressSchema,
  items: z.array(z.object({
    bookId: z.string().cuid(),
    quantity: z.number().int().positive()
  })).min(1),
});

export const OrderSchema = CreateOrderSchema.extend({
  id: z.string().cuid(),
  userId: z.string().cuid().nullable(),
  status: z.nativeEnum(OrderStatus),
  totalAmount: z.number().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export const OrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(OrderStatus).optional(),
});

export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type OrderQuery = z.infer<typeof OrderQuerySchema>;
