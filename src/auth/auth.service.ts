import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../db/app.module';
import * as schema from '../db/schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  BetterAuthResponse,
  BetterAuthErrorResponse,
  BetterAuthApiResponse,
  RegistrarResponse,
  EntrarResponse,
} from './auth.types';
import { RegistrarDto, EntrarDto } from './dto';

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
        // Mapeamos os MODELS do BetterAuth para as tabelas do Drizzle
        schema: {
          user: schema.usuarios,
          session: schema.sessoes,
          account: schema.contas,
          verification: schema.verificacoes,
        },
        usePlural: false, // Importante pois definimos nomes manuais ('usuarios', etc)
      }),

      baseURL: process.env.BASE_URL || 'http://localhost:3000',
      trustedOrigins: ['http://localhost:3000', 'http://localhost:5173'],

      // Definição dos campos extras para o TypeScript entender o retorno
      user: {
        additionalFields: {
          cpf: { type: 'string', required: false },
          govbrLevel: { type: 'string', required: false },
          govbrReliabilities: { type: 'string', required: false }, // jsonb retorna string/obj dependendo do driver
        },
      },

      emailAndPassword: {
        enabled: true,
      },

      advanced: {
        useSecureCookies: process.env.NODE_ENV === 'production',
      },
    });
  }

  async registrar(body: RegistrarDto): Promise<RegistrarResponse> {
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
            password: body.senha,
            name: body.nome,
          }),
        },
      );

      const data =
        (await response.json()) as BetterAuthApiResponse<BetterAuthResponse>;

      if (!response.ok) {
        const errorData = data as BetterAuthErrorResponse;
        return {
          error: errorData.error || 'Erro ao registrar usuário',
        };
      }

      const successData = data as BetterAuthResponse;
      return {
        sucesso: true,
        usuario: successData.user,
      };
    } catch (error) {
      return {
        error: 'Erro ao registrar usuário',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async entrar(body: EntrarDto): Promise<EntrarResponse> {
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
            password: body.senha,
          }),
        },
      );

      const data =
        (await response.json()) as BetterAuthApiResponse<BetterAuthResponse>;

      if (!response.ok) {
        const errorData = data as BetterAuthErrorResponse;
        return {
          error: errorData.error || 'Email ou senha inválidos',
        };
      }

      const successData = data as BetterAuthResponse;
      return {
        sucesso: true,
        usuario: successData.user,
        sessao: successData.session,
      };
    } catch (error) {
      return {
        error: 'Erro ao fazer login',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async findAll() {
    return await this.db.query.usuarios.findMany({
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
