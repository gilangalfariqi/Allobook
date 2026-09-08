import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  genre: z.string().optional(),
  author: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
});

export const SearchSuggestSchema = z.object({
  q: z.string().min(2),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchSuggest = z.infer<typeof SearchSuggestSchema>;
