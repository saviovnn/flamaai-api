import { Module } from '@nestjs/common';
import { FireRiskController } from './fire-risk.controller';
import { FireRiskService } from './fire-risk.service';

@Module({
  controllers: [FireRiskController],
  providers: [FireRiskService],
})
export class FireRiskModule {}
