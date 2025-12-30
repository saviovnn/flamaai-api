import { Controller, Post, Body } from '@nestjs/common';
import { FireRiskService } from './fire-risk.service';
import { fireRiskSchema } from './dto';
import type { FireRiskDto } from './dto';
import type { FireRiskResponse } from './fire-risk.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('api/fire-risk')
export class FireRiskController {
  constructor(private readonly fireRiskService: FireRiskService) {}

  @Post('get-fire-risk')
  async getFireRisk(
    @Body(new ZodValidationPipe(fireRiskSchema)) body: FireRiskDto,
  ): Promise<FireRiskResponse> {
    return await this.fireRiskService.getFireRisk(
      Number(body.lat),
      Number(body.lng),
      new Date(body.startDate),
      new Date(body.endDate),
      body.weatherDataIds,
      String(body.modelVersion),
    );
  }
}
