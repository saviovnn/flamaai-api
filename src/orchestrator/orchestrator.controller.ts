import { Controller, Post, Body } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import type { OrchestratorDto } from './dto';
import { orchestratorSchema } from './dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { OrchestratorResult } from './orchestrator.service';

@Controller('api/orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('search')
  async search(
    @Body(new ZodValidationPipe(orchestratorSchema)) body: OrchestratorDto,
  ): Promise<OrchestratorResult> {
    return await this.orchestratorService.search(body.query, body.userId);
  }
}
