import { Controller, Post, Body } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import type { OrchestratorDto, OrchestratorAllDto } from './dto';
import { orchestratorSchema, orchestratorAllSchema } from './dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type {
  OrchestratorAllResult,
  OrchestratorResult,
} from './orchestrator.service';

@Controller('api/orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('search')
  async search(
    @Body(new ZodValidationPipe(orchestratorSchema)) body: OrchestratorDto,
  ): Promise<OrchestratorResult> {
    return await this.orchestratorService.search(
      body.query,
      body.userId,
      body.preference,
    );
  }

  @Post('all')
  async getAll(
    @Body(new ZodValidationPipe(orchestratorAllSchema))
    body: OrchestratorAllDto,
  ): Promise<OrchestratorAllResult> {
    return await this.orchestratorService.getAll(body.userId);
  }
}
