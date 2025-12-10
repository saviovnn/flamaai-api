import { All, Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { RegistrarDto, EntrarDto } from './dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registrar')
  async registrar(@Body() body: RegistrarDto) {
    return await this.authService.registrar(body);
  }

  @Post('entrar')
  async entrar(@Body() body: EntrarDto) {
    return await this.authService.entrar(body);
  }

  @All('*')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // Converte o handler do Better Auth para o padrão Node/Express
    const handler = toNodeHandler(this.authService.auth);
    await handler(req, res);
  }
}
