import { z } from 'zod';

// Mensagens de erro personalizadas
const typeErrorMessage =
  'O campo "type" é obrigatório e deve ser: "weather" ou "air" ou "all"';
const latErrorMessage = 'O campo "lat" deve ser um número';
const lngErrorMessage = 'O campo "lng" deve ser um número';
const latRangeMessage = 'O campo "lat" deve estar entre -90 e 90';
const lngRangeMessage = 'O campo "lng" deve estar entre -180 e 180';
const locationIdErrorMessage = 'O campo "location_id" é obrigatório';

export const weatherSchema = z.object({
  type: z.enum(['weather', 'air', 'all'], { message: typeErrorMessage }),
  lat: z
    .number({ message: latErrorMessage })
    .min(-90, { message: latRangeMessage })
    .max(90, { message: latRangeMessage }),
  lng: z
    .number({ message: lngErrorMessage })
    .min(-180, { message: lngRangeMessage })
    .max(180, { message: lngRangeMessage }),
  location_id: z.string().min(1, { message: locationIdErrorMessage }),
});

export type WeatherDto = z.infer<typeof weatherSchema>;

export const locationIdSchema = z.object({
  location_id: z.string().min(1),
});

export type LocationIdDto = z.infer<typeof locationIdSchema>;
