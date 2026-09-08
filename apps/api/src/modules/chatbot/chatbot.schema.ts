import { z } from 'zod';

export const CHAT_INTENTS = [
  'book_recommendation',
  'order_status',
  'store_faq',
  'general_parenting',
] as const;

export type ChatIntent = (typeof CHAT_INTENTS)[number];

export const chatMessageInputSchema = z.object({
  message: z.string().min(1, 'Pesan tidak boleh kosong').max(1000, 'Pesan maksimal 1000 karakter'),
  sessionId: z.string().min(1, 'Session ID wajib disertakan'),
  orderSessionToken: z.string().optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>;

export const verifyOrderInputSchema = z.object({
  orderIdOrPhone: z.string().min(3, 'Nomor pesanan atau nomor telepon wajib diisi'),
  customerPhone: z.string().min(8, 'Nomor WhatsApp wajib diisi (minimal 8 digit)'),
});

export type VerifyOrderInput = z.infer<typeof verifyOrderInputSchema>;

export const faqAdminCreateSchema = z.object({
  question: z.string().min(3, 'Pertanyaan minimal 3 karakter'),
  answer: z.string().min(5, 'Jawaban minimal 5 karakter'),
  category: z.enum(['checkout', 'shipping', 'return', 'general']).default('general'),
  isActive: z.boolean().optional().default(true),
});

export type FaqAdminCreateInput = z.infer<typeof faqAdminCreateSchema>;

export const faqAdminUpdateSchema = faqAdminCreateSchema.partial();

export type FaqAdminUpdateInput = z.infer<typeof faqAdminUpdateSchema>;
