import { z } from 'zod';

export const enrichBookSchema = z.object({
  title: z.string().min(1, 'Judul buku wajib diisi'),
  author: z.string().min(1, 'Nama penulis wajib diisi'),
});

export type EnrichBookInput = z.infer<typeof enrichBookSchema>;

export const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(20).default(6),
  minSimilarity: z.coerce.number().min(0).max(1).default(0.2),
});

export type RecommendationsQuery = z.infer<typeof recommendationsQuerySchema>;

export const orderNotifyWebhookSchema = z.object({
  orderId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  itemsSummary: z.string().optional(),
});

export type OrderNotifyWebhookInput = z.infer<typeof orderNotifyWebhookSchema>;

export const importSuggestionItemSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().optional(),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  price: z.number().optional().default(95000),
  categories: z.array(z.string()).optional().default([]),
});

export const importSuggestionsSchema = z.object({
  books: z.array(importSuggestionItemSchema),
});

export type ImportSuggestionsInput = z.infer<typeof importSuggestionsSchema>;

export const chatHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Pesan tidak boleh kosong').max(1000, 'Pesan maksimal 1000 karakter'),
  history: z.array(chatHistoryItemSchema).max(10).optional().default([]),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
