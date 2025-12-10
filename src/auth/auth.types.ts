// Tipos compartilhados para autenticação

export interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BetterAuthSession {
  id: string;
  token: string;
  expiresAt: Date;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BetterAuthResponse {
  user: BetterAuthUser;
  session: BetterAuthSession;
}

export interface BetterAuthErrorResponse {
  error: string;
  message?: string;
}

export type BetterAuthApiResponse<T> = T | BetterAuthErrorResponse;

// Tipos de retorno dos métodos
export interface RegistrarSucessoResponse {
  sucesso: true;
  usuario: BetterAuthUser;
}

export interface RegistrarErroResponse {
  error: string;
  detalhes?: string;
}

export type RegistrarResponse =
  | RegistrarSucessoResponse
  | RegistrarErroResponse;

export interface EntrarSucessoResponse {
  sucesso: true;
  usuario: BetterAuthUser;
  sessao: BetterAuthSession;
}

export interface EntrarErroResponse {
  error: string;
  detalhes?: string;
}

export type EntrarResponse = EntrarSucessoResponse | EntrarErroResponse;
