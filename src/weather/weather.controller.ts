import { Controller, Post, Body } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { WeatherDto } from './dto';
import { WeatherResponseWithFuture } from './weather.service';

@Controller('api/weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Post('by-coordinates')
  async getWeatherByCoordinates(
    @Body() body: WeatherDto,
  ): Promise<WeatherResponseWithFuture> {
    return await this.weatherService.getWeatherByCoordinates(
      body.lat,
      body.lng,
    );
  }
}
