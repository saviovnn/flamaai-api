import { z } from 'zod';

// Mensagens de erro
const ibgeIdErrorMessage = 'O campo "ibge_id" deve ser uma string';
const ibgeIdLengthMessage = 'O campo "ibge_id" deve ter 7 dígitos';

export const mapSchema = z.object({
  ibge_id: z
    .string({ message: ibgeIdErrorMessage })
    .min(7, { message: ibgeIdLengthMessage })
    .max(7, { message: ibgeIdLengthMessage }),
});

export type MapDto = z.infer<typeof mapSchema>;
