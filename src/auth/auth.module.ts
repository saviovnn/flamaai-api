import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GovBrService } from './govbr.service';

@Module({
  providers: [AuthService, GovBrService],
  controllers: [AuthController],
  exports: [AuthService, GovBrService],
})
export class AuthModule {}
