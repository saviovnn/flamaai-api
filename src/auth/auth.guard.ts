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

    // 1) Tenta sessão via Better Auth (cookie)
    let sessionData = (await this.authService.auth.api.getSession({
      headers: request.headers as unknown as Headers,
    })) as SessionResponse | null;

    // 2) Se não houver cookie, tenta Authorization: Bearer (front envia token no header)
    if (!sessionData) {
      sessionData = await this.authService.getSessionFromBearerToken(
        request.headers.authorization,
      );
    }

    // 3) Fallback: token no body (ex.: PATCH profile/image com body.token)
    if (!sessionData && request.body?.token) {
      const bodyToken =
        typeof request.body.token === 'string' ? request.body.token : undefined;
      if (bodyToken) {
        sessionData = await this.authService.getSessionFromBearerToken(
          `Bearer ${bodyToken}`,
        );
      }
    }

    if (!sessionData) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    // Anexa o usuário e a sessão ao objeto de request para uso posterior
    request.user = sessionData.user;
    request.session = sessionData.session;

    return true;
  }
}
