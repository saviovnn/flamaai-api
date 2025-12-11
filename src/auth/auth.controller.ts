import { All, Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GovBrService } from './govbr.service';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { RegistrarDto, EntrarDto } from './dto';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly govbrService: GovBrService,
  ) {}

  @Post('registrar')
  async registrar(@Body() body: RegistrarDto) {
    return await this.authService.registrar(body);
  }

  @Post('entrar')
  async entrar(@Body() body: EntrarDto) {
    return await this.authService.entrar(body);
  }

  @Get('govbr/login')
  async govbrLogin(@Res() res: Response) {
    // Gera state para proteção CSRF
    const state = this.govbrService.generateNonce();

    // Gera nonce obrigatório
    const nonce = this.govbrService.generateNonce();

    // Gera par PKCE (code_verifier e code_challenge)
    const pkce = this.govbrService.generatePKCE();

    // Salva state, nonce e code_verifier em cookies seguros
    res.cookie('govbr_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600000, // 10 minutos
    });

    res.cookie('govbr_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600000, // 10 minutos
    });

    res.cookie('govbr_verifier', pkce.verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600000, // 10 minutos
    });

    const authUrl = this.govbrService.getAuthorizationUrl(
      state,
      nonce,
      pkce.challenge,
    );

    return res.redirect(authUrl);
  }

  @Get('govbr/callback')
  async govbrCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Verifica o state para proteção CSRF
      const savedState = req.cookies['govbr_state'];
      const savedNonce = req.cookies['govbr_nonce'];
      const codeVerifier = req.cookies['govbr_verifier'];

      if (!state || state !== savedState) {
        return res.status(400).json({
          error: 'Invalid state parameter',
          message: 'CSRF validation failed',
        });
      }

      if (!code) {
        return res.status(400).json({
          error: 'Missing authorization code',
          message: 'O código de autorização não foi fornecido',
        });
      }

      if (!codeVerifier) {
        return res.status(400).json({
          error: 'Missing code verifier',
          message: 'PKCE verification failed',
        });
      }

      // Limpa os cookies usados
      res.clearCookie('govbr_state');
      res.clearCookie('govbr_nonce');
      res.clearCookie('govbr_verifier');

      // Troca o código por tokens usando PKCE
      const tokens = await this.govbrService.exchangeCodeForToken(
        code,
        codeVerifier,
      );

      // Verifica se o ID Token foi retornado
      if (!tokens.id_token) {
        return res.status(500).json({
          error: 'Missing ID token',
          message: 'O Gov.br não retornou o ID token',
        });
      }

      // Decodifica o ID Token
      const idTokenData = this.govbrService.decodeIdToken(tokens.id_token);

      // Valida o nonce do ID Token
      if (idTokenData.nonce !== savedNonce) {
        return res.status(400).json({
          error: 'Invalid nonce',
          message: 'Nonce validation failed',
        });
      }

      // Busca informações adicionais do usuário
      const userInfo = await this.govbrService.getUserInfo(tokens.access_token);

      // Mapeia o perfil (prioriza dados do ID Token)
      const mappedUser = this.govbrService.mapUserProfile(
        userInfo,
        idTokenData,
      );

      // TODO: Criar/atualizar usuário no banco de dados
      // TODO: Criar sessão usando Better Auth

      // Por enquanto, retorna os dados
      return res.json({
        success: true,
        user: mappedUser,
        tokens: {
          access_token: tokens.access_token,
          expires_in: tokens.expires_in,
          token_type: tokens.token_type,
        },
        message: 'Login Gov.br realizado com sucesso!',
      });
    } catch (error) {
      console.error('Erro no callback Gov.br:', error);
      return res.status(500).json({
        error: 'Erro ao processar login Gov.br',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  @All('*')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // Converte o handler do Better Auth para o padrão Node/Express
    const handler = toNodeHandler(this.authService.auth);
    await handler(req, res);
  }
}
