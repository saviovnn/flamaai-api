import { z } from 'zod';

export const searchSchema = z.object({
  query: z.string().min(1),
  userId: z.string().min(1),
  preference: z.enum(['weather', 'air']),
});

export const searchMunicipiosSchema = z.object({
  query: z.string().min(1),
});

export type SearchDto = z.infer<typeof searchSchema>;
export type SearchMunicipiosDto = z.infer<typeof searchMunicipiosSchema>;
