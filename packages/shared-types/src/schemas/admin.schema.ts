import { z } from 'zod';

export const UpdateStoreSettingsSchema = z.object({
  whatsapp_number: z.string().min(8).regex(/^\+?[1-9]\d{1,14}$/, 'Invalid WhatsApp number format (e.g. 628123456789)'),
  store_name: z.string().optional(),
  support_email: z.string().email().optional(),
});

export const StoreSettingsSchema = z.record(z.string(), z.string());

export const DashboardStatsSchema = z.object({
  totalBooks: z.number().int().nonnegative(),
  totalOrders: z.number().int().nonnegative(),
  totalUsers: z.number().int().nonnegative(),
  totalRevenue: z.number().nonnegative(),
  ordersByStatus: z.record(z.string(), z.number().int().nonnegative()),
});

export type UpdateStoreSettingsInput = z.infer<typeof UpdateStoreSettingsSchema>;
export type StoreSettings = z.infer<typeof StoreSettingsSchema>;
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
