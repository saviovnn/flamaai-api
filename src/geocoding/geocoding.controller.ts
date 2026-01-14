import { Controller, Post, Body } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import type { SearchDto } from './dto';
import {
  searchMunicipiosSchema,
  searchSchema,
  type SearchMunicipiosDto,
  LocationIdSchema,
  type LocationIdDto,
} from './dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type {
  GeocodingResult,
  SearchMunicipiosResult,
  LocationResponse,
} from './geocoding.service';

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

  @Post('search-municipios')
  async searchMunicipios(
    @Body(new ZodValidationPipe(searchMunicipiosSchema))
    body: SearchMunicipiosDto,
  ): Promise<SearchMunicipiosResult[]> {
    return await this.geocodingService.searchMunicipios(body.query);
  }

  @Post('data-by-location-id')
  async getDataByLocationId(
    @Body(new ZodValidationPipe(LocationIdSchema)) body: LocationIdDto,
  ): Promise<LocationResponse> {
    return await this.geocodingService.getDataByLocationId(
      String(body.location_id),
    );
  }
}
