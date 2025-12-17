import {
  All,
  Body,
  Controller,
  Post,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import {
  RegisterResponse,
  LoginResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from './auth.types';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto): Promise<RegisterResponse> {
    const result = await this.authService.register(body);
    if ('error' in result) {
      throw new HttpException(result, HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  @Post('login')
  async login(@Body() body: LoginDto): Promise<LoginResponse> {
    const result = await this.authService.login(body);
    if ('error' in result) {
      throw new HttpException(result, HttpStatus.UNAUTHORIZED);
    }
    return result;
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    const result = await this.authService.forgotPassword(body);
    if ('error' in result) {
      const status =
        result.error === 'Usuário não encontrado'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST;
      throw new HttpException(result, status);
    }
    return result;
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<ResetPasswordResponse> {
    const result = await this.authService.resetPassword(body);
    if ('error' in result) {
      // Código inválido ou expirado = 400 Bad Request
      // Usuário não encontrado = 404 Not Found
      // Conta não encontrada = 404 Not Found
      const status =
        result.error === 'Código inválido ou expirado'
          ? HttpStatus.BAD_REQUEST
          : result.error === 'Usuário não encontrado' ||
              result.error === 'Conta não encontrada'
            ? HttpStatus.NOT_FOUND
            : HttpStatus.BAD_REQUEST;
      throw new HttpException(result, status);
    }
    return result;
  }

  @All('*')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // Converte o handler do Better Auth para o padrão Node/Express
    const handler = toNodeHandler(this.authService.auth);
    await handler(req, res);
  }
}
