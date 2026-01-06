import { Module } from '@nestjs/common';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { WeatherModule } from '../weather/weather.module';
import { FireRiskModule } from '../fire-risk/fire-risk.module';
import { MapModule } from '../map/map.module';
@Module({
  imports: [GeocodingModule, WeatherModule, FireRiskModule, MapModule],
  controllers: [OrchestratorController],
  providers: [OrchestratorService],
})
export class OrchestratorModule {}
