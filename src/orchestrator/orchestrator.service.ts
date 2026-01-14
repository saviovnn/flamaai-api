import {
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { GeocodingService } from '../geocoding/geocoding.service';
import { WeatherService } from '../weather/weather.service';
import { FireRiskService } from '../fire-risk/fire-risk.service';
import { MapService } from '../map/map.service';
import type {
  GeocodingResult,
  LocationResponse,
} from '../geocoding/geocoding.service';
import type { MapResponse } from '../map/map.service';
import type { WeatherResponse } from '../weather/weather.service';
import type { FireRiskResponse } from '../fire-risk/fire-risk.service';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface OrchestratorSearchResponse {
  geocoding_result: GeocodingResult;
  map_result: MapResponse;
  weather_result: WeatherResponse;
  fire_risk_result: FireRiskResponse;
}

export interface OrchestratorSingleResponse {
  geocoding_result: LocationResponse;
  map_result: MapResponse;
  weather_result: WeatherResponse;
  fire_risk_result: FireRiskResponse | null;
}
@Injectable()
export class OrchestratorService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly geocodingService: GeocodingService,
    private readonly weatherService: WeatherService,
    private readonly fireRiskService: FireRiskService,
    private readonly mapService: MapService,
  ) {}

  async search(
    query: string,
    user_id: string,
    preference: 'weather' | 'air',
  ): Promise<OrchestratorSearchResponse> {
    try {
      const geocoding = await this.geocodingService.search(
        query,
        user_id,
        preference,
      );

      const map = await this.mapService.getMapByIbgeId(
        geocoding.ibge_id as string,
      );

      const weather = await this.weatherService.getWeatherByLocationId(
        geocoding.location_id as string,
      );

      const fireRisk = await this.fireRiskService.getFireRisk(
        geocoding.location_id as string,
        new Date(),
        (() => {
          const today = new Date();
          return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        })(),
        weather.weather_data_ids,
        '1.0.0',
      );

      return {
        geocoding_result: geocoding,
        map_result: map,
        weather_result: weather,
        fire_risk_result: fireRisk,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro ao processar busca',
        error:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido ao processar a busca',
      });
    }
  }

  async getAll(
    user_id: string,
  ): Promise<
    { id: string; name: string; risk_level: string; created_at: Date }[]
  > {
    const data = await this.db
      .select({
        id: schema.location.id,
        name: schema.location.name,
        createdAt: schema.location.createdAt,
        riskLevel: schema.fireRisk.risk_level,
      })
      .from(schema.location)
      .leftJoin(
        schema.fireRisk,
        eq(schema.location.id, schema.fireRisk.locationId),
      )
      .where(eq(schema.location.userId, user_id))
      .orderBy(desc(schema.fireRisk.createdAt));

    const locationMap = new Map<
      string,
      { id: string; name: string; risk_level: string; created_at: Date }
    >();
    data.forEach((item) => {
      if (!locationMap.has(item.id)) {
        locationMap.set(item.id, {
          id: item.id,
          name: item.name,
          risk_level: item.riskLevel || 'N/A',
          created_at: item.createdAt,
        });
      }
    });

    return Array.from(locationMap.values());
  }

  async getSingle(location_id: string): Promise<OrchestratorSingleResponse> {
    try {
      const geocoding =
        await this.geocodingService.getDataByLocationId(location_id);

      const map = await this.mapService.getMapByIbgeId(geocoding.ibge_id);

      const weather =
        await this.weatherService.getDataWeatherByLocationId(location_id);

      // Busca os fire risks e pega apenas o mais recente
      const fireRiskArray =
        await this.fireRiskService.getFireRiskByWeatherDataIds(
          weather.weather_data_ids,
        );

      // Pega o primeiro (mais recente) fire risk, ou null se não houver
      const fireRisk: FireRiskResponse | null =
        fireRiskArray && fireRiskArray.length > 0
          ? {
              daily_risks: fireRiskArray[0].dailyRisks as {
                day: string;
                risk: number;
              }[],
              weekly_risk_mean: fireRiskArray[0].weekly_risk_mean,
              risk_level: fireRiskArray[0].risk_level,
              rag_explanation: fireRiskArray[0].rag_explanation,
            }
          : null;

      return {
        geocoding_result: geocoding,
        map_result: map,
        weather_result: weather,
        fire_risk_result: fireRisk,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro ao processar busca',
        error:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido ao processar a busca',
      });
    }
  }
}
