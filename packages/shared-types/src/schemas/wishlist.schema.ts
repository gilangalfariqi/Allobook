import { z } from 'zod';

export const WishlistSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  bookId: z.string().cuid(),
  createdAt: z.date(),
});

export type Wishlist = z.infer<typeof WishlistSchema>;
