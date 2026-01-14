import { z } from 'zod';

// Mensagens de erro personalizadas
const locationIdErrorMessage = 'O campo "location_id" deve ser uma string';
const startDateErrorMessage = 'O campo "start_date" deve ser uma data';
const endDateErrorMessage = 'O campo "end_date" deve ser uma data';
const modelVersionErrorMessage = 'O campo "model_version" deve ser uma string';
const weatherDataIdsErrorMessage =
  'O campo "weather_data_ids" deve ser um array de strings';

export const fireRiskSchema = z.object({
  locationId: z.string({ message: locationIdErrorMessage }),
  startDate: z.coerce.date({ message: startDateErrorMessage }),
  endDate: z.coerce.date({ message: endDateErrorMessage }),
  weatherDataIds: z.array(z.string({ message: weatherDataIdsErrorMessage })),
  modelVersion: z.string({ message: modelVersionErrorMessage }),
});

export type FireRiskDto = z.infer<typeof fireRiskSchema>;

export const weatherDataIdsSchema = z.object({
  weatherDataIds: z.array(z.string({ message: weatherDataIdsErrorMessage })),
});

export type WeatherDataIdsDto = z.infer<typeof weatherDataIdsSchema>;
