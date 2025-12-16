import { Controller, Post, Body } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import { SearchDto } from './dto';

@Controller('api/geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Post('search')
  async search(@Body() body: SearchDto) {
    return await this.geocodingService.search(body.query);
  }
}
