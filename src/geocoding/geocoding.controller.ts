import { Controller, Post, Body } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import type { SearchDto } from './dto';
import { searchSchema } from './dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { GeocodingResult } from './geocoding.service';

@Controller('api/geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Post('search')
  async search(
    @Body(new ZodValidationPipe(searchSchema)) body: SearchDto,
  ): Promise<GeocodingResult> {
    return await this.geocodingService.search(
      body.query,
      body.userId,
      body.preference,
    );
  }
}
