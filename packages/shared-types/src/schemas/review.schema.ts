import { z } from 'zod';

export const ReviewSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  bookId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(5),
  imageUrls: z.array(z.string().url()),
  createdAt: z.date(),
});

export const CreateReviewSchema = z.object({
  bookId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(5),
  imageUrls: z.array(z.string().url()).optional().default([]),
});

export type Review = z.infer<typeof ReviewSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
