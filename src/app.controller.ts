import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import type { Request } from 'express';
import type { BetterAuthUser } from './auth/auth.types';

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
