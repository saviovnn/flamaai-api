import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import type { location as Location } from '../db/schema';
interface WeatherResponseFuture {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    temperature_2m_mean: string;
    relative_humidity_2m_mean: string;
    precipitation_sum: string;
    rain_sum: string;
    windspeed_10m_max: string;
    windgusts_10m_max: string;
    et0_fao_evapotranspiration: string;
    uv_index_max: string;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    relative_humidity_2m_mean: number[];
    precipitation_sum: number[];
    rain_sum: number[];
    windspeed_10m_max: number[];
    windgusts_10m_max: number[];
    et0_fao_evapotranspiration: number[];
    uv_index_max: number[];
  };
}

interface WeatherResponsePast {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    temperature_2m_mean: string;
    relative_humidity_2m_mean: string;
    precipitation_sum: string;
    windspeed_10m_max: string;
    windgusts_10m_max: string;
    et0_fao_evapotranspiration: string;
    uv_index_max: string;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    relative_humidity_2m_mean: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
    windgusts_10m_max: number[];
    et0_fao_evapotranspiration: number[];
    uv_index_max: (number | null)[];
  };
}

interface AirResponseAPI {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    pm10: string;
    pm2_5: string;
    carbon_monoxide: string;
    nitrogen_dioxide: string;
    sulphur_dioxide: string;
    ozone: string;
    aerosol_optical_depth: string;
    dust: string;
  };
  hourly: {
    time: string[];
    pm10: (number | null)[];
    pm2_5: (number | null)[];
    carbon_monoxide: (number | null)[];
    nitrogen_dioxide: (number | null)[];
    sulphur_dioxide: (number | null)[];
    ozone: (number | null)[];
    aerosol_optical_depth: (number | null)[];
    dust: (number | null)[];
  };
}

interface AirResponseFuture {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    pm10: string;
    pm2_5: string;
    carbon_monoxide: string;
    nitrogen_dioxide: string;
    sulphur_dioxide: string;
    ozone: string;
    aerosol_optical_depth: string;
    dust: string;
  };
  daily: {
    time: string[];
    pm10: (number | null)[];
    pm2_5: (number | null)[];
    carbon_monoxide: (number | null)[];
    nitrogen_dioxide: (number | null)[];
    sulphur_dioxide: (number | null)[];
    ozone: (number | null)[];
    aerosol_optical_depth: (number | null)[];
    dust: (number | null)[];
  };
}

interface AirResponsePast {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    pm10: string;
    pm2_5: string;
    carbon_monoxide: string;
    nitrogen_dioxide: string;
    sulphur_dioxide: string;
    ozone: string;
    aerosol_optical_depth: string;
    dust: string;
  };
  daily: {
    time: string[];
    pm10: (number | null)[];
    pm2_5: (number | null)[];
    carbon_monoxide: (number | null)[];
    nitrogen_dioxide: (number | null)[];
    sulphur_dioxide: (number | null)[];
    ozone: (number | null)[];
    aerosol_optical_depth: (number | null)[];
    dust: (number | null)[];
  };
}
export interface WeatherResponseWithFuture {
  weatherFuture_7d?: WeatherResponseFuture[];
  weatherPast_7d?: WeatherResponsePast[];
  airFuture_7d?: AirResponseFuture[];
  airPast_7d?: AirResponsePast[];
}
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getWeatherByCoordinates(
    lat: number,
    lng: number,
    type: 'weather' | 'air' | 'all',
    location_id: string,
  ): Promise<WeatherResponseWithFuture> {
    try {
      if (type === 'weather') {
        const weatherFuture = await this.getWeatherFuture(lat, lng);
        const weatherPast = await this.getWeatherPast(lat, lng);

        return {
          weatherFuture_7d: [weatherFuture],
          weatherPast_7d: [weatherPast],
        };
      } else if (type === 'air') {
        const airPast = await this.getAirPast(lat, lng);
        const airFuture = await this.getAirFuture(lat, lng);

        // Processar dados de qualidade do ar de horário para diário
        const airPastProcessed =
          this.processAirToDailyAverage<AirResponsePast>(airPast);
        const airFutureProcessed =
          this.processAirToDailyAverage<AirResponseFuture>(airFuture);

        return {
          airFuture_7d: [airFutureProcessed],
          airPast_7d: [airPastProcessed],
        };
      } else if (type === 'all') {
        const weatherFuture = await this.getWeatherFuture(lat, lng);
        const weatherPast = await this.getWeatherPast(lat, lng);
        const airPast = await this.getAirPast(lat, lng);
        const airFuture = await this.getAirFuture(lat, lng);

        // Processar dados de qualidade do ar de horário para diário
        const airPastProcessed =
          this.processAirToDailyAverage<AirResponsePast>(airPast);
        const airFutureProcessed =
          this.processAirToDailyAverage<AirResponseFuture>(airFuture);

        await this.saveWeatherData(
          weatherFuture,
          weatherPast,
          airFutureProcessed,
          airPastProcessed,
          location_id,
        );

        return {
          weatherFuture_7d: [weatherFuture],
          weatherPast_7d: [weatherPast],
          airFuture_7d: [airFutureProcessed],
          airPast_7d: [airPastProcessed],
        };
      } else {
        throw new Error('Tipo de dados inválido');
      }
    } catch (error) {
      this.logger.error(error);
      throw new Error('Erro ao buscar dados meteorológicos');
    }
  }

  async getWeatherByLocationId(
    location_id: string,
  ): Promise<WeatherResponseWithFuture> {
    try {
      const location = await this.db
        .select()
        .from(schema.location)
        .where(eq(schema.location.id, location_id))
        .limit(1);
      if (!location) {
        throw new Error('Localização não encontrada');
      }
      const weatherFuture = await this.getWeatherFuture(
        Number(location[0].lat),
        Number(location[0].lng),
      );
      const weatherPast = await this.getWeatherPast(
        Number(location[0].lat),
        Number(location[0].lng),
      );
      const airPast = await this.getAirPast(
        Number(location[0].lat),
        Number(location[0].lng),
      );
      const airFuture = await this.getAirFuture(
        Number(location[0].lat),
        Number(location[0].lng),
      );

      // Processar dados de qualidade do ar de horário para diário
      const airPastProcessed =
        this.processAirToDailyAverage<AirResponsePast>(airPast);
      const airFutureProcessed =
        this.processAirToDailyAverage<AirResponseFuture>(airFuture);

      await this.saveWeatherData(
        weatherFuture,
        weatherPast,
        airFutureProcessed,
        airPastProcessed,
        location_id,
      );

      return {
        weatherFuture_7d: [weatherFuture],
        weatherPast_7d: [weatherPast],
        airFuture_7d: [airFutureProcessed],
        airPast_7d: [airPastProcessed],
      };
    } catch (error) {
      this.logger.error(error);
      throw new Error('Erro ao buscar dados meteorológicos');
    }
  }

  private async saveWeatherData(
    weatherFuture: WeatherResponseFuture,
    weatherPast: WeatherResponsePast,
    airFuture: AirResponseFuture,
    airPast: AirResponsePast,
    location_id: string,
  ): Promise<void> {
    // Deletar dados existentes para esta localização para evitar duplicatas
    await this.db
      .delete(schema.weatherData)
      .where(eq(schema.weatherData.location_id, location_id));

    const futureWeatherData: Record<string, string | number | null>[] = [];
    const pastWeatherData: Record<string, string | number | null>[] = [];

    // Combinar dados futuros: clima + qualidade do ar por dia
    for (let index = 0; index < weatherFuture.daily.time.length; index++) {
      const dayData: Record<string, string | number | null> = {
        time: weatherFuture.daily.time[index],
        temperature_2m_max: weatherFuture.daily.temperature_2m_max[index],
        temperature_2m_min: weatherFuture.daily.temperature_2m_min[index],
        temperature_2m_mean: weatherFuture.daily.temperature_2m_mean[index],
        relative_humidity_2m_mean:
          weatherFuture.daily.relative_humidity_2m_mean[index],
        precipitation_sum: weatherFuture.daily.precipitation_sum[index],
        rain_sum: weatherFuture.daily.rain_sum[index],
        windspeed_10m_max: weatherFuture.daily.windspeed_10m_max[index],
        windgusts_10m_max: weatherFuture.daily.windgusts_10m_max[index],
        et0_fao_evapotranspiration:
          weatherFuture.daily.et0_fao_evapotranspiration[index],
        uv_index_max: weatherFuture.daily.uv_index_max[index],
      };

      // Adicionar dados de qualidade do ar do mesmo dia (mesmo índice)
      if (index < airFuture.daily.time.length) {
        dayData.pm10 = airFuture.daily.pm10[index];
        dayData.pm2_5 = airFuture.daily.pm2_5[index];
        dayData.carbon_monoxide = airFuture.daily.carbon_monoxide[index];
        dayData.nitrogen_dioxide = airFuture.daily.nitrogen_dioxide[index];
        dayData.sulphur_dioxide = airFuture.daily.sulphur_dioxide[index];
        dayData.ozone = airFuture.daily.ozone[index];
        dayData.aerosol_optical_depth =
          airFuture.daily.aerosol_optical_depth[index];
        dayData.dust = airFuture.daily.dust[index];
      }

      futureWeatherData.push(dayData);
    }

    // Combinar dados passados: clima + qualidade do ar por dia
    for (let index = 0; index < weatherPast.daily.time.length; index++) {
      const dayData: Record<string, string | number | null> = {
        time: weatherPast.daily.time[index],
        temperature_2m_max: weatherPast.daily.temperature_2m_max[index],
        temperature_2m_min: weatherPast.daily.temperature_2m_min[index],
        temperature_2m_mean: weatherPast.daily.temperature_2m_mean[index],
        relative_humidity_2m_mean:
          weatherPast.daily.relative_humidity_2m_mean[index],
        precipitation_sum: weatherPast.daily.precipitation_sum[index],
        windspeed_10m_max: weatherPast.daily.windspeed_10m_max[index],
        windgusts_10m_max: weatherPast.daily.windgusts_10m_max[index],
        et0_fao_evapotranspiration:
          weatherPast.daily.et0_fao_evapotranspiration[index],
        uv_index_max: weatherPast.daily.uv_index_max[index],
      };

      // Adicionar dados de qualidade do ar do mesmo dia (mesmo índice)
      if (index < airPast.daily.time.length) {
        dayData.pm10 = airPast.daily.pm10[index];
        dayData.pm2_5 = airPast.daily.pm2_5[index];
        dayData.carbon_monoxide = airPast.daily.carbon_monoxide[index];
        dayData.nitrogen_dioxide = airPast.daily.nitrogen_dioxide[index];
        dayData.sulphur_dioxide = airPast.daily.sulphur_dioxide[index];
        dayData.ozone = airPast.daily.ozone[index];
        dayData.aerosol_optical_depth =
          airPast.daily.aerosol_optical_depth[index];
        dayData.dust = airPast.daily.dust[index];
      }

      pastWeatherData.push(dayData);
    }

    // Helper function para garantir que valores numéricos não sejam null/undefined
    const ensureNumber = (
      value: string | number | null | undefined,
      defaultValue: number = 0,
    ): number => {
      if (value === null || value === undefined) return defaultValue;
      return typeof value === 'number' ? value : Number(value) || defaultValue;
    };

    // Criar um Set com as datas do future para evitar duplicatas
    const futureDates = new Set(
      futureWeatherData.map((item) => item.time as string),
    );

    // Salvar dados futuros
    for (const item of futureWeatherData) {
      await this.db.insert(schema.weatherData).values({
        id: crypto.randomUUID(),
        location_id: location_id,
        time: new Date(item.time as string),
        temperature_2m_max: ensureNumber(item.temperature_2m_max),
        temperature_2m_min: ensureNumber(item.temperature_2m_min),
        temperature_2m_mean: ensureNumber(item.temperature_2m_mean),
        relative_humidity_2m_mean: ensureNumber(item.relative_humidity_2m_mean),
        precipitation_sum: ensureNumber(item.precipitation_sum),
        rain_sum: ensureNumber(item.rain_sum),
        windspeed_10m_max: ensureNumber(item.windspeed_10m_max),
        windgusts_10m_max: ensureNumber(item.windgusts_10m_max),
        et0_fao_evapotranspiration: ensureNumber(
          item.et0_fao_evapotranspiration,
        ),
        uv_index_max: ensureNumber(item.uv_index_max),
        pm10: ensureNumber(item.pm10),
        pm2_5: ensureNumber(item.pm2_5),
        carbon_monoxide: ensureNumber(item.carbon_monoxide),
        nitrogen_dioxide: ensureNumber(item.nitrogen_dioxide),
        sulphur_dioxide: ensureNumber(item.sulphur_dioxide),
        ozone: ensureNumber(item.ozone),
        aerosol_optical_depth: ensureNumber(item.aerosol_optical_depth),
        dust: ensureNumber(item.dust),
      });
    }

    // Salvar apenas dados passados que não estão no future (evitar duplicatas)
    for (const item of pastWeatherData) {
      // Pular se a data já existe no future
      if (futureDates.has(item.time as string)) {
        continue;
      }

      await this.db.insert(schema.weatherData).values({
        id: crypto.randomUUID(),
        location_id: location_id,
        time: new Date(item.time as string),
        temperature_2m_max: ensureNumber(item.temperature_2m_max),
        temperature_2m_min: ensureNumber(item.temperature_2m_min),
        temperature_2m_mean: ensureNumber(item.temperature_2m_mean),
        relative_humidity_2m_mean: ensureNumber(item.relative_humidity_2m_mean),
        precipitation_sum: ensureNumber(item.precipitation_sum),
        rain_sum: ensureNumber(item.rain_sum),
        windspeed_10m_max: ensureNumber(item.windspeed_10m_max),
        windgusts_10m_max: ensureNumber(item.windgusts_10m_max),
        et0_fao_evapotranspiration: ensureNumber(
          item.et0_fao_evapotranspiration,
        ),
        uv_index_max: ensureNumber(item.uv_index_max),
        pm10: ensureNumber(item.pm10),
        pm2_5: ensureNumber(item.pm2_5),
        carbon_monoxide: ensureNumber(item.carbon_monoxide),
        nitrogen_dioxide: ensureNumber(item.nitrogen_dioxide),
        sulphur_dioxide: ensureNumber(item.sulphur_dioxide),
        ozone: ensureNumber(item.ozone),
        aerosol_optical_depth: ensureNumber(item.aerosol_optical_depth),
        dust: ensureNumber(item.dust),
      });
    }
  }

  private processAirToDailyAverage<
    T extends AirResponsePast | AirResponseFuture,
  >(data: AirResponseAPI): T {
    // Agrupar dados por dia
    const dailyData = new Map<
      string,
      {
        pm10: (number | null)[];
        pm2_5: (number | null)[];
        carbon_monoxide: (number | null)[];
        nitrogen_dioxide: (number | null)[];
        sulphur_dioxide: (number | null)[];
        ozone: (number | null)[];
        aerosol_optical_depth: (number | null)[];
        dust: (number | null)[];
      }
    >();

    data.hourly.time.forEach((timeStr, index) => {
      const date = timeStr.split('T')[0]; // Extrai apenas a data (YYYY-MM-DD)

      if (!dailyData.has(date)) {
        dailyData.set(date, {
          pm10: [],
          pm2_5: [],
          carbon_monoxide: [],
          nitrogen_dioxide: [],
          sulphur_dioxide: [],
          ozone: [],
          aerosol_optical_depth: [],
          dust: [],
        });
      }

      const dayData = dailyData.get(date)!;
      dayData.pm10.push(data.hourly.pm10[index]);
      dayData.pm2_5.push(data.hourly.pm2_5[index]);
      dayData.carbon_monoxide.push(data.hourly.carbon_monoxide[index]);
      dayData.nitrogen_dioxide.push(data.hourly.nitrogen_dioxide[index]);
      dayData.sulphur_dioxide.push(data.hourly.sulphur_dioxide[index]);
      dayData.ozone.push(data.hourly.ozone[index]);
      dayData.aerosol_optical_depth.push(
        data.hourly.aerosol_optical_depth[index],
      );
      dayData.dust.push(data.hourly.dust[index]);
    });

    // Calcular médias
    const dates: string[] = [];
    const avgPm10: (number | null)[] = [];
    const avgPm2_5: (number | null)[] = [];
    const avgCarbonMonoxide: (number | null)[] = [];
    const avgNitrogenDioxide: (number | null)[] = [];
    const avgSulphurDioxide: (number | null)[] = [];
    const avgOzone: (number | null)[] = [];
    const avgAerosolOpticalDepth: (number | null)[] = [];
    const avgDust: (number | null)[] = [];

    dailyData.forEach((values, date) => {
      dates.push(date);
      avgPm10.push(this.calculateAverage(values.pm10));
      avgPm2_5.push(this.calculateAverage(values.pm2_5));
      avgCarbonMonoxide.push(this.calculateAverage(values.carbon_monoxide));
      avgNitrogenDioxide.push(this.calculateAverage(values.nitrogen_dioxide));
      avgSulphurDioxide.push(this.calculateAverage(values.sulphur_dioxide));
      avgOzone.push(this.calculateAverage(values.ozone));
      avgAerosolOpticalDepth.push(
        this.calculateAverage(values.aerosol_optical_depth),
      );
      avgDust.push(this.calculateAverage(values.dust));
    });

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      generationtime_ms: data.generationtime_ms,
      utc_offset_seconds: data.utc_offset_seconds,
      timezone: data.timezone,
      timezone_abbreviation: data.timezone_abbreviation,
      elevation: data.elevation,
      daily_units: data.hourly_units,
      daily: {
        time: dates,
        pm10: avgPm10,
        pm2_5: avgPm2_5,
        carbon_monoxide: avgCarbonMonoxide,
        nitrogen_dioxide: avgNitrogenDioxide,
        sulphur_dioxide: avgSulphurDioxide,
        ozone: avgOzone,
        aerosol_optical_depth: avgAerosolOpticalDepth,
        dust: avgDust,
      },
    } as T;
  }

  private calculateAverage(values: (number | null)[]): number | null {
    const validValues = values.filter(
      (v): v is number => v !== null && !isNaN(v),
    );
    if (validValues.length === 0) return null;
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / validValues.length) * 100) / 100; // Arredonda para 2 casas decimais
  }

  private async getWeatherFuture(
    lat: number,
    lng: number,
  ): Promise<WeatherResponseFuture> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum,rain_sum,windspeed_10m_max,windgusts_10m_max,et0_fao_evapotranspiration,uv_index_max&forecast_days=7&timezone=America/Sao_Paulo`;
    const response = await axios.get<WeatherResponseFuture>(url);
    return response.data;
  }

  private async getWeatherPast(
    lat: number,
    lng: number,
  ): Promise<WeatherResponsePast> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum,rain_sum,windspeed_10m_max,windgusts_10m_max,et0_fao_evapotranspiration,uv_index_max&start_date=${this.startDate}&end_date=${this.endDate}&timezone=America/Sao_Paulo`;
    const response = await axios.get<WeatherResponsePast>(url);
    return response.data;
  }

  private async getAirPast(lat: number, lng: number): Promise<AirResponseAPI> {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust&start_date=${this.startDate}&end_date=${this.endDate}&timezone=America%2FSao_Paulo`;
    const response = await axios.get<AirResponseAPI>(url);
    return response.data;
  }

  private async getAirFuture(
    lat: number,
    lng: number,
  ): Promise<AirResponseAPI> {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust&forecast_days=7&timezone=America%2FSao_Paulo`;
    const response = await axios.get<AirResponseAPI>(url);
    return response.data;
  }

  private pad = (n: number) => n.toString().padStart(2, '0');

  private formatDate = (date: Date) =>
    `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`;

  private startDate = this.formatDate(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );

  private endDate = this.formatDate(new Date());
}
