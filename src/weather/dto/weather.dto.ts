import { z } from 'zod';

// Mensagens de erro personalizadas
const typeErrorMessage =
  'O campo "type" é obrigatório e deve ser: "weather" ou "air"';
const latErrorMessage = 'O campo "lat" deve ser um número';
const lngErrorMessage = 'O campo "lng" deve ser um número';
const latRangeMessage = 'O campo "lat" deve estar entre -90 e 90';
const lngRangeMessage = 'O campo "lng" deve estar entre -180 e 180';

export const weatherSchema = z.object({
  type: z.enum(['weather', 'air'], { message: typeErrorMessage }),
  lat: z
    .number({ message: latErrorMessage })
    .min(-90, { message: latRangeMessage })
    .max(90, { message: latRangeMessage }),
  lng: z
    .number({ message: lngErrorMessage })
    .min(-180, { message: lngRangeMessage })
    .max(180, { message: lngRangeMessage }),
});

export type WeatherDto = z.infer<typeof weatherSchema>;
