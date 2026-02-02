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
  BetterAuthUser,
  BetterAuthSession,
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
        password: {
          // Configura o Better Auth para usar bcrypt
          hash: async (password: string) => {
            return await bcrypt.hash(password, 10);
          },
          verify: async ({
            hash,
            password,
          }: {
            hash: string;
            password: string;
          }) => {
            return await bcrypt.compare(password, hash);
          },
        },
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

      // Verifica se a resposta tem conteúdo antes de tentar fazer parse
      const contentType = response.headers.get('content-type');
      const text = await response.text();

      let data: unknown;
      if (contentType?.includes('application/json') && text) {
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('Erro ao fazer parse do JSON:', parseError);
          console.error('Resposta recebida:', text);
          return {
            error: 'Resposta inválida do servidor de autenticação',
            details: 'A resposta não é um JSON válido',
          };
        }
      } else {
        return {
          error: text || 'Erro ao fazer login',
          details: `Resposta não é JSON. Status: ${response.status}`,
        };
      }

      if (!response.ok) {
        const errorData = data as BetterAuthErrorResponse;
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
      console.error('Erro ao fazer login:', error);
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

      try {
        // Tenta usar o endpoint interno do Better Auth para atualizar a senha
        const response = await fetch(
          `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/update-password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: body.email,
              newPassword: body.new_password,
            }),
          },
        );

        if (response.ok) {
          await this.db
            .delete(schema.verifications)
            .where(eq(schema.verifications.id, verification.id));

          return {
            success: true,
            message: 'Senha redefinida com sucesso',
          };
        }
      } catch {
        // Se o endpoint não existir, continua com a atualização direta
        console.error(
          'Endpoint do Better Auth não disponível, usando atualização direta',
        );
      }

      const hashedPassword = await bcrypt.hash(body.new_password, 10);

      if (
        !hashedPassword ||
        hashedPassword.length !== 60 ||
        !hashedPassword.startsWith('$2b$')
      ) {
        console.error('Hash inválido gerado:', {
          length: hashedPassword?.length,
          startsWith: hashedPassword?.substring(0, 4),
        });
        return {
          error: 'Erro ao gerar hash da senha',
        };
      }

      // Atualiza a senha na tabela accounts
      await this.db
        .update(schema.accounts)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(schema.accounts.userId, user.id));

      // Verifica se o hash foi salvo corretamente
      const updatedAccount = await this.db.query.accounts.findFirst({
        where: eq(schema.accounts.userId, user.id),
      });

      if (updatedAccount?.password !== hashedPassword) {
        console.error('Hash não foi salvo corretamente!');
        return {
          error: 'Erro ao salvar hash da senha',
        };
      }

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
    const users = await this.db.query.users.findMany({
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

    // Converte para snake_case
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      email_verified: user.emailVerified,
      image: user.image,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    }));
  }

  private static readonly MAX_IMAGE_BASE64_LENGTH = 10 * 1024 * 1024; // ~10MB

  /**
   * Obtém sessão e usuário a partir do header Authorization: Bearer <token>.
   * Usado quando getSession (cookie) retorna null mas o front envia Bearer.
   */
  async getSessionFromBearerToken(
    authHeader: string | undefined,
  ): Promise<{ user: BetterAuthUser; session: BetterAuthSession } | null> {
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;

    const session = await this.db.query.sessions.findFirst({
      where: and(
        eq(schema.sessions.token, token),
        gt(schema.sessions.expiresAt, new Date()),
      ),
    });
    if (!session) return null;

    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
    });
    if (!user) return null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.emailVerified,
        image: user.image ?? undefined,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
      session: {
        id: session.id,
        token: session.token,
        expires_at: session.expiresAt,
        user_id: session.userId,
        ip_address: session.ipAddress ?? undefined,
        user_agent: session.userAgent ?? undefined,
        created_at: session.createdAt,
        updated_at: session.updatedAt,
      },
    };
  }

  async updateProfileImage(
    userId: string,
    image: string | null | undefined,
  ): Promise<{ user?: BetterAuthUser; error?: string }> {
    if (image !== undefined && image !== null) {
      if (typeof image !== 'string') {
        return { error: 'Imagem inválida' };
      }
      if (image.length > AuthService.MAX_IMAGE_BASE64_LENGTH) {
        return {
          error: 'Imagem muito grande. Use uma imagem menor (máx. ~7MB).',
        };
      }
    }

    const [updated] = await this.db
      .update(schema.users)
      .set({
        image: image ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        emailVerified: schema.users.emailVerified,
        image: schema.users.image,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      });

    if (!updated) {
      return { error: 'Usuário não encontrado' };
    }

    const user: BetterAuthUser = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      email_verified: updated.emailVerified,
      image: updated.image ?? undefined,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
    return { user };
  }
}
