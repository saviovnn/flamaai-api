import { Controller, Post, Body } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { weatherSchema, locationIdSchema } from './dto';
import type { WeatherDto, LocationIdDto } from './dto';
import type { WeatherResponse } from './weather.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('api/weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Post('by-coordinates')
  async getWeatherByCoordinates(
    @Body(new ZodValidationPipe(weatherSchema)) body: WeatherDto,
  ): Promise<WeatherResponse> {
    return await this.weatherService.getWeatherByCoordinates(
      Number(body.lat),
      Number(body.lng),
      body.type,
      body.location_id,
    );
  }

  @Post('by-location-id')
  async getWeatherByLocationId(
    @Body(new ZodValidationPipe(locationIdSchema)) body: LocationIdDto,
  ): Promise<WeatherResponse> {
    return await this.weatherService.getWeatherByLocationId(
      String(body.location_id),
    );
  }

  @Post('data-by-location-id')
  async getDataWeatherByLocationId(
    @Body(new ZodValidationPipe(locationIdSchema)) body: LocationIdDto,
  ): Promise<WeatherResponse> {
    return await this.weatherService.getDataWeatherByLocationId(
      String(body.location_id),
    );
  }
}
