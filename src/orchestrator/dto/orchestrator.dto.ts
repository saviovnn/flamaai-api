import { z } from 'zod';

export const orchestratorSchema = z.object({
  query: z.string().min(1),
  userId: z.string().min(1),
  preference: z.enum(['weather', 'air']),
});

export const orchestratorAllSchema = z.object({
  userId: z.string().min(1),
});

export const orchestratorSingleSchema = z.object({
  locationId: z.string().min(1),
});

export type OrchestratorDto = z.infer<typeof orchestratorSchema>;
export type OrchestratorAllDto = z.infer<typeof orchestratorAllSchema>;
export type OrchestratorSingleDto = z.infer<typeof orchestratorSingleSchema>;
