import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  slug: z.string(),
});

export const BookSchema = z.object({
  id: z.string().cuid(),
  slug: z.string(),
  title: z.string(),
  author: z.string(),
  isbn: z.string().nullable(),
  description: z.string(),
  coverUrl: z.string().url().nullable(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  isPreOrder: z.boolean(),
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().optional().nullable(),
  description: z.string().min(5),
  coverUrl: z.string().url().optional().nullable(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative().default(0),
  isPreOrder: z.boolean().default(false),
  categoryIds: z.array(z.string().cuid()).optional().default([]),
  publishedAt: z.string().datetime().optional().nullable(),
});

export const UpdateBookSchema = CreateBookSchema.partial();

export const BookQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
  genre: z.string().optional(),
  author: z.string().optional(),
  sort: z.enum(['newest', 'price-low', 'price-high', 'title']).default('newest'),
  search: z.string().optional(),
  isPreOrder: z.coerce.boolean().optional(),
});

export type Book = z.infer<typeof BookSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type CreateBookInput = z.infer<typeof CreateBookSchema>;
export type UpdateBookInput = z.infer<typeof UpdateBookSchema>;
export type BookQuery = z.infer<typeof BookQuerySchema>;
