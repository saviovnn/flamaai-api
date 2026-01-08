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
import type { GeocodingResult } from '../geocoding/geocoding.service';
import type { MapResponse } from '../map/map.service';
import type { WeatherResponseWithFuture } from '../weather/weather.service';
import type { FireRiskResponse } from '../fire-risk/fire-risk.service';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface OrchestratorResult {
  success: boolean;
  geocodingResult: GeocodingResult;
  mapResult: MapResponse;
  weatherResult: WeatherResponseWithFuture;
  fireRiskResult: FireRiskResponse;
}

export interface OrchestratorAllResult {
  success: boolean;
  data: {
    id: string;
    name: string;
    risk_level: string;
    createdAt: Date;
  }[];
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
    userId: string,
    preference: 'weather' | 'air',
  ): Promise<OrchestratorResult> {
    try {
      const geocodingResult = await this.geocodingService.search(
        query,
        userId,
        preference,
      );

      const mapResult = await this.mapService.getMapByIbgeId(
        geocodingResult.ibge_id as string,
      );

      const weatherResult = await this.weatherService.getWeatherByLocationId(
        geocodingResult.location_id as string,
      );

      const fireRiskResult = await this.fireRiskService.getFireRisk(
        geocodingResult.location_id as string,
        new Date(),
        (() => {
          const today = new Date();
          return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        })(),
        weatherResult.weather_data_ids,
        '1.0.0',
      );
      return {
        success: true,
        geocodingResult: geocodingResult,
        mapResult: mapResult,
        weatherResult: weatherResult,
        fireRiskResult: fireRiskResult,
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

  async getAll(userId: string): Promise<OrchestratorAllResult> {
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
      .where(eq(schema.location.userId, userId))
      .orderBy(desc(schema.fireRisk.createdAt));

    const locationMap = new Map();
    data.forEach((item) => {
      if (!locationMap.has(item.id)) {
        locationMap.set(item.id, {
          id: item.id,
          name: item.name,
          risk_level: item.riskLevel || 'N/A',
          createdAt: item.createdAt,
        });
      }
    });

    return {
      success: true,
      data: Array.from(locationMap.values()),
    };
  }
}
