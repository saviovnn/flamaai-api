import {
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
export interface OrchestratorResult {
  success: boolean;
  geocodingResult: GeocodingResult;
  mapResult: MapResponse;
  weatherResult: WeatherResponseWithFuture;
  fireRiskResult: FireRiskResponse;
}
@Injectable()
export class OrchestratorService {
  constructor(
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
}
