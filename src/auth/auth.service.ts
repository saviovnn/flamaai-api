import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../db/app.module';
import * as schema from '../db/schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { Resend } from 'resend';
import { eq, and, gt, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import {
  BetterAuthResponse,
  BetterAuthErrorResponse,
  RegisterResponse,
  LoginResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from './auth.types';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';

@Injectable()
export class AuthService {
  public readonly auth: ReturnType<typeof betterAuth>;
  private readonly resend: Resend;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    // Inicializa Resend
    this.resend = new Resend(process.env.RESEND_API_KEY);
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

  async forgotPassword(
    body: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    try {
      const user = await this.db.query.users.findFirst({
        where: sql`LOWER(${schema.users.email}) = LOWER(${body.email})`,
      });

      if (!user) {
        return {
          error: 'Usuário não encontrado',
        };
      }

      // Gera código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Código expira em 15 minutos

      // Remove códigos anteriores para este email
      await this.db
        .delete(schema.verifications)
        .where(eq(schema.verifications.identifier, body.email));

      // Salva o código no banco
      await this.db.insert(schema.verifications).values({
        id: crypto.randomUUID(),
        identifier: body.email,
        value: code,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Envia email com o código
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

      try {
        const emailResult = await this.resend.emails.send({
          from: fromEmail,
          to: body.email,
          subject: 'Código de recuperação de senha - FlamaAI',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Recuperação de Senha</h2>
              <p>Olá,</p>
              <p>Você solicitou a recuperação de senha. Use o código abaixo para redefinir sua senha:</p>
              <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                <h1 style="color: #ff6600; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
              </div>
              <p style="color: #666; font-size: 14px;">Este código expira em 15 minutos.</p>
              <p style="color: #666; font-size: 14px;">Se você não solicitou esta recuperação, ignore este email.</p>
            </div>
          `,
        });

        // Verifica se há erro na resposta do Resend
        if (emailResult.error) {
          console.error('ERRO na resposta do Resend:', emailResult.error);

          // Remove o código salvo se o email falhar
          await this.db
            .delete(schema.verifications)
            .where(eq(schema.verifications.identifier, body.email));

          return {
            error: 'Erro ao enviar email de recuperação',
            details:
              emailResult.error.message ||
              'Não foi possível enviar o email. Verifique a configuração do Resend.',
          };
        }
      } catch (emailError: any) {
        console.error('ERRO ao enviar email:', emailError);
        console.error('Detalhes do erro:', {
          message: emailError?.message,
          name: emailError?.name,
          response: emailError?.response?.data,
          status: emailError?.response?.status,
        });

        // Remove o código salvo se o email falhar
        await this.db
          .delete(schema.verifications)
          .where(eq(schema.verifications.identifier, body.email));

        // Retorna erro específico
        const errorMessage =
          emailError?.response?.data?.message ||
          emailError?.message ||
          'Erro ao enviar email';

        return {
          error: 'Erro ao enviar email de recuperação',
          details: errorMessage,
        };
      }

      return {
        success: true,
        message:
          'Se o email estiver cadastrado, você receberá um código de verificação.',
      };
    } catch (error) {
      console.error('Erro ao processar recuperação de senha:', error);
      return {
        error: 'Erro ao processar solicitação de recuperação de senha',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async resetPassword(body: ResetPasswordDto): Promise<ResetPasswordResponse> {
    try {
      // Busca o código de verificação
      const verification = await this.db.query.verifications.findFirst({
        where: and(
          eq(schema.verifications.identifier, body.email),
          eq(schema.verifications.value, body.code),
          gt(schema.verifications.expiresAt, new Date()),
        ),
      });

      if (!verification) {
        return {
          error: 'Código inválido ou expirado',
        };
      }

      // Verifica se o usuário existe
      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.email, body.email),
      });

      if (!user) {
        return {
          error: 'Usuário não encontrado',
        };
      }

      // Busca a conta do usuário para atualizar a senha
      const account = await this.db.query.accounts.findFirst({
        where: eq(schema.accounts.userId, user.id),
      });

      if (!account) {
        return {
          error: 'Conta não encontrada',
        };
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(body.newPassword, 10);

      // Atualiza a senha na tabela accounts
      await this.db
        .update(schema.accounts)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(schema.accounts.userId, user.id));

      // Remove o código de verificação usado
      await this.db
        .delete(schema.verifications)
        .where(eq(schema.verifications.id, verification.id));

      return {
        success: true,
        message: 'Senha redefinida com sucesso',
      };
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      return {
        error: 'Erro ao redefinir senha',
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
