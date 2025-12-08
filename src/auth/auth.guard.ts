// src/auth/auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Verifica a sessão usando a API do Better Auth
    const session = await this.authService.auth.api.getSession({
      headers: request.headers as unknown as Headers,
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    // Anexa o usuário e a sessão ao objeto de request para uso posterior
    (request as Record<string, any>)['user'] = session.user;
    (request as Record<string, any>)['session'] = session.session;

    return true;
  }
}
