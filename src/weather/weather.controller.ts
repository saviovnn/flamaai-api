import { Controller, Post, Body } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { weatherSchema } from './dto';
import type { WeatherDto } from './dto';
import type { WeatherResponseWithFuture } from './weather.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('api/weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Post('by-coordinates')
  async getWeatherByCoordinates(
    @Body(new ZodValidationPipe(weatherSchema)) body: WeatherDto,
  ): Promise<WeatherResponseWithFuture> {
    return await this.weatherService.getWeatherByCoordinates(
      Number(body.lat),
      Number(body.lng),
      body.type === 'weather' ? true : false,
    );
  }
}
