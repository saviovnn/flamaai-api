import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: unknown;
  session: unknown;
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly authService: AuthService) {}
  @UseGuards(AuthGuard)
  @Get()
  getProfile(@Req() req: AuthenticatedRequest): {
    message: string;
    user: unknown;
  } {
    return { message: 'Você está logado!', user: req.user };
  }
}
