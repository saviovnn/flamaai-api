import { Controller, Post, Body } from '@nestjs/common';
import {
  OrchestratorService,
  type OrchestratorSearchResponse,
  type OrchestratorSingleResponse,
} from './orchestrator.service';
import type {
  OrchestratorDto,
  OrchestratorAllDto,
  OrchestratorSingleDto,
} from './dto';
import {
  orchestratorSchema,
  orchestratorAllSchema,
  orchestratorSingleSchema,
} from './dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('api/orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('search')
  async search(
    @Body(new ZodValidationPipe(orchestratorSchema)) body: OrchestratorDto,
  ): Promise<OrchestratorSearchResponse> {
    return await this.orchestratorService.search(
      body.query,
      body.user_id,
      body.preference,
    );
  }

  @Post('all')
  async getAll(
    @Body(new ZodValidationPipe(orchestratorAllSchema))
    body: OrchestratorAllDto,
  ): Promise<
    { id: string; name: string; risk_level: string; created_at: Date }[]
  > {
    return await this.orchestratorService.getAll(body.user_id);
  }

  @Post('single')
  async getSingle(
    @Body(new ZodValidationPipe(orchestratorSingleSchema))
    body: OrchestratorSingleDto,
  ): Promise<OrchestratorSingleResponse> {
    return await this.orchestratorService.getSingle(String(body.location_id));
  }
}
