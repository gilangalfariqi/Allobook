import { z } from 'zod';

export const RoleEnum = z.enum(['USER', 'ADMIN']);

export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  name: z.string().min(2),
  role: RoleEnum,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
