import { z } from 'zod';

// Mensagens de erro personalizadas
const latErrorMessage = 'O campo "lat" deve ser um número';
const lngErrorMessage = 'O campo "lng" deve ser um número';
const startDateErrorMessage = 'O campo "start_date" deve ser uma data';
const endDateErrorMessage = 'O campo "end_date" deve ser uma data';
const modelVersionErrorMessage = 'O campo "model_version" deve ser uma string';
const weatherDataIdsErrorMessage =
  'O campo "weather_data_ids" deve ser um array de strings';

export const fireRiskSchema = z.object({
  lat: z.number({ message: latErrorMessage }),
  lng: z.number({ message: lngErrorMessage }),
  startDate: z.coerce.date({ message: startDateErrorMessage }),
  endDate: z.coerce.date({ message: endDateErrorMessage }),
  weatherDataIds: z.array(z.string({ message: weatherDataIdsErrorMessage })),
  modelVersion: z.string({ message: modelVersionErrorMessage }),
});

export type FireRiskDto = z.infer<typeof fireRiskSchema>;
