import { z } from 'zod';

export const searchSchema = z.object({
  query: z.string().min(1),
  userId: z.string().min(1),
});

export type SearchDto = z.infer<typeof searchSchema>;
