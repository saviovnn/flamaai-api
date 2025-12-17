import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import axios from 'axios';

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
    soil_moisture_0_to_7cm_mean: string;
    soil_temperature_0_to_7cm_mean: string;
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
    soil_moisture_0_to_7cm_mean: (number | null)[];
    soil_temperature_0_to_7cm_mean: (number | null)[];
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
    type: boolean,
  ): Promise<WeatherResponseWithFuture> {
    try {
      if (type) {
        const weatherFuture = await this.getWeatherFuture(lat, lng);
        const weatherPast = await this.getWeatherPast(lat, lng);

        return {
          weatherFuture_7d: [weatherFuture],
          weatherPast_7d: [weatherPast],
        };
      } else {
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
      }
    } catch (error) {
      this.logger.error(error);
      throw new Error('Erro ao buscar dados meteorológicos');
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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum,rain_sum,windspeed_10m_max,windgusts_10m_max,soil_moisture_0_to_7cm_mean,soil_temperature_0_to_7cm_mean,et0_fao_evapotranspiration,uv_index_max&forecast_days=7&timezone=America/Sao_Paulo`;
    const response = await axios.get<WeatherResponseFuture>(url);
    return response.data;
  }

  private async getWeatherPast(
    lat: number,
    lng: number,
  ): Promise<WeatherResponsePast> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum,windspeed_10m_max,windgusts_10m_max,et0_fao_evapotranspiration,uv_index_max&start_date=${this.startDate}&end_date=${this.endDate}&timezone=America/Sao_Paulo`;
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
