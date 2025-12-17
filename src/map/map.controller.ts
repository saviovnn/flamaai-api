import { Controller, Post, Body } from '@nestjs/common';
import { MapService } from './map.service';
import { mapSchema } from './dto';
import type { MapDto } from './dto';
import type { MapResponse } from './map.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('api/map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Post('by-ibge-id')
  async getMapByIbgeId(
    @Body(new ZodValidationPipe(mapSchema)) body: MapDto,
  ): Promise<MapResponse> {
    return await this.mapService.getMapByIbgeId(body.ibge_id);
  }
}
