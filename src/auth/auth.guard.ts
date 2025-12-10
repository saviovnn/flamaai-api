import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';
import type { BetterAuthUser, BetterAuthSession } from './auth.types';

interface SessionResponse {
  user: BetterAuthUser;
  session: BetterAuthSession;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Verifica a sessão usando a API do Better Auth
    const sessionData = (await this.authService.auth.api.getSession({
      headers: request.headers as unknown as Headers,
    })) as SessionResponse | null;

    if (!sessionData) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    // Anexa o usuário e a sessão ao objeto de request para uso posterior
    request.user = sessionData.user;
    request.session = sessionData.session;

    return true;
  }
}
