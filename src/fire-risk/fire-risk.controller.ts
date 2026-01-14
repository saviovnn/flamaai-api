import { Controller, Post, Body } from '@nestjs/common';
import { FireRiskService } from './fire-risk.service';
import { fireRiskSchema, weatherDataIdsSchema } from './dto';
import type { FireRiskDto, WeatherDataIdsDto } from './dto';
import type { FireRiskResponse } from './fire-risk.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import * as schema from '../db/schema';

@Controller('api/fire-risk')
export class FireRiskController {
  constructor(private readonly fireRiskService: FireRiskService) {}

  @Post('get-fire-risk')
  async getFireRisk(
    @Body(new ZodValidationPipe(fireRiskSchema)) body: FireRiskDto,
  ): Promise<FireRiskResponse> {
    return await this.fireRiskService.getFireRisk(
      String(body.location_id),
      new Date(body.start_date),
      new Date(body.end_date),
      body.weather_data_ids,
      String(body.model_version),
    );
  }

  @Post('get-fire-risk-by-weather-data-ids')
  async getFireRiskByWeatherDataIds(
    @Body(new ZodValidationPipe(weatherDataIdsSchema)) body: WeatherDataIdsDto,
  ): Promise<(typeof schema.fireRisk.$inferSelect)[]> {
    return await this.fireRiskService.getFireRiskByWeatherDataIds(
      body.weather_data_ids,
    );
  }
}
