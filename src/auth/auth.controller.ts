// src/auth/auth.controller.ts
import { All, Controller, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Captura qualquer método (GET, POST) que vá para /api/auth/*
  @All('*path')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // Converte o handler do Better Auth para o padrão Node/Express que o Nest usa
    const handler = toNodeHandler(this.authService.auth);
    // O toNodeHandler envia a resposta diretamente, não retorna um valor
    await handler(req, res);
  }
}
