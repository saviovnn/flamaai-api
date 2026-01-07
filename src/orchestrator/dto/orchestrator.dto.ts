import { z } from 'zod';

export const orchestratorSchema = z.object({
  query: z.string().min(1),
  userId: z.string().min(1),
  preference: z.enum(['weather', 'air']),
});

export type OrchestratorDto = z.infer<typeof orchestratorSchema>;
