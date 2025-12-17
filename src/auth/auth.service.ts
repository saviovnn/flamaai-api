import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../db/app.module';
import * as schema from '../db/schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  BetterAuthResponse,
  BetterAuthErrorResponse,
  RegisterResponse,
  LoginResponse,
} from './auth.types';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  public readonly auth: ReturnType<typeof betterAuth>;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    // Inicializa o Better Auth com PostgreSQL
    this.auth = betterAuth({
      database: drizzleAdapter(this.db, {
        provider: 'pg',
        schema: {
          user: schema.users,
          session: schema.sessions,
          account: schema.accounts,
          verification: schema.verifications,
        },
        usePlural: false,
      }),
      baseURL: process.env.BASE_URL || 'http://localhost:3000',
      trustedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
      emailAndPassword: {
        enabled: true,
      },
      advanced: {
        useSecureCookies: process.env.NODE_ENV === 'production',
      },
    });
  }

  async register(body: RegisterDto): Promise<RegisterResponse> {
    try {
      const response = await fetch(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/sign-up/email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: body.email,
            password: body.password,
            name: body.name,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        // Log para debug (pode remover depois)
        console.log(
          'Better Auth Error Response:',
          JSON.stringify(data, null, 2),
        );

        const errorData = data as BetterAuthErrorResponse;
        // Better Auth pode retornar o erro em diferentes formatos
        const dataAny = data as Record<string, unknown>;
        const errorMessage =
          errorData?.error ||
          errorData?.message ||
          (dataAny?.message as string) ||
          ((dataAny?.error as Record<string, unknown>)?.message as string) ||
          (typeof data === 'string' ? data : 'Erro ao registrar usuário');

        return {
          error: errorMessage,
        };
      }

      const successData = data as BetterAuthResponse;
      return {
        success: true,
        user: successData.user,
      };
    } catch (error) {
      return {
        error: 'Erro ao registrar usuário',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async login(body: LoginDto): Promise<LoginResponse> {
    try {
      const response = await fetch(
        `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/sign-in/email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: body.email,
            password: body.password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        // Log para debug (pode remover depois)
        console.log(
          'Better Auth Error Response:',
          JSON.stringify(data, null, 2),
        );

        const errorData = data as BetterAuthErrorResponse;
        // Better Auth pode retornar o erro em diferentes formatos
        const dataAny = data as Record<string, unknown>;
        const errorMessage =
          errorData?.error ||
          errorData?.message ||
          (dataAny?.message as string) ||
          ((dataAny?.error as Record<string, unknown>)?.message as string) ||
          (typeof data === 'string' ? data : 'Email ou senha inválidos');

        return {
          error: errorMessage,
        };
      }

      const successData = data as BetterAuthResponse;
      return {
        success: true,
        user: successData.user,
        session: successData.session,
      };
    } catch (error) {
      return {
        error: 'Erro ao fazer login',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async findAll() {
    return await this.db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
