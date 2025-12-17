import { All, Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { RegisterDto, LoginDto } from './dto';
import { RegisterResponse, LoginResponse } from './auth.types';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto): Promise<RegisterResponse> {
    return await this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto): Promise<LoginResponse> {
    return await this.authService.login(body);
  }

  @All('*')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // Converte o handler do Better Auth para o padrão Node/Express
    const handler = toNodeHandler(this.authService.auth);
    await handler(req, res);
  }
}
