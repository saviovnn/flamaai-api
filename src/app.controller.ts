import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import type { Request } from 'express';
import type { BetterAuthUser } from './auth/auth.types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard)
  @Get()
  getProfile(@Req() req: Request): {
    message: string;
    user: BetterAuthUser | undefined;
  } {
    return { message: 'Você está logado!', user: req.user as BetterAuthUser };
  }
}
