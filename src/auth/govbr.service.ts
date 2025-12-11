import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

interface GovBrTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
}

interface GovBrUserInfo {
  sub: string;
  name: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  picture?: string;
  social_name?: string;
  reliability_info?: {
    level: string;
    reliabilities: Array<{
      id: string;
      updatedAt: string;
    }>;
  };
}

interface PKCEPair {
  verifier: string;
  challenge: string;
}

interface DecodedIdToken {
  sub: string;
  name?: string;
  social_name?: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  picture?: string;
  nonce: string;
  reliability_info?: {
    level: string;
    reliabilities: Array<{
      id: string;
      updatedAt: string;
    }>;
  };
  aud: string;
  iss: string;
  exp: number;
  iat: number;
}

@Injectable()
export class GovBrService {
  private readonly clientId = process.env.GOVBR_CLIENT_ID!;
  private readonly clientSecret = process.env.GOVBR_CLIENT_SECRET!;
  private readonly redirectUri = `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/govbr/callback`;
  private readonly baseUrl = 'https://sso.staging.acesso.gov.br';

  /**
   * Gera um par PKCE (code_verifier e code_challenge)
   * Conforme RFC 7636 e documentação Gov.br
   */
  generatePKCE(): PKCEPair {
    // Code verifier: string aleatória de 43-128 caracteres
    const verifier = randomBytes(32).toString('base64url');

    // Code challenge: BASE64URL(SHA256(verifier))
    const challenge = createHash('sha256').update(verifier).digest('base64url');

    return { verifier, challenge };
  }

  /**
   * Gera um nonce aleatório
   */
  generateNonce(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Gera a URL de autorização do Gov.br
   */
  getAuthorizationUrl(
    state: string,
    nonce: string,
    codeChallenge: string,
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: [
        'openid',
        'email',
        'profile',
        'govbr_confiabilidades',
        'govbr_confiabilidades_idtoken',
      ].join(' '),
      redirect_uri: this.redirectUri,
      nonce,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.baseUrl}/authorize?${params.toString()}`;
  }

  /**
   * Troca o código de autorização por tokens
   * Usa Basic Authentication conforme documentação Gov.br
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
  ): Promise<GovBrTokenResponse> {
    // Basic Auth: Base64(CLIENT_ID:CLIENT_SECRET)
    const basicAuth = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to exchange code: ${response.statusText} - ${errorText}`,
      );
    }

    return (await response.json()) as GovBrTokenResponse;
  }

  /**
   * Busca informações do usuário usando o access_token
   */
  async getUserInfo(accessToken: string): Promise<GovBrUserInfo> {
    const response = await fetch(`${this.baseUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get user info: ${response.statusText} - ${errorText}`,
      );
    }

    return (await response.json()) as GovBrUserInfo;
  }

  /**
   * Decodifica o ID Token (JWT) sem validação
   * ATENÇÃO: Em produção, deve-se validar a assinatura do JWT
   */
  decodeIdToken(idToken: string): DecodedIdToken {
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
      return JSON.parse(decoded) as DecodedIdToken;
    } catch (error) {
      throw new Error(
        `Failed to decode ID token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Mapeia o perfil do Gov.br para o formato da aplicação
   */
  mapUserProfile(profile: GovBrUserInfo, idTokenData?: DecodedIdToken) {
    // Prioriza dados do ID Token se disponíveis
    const reliabilityInfo =
      idTokenData?.reliability_info || profile.reliability_info;
    const level = reliabilityInfo?.level || 'bronze';
    const reliabilities = reliabilityInfo?.reliabilities || [];

    return {
      id: profile.sub,
      email: profile.email || idTokenData?.email,
      name: profile.name || idTokenData?.name,
      socialName: profile.social_name || idTokenData?.social_name,
      emailVerified:
        profile.email_verified ?? idTokenData?.email_verified ?? false,
      phoneNumber: profile.phone_number || idTokenData?.phone_number,
      phoneNumberVerified:
        profile.phone_number_verified ??
        idTokenData?.phone_number_verified ??
        false,
      picture: profile.picture || idTokenData?.picture,
      cpf: profile.sub,
      govbrLevel: level,
      govbrReliabilities: JSON.stringify(reliabilities),
    };
  }
}
