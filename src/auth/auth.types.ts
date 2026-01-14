// Tipos compartilhados para autenticação

export interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  email_verified: boolean;
  image?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BetterAuthSession {
  id: string;
  token: string;
  expires_at: Date;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: Date;
  updated_at?: Date;
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
export interface RegisterSuccessResponse {
  success: true;
  user: BetterAuthUser;
}

export interface RegisterErrorResponse {
  error: string;
  details?: string;
}

export type RegisterResponse =
  | RegisterSuccessResponse
  | RegisterErrorResponse;

export interface LoginSuccessResponse {
  success: true;
  user: BetterAuthUser;
  session: BetterAuthSession;
}

export interface LoginErrorResponse {
  error: string;
  details?: string;
}

export type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

export interface ForgotPasswordSuccessResponse {
  success: true;
  message: string;
}

export interface ForgotPasswordErrorResponse {
  error: string;
  details?: string;
}

export type ForgotPasswordResponse =
  | ForgotPasswordSuccessResponse
  | ForgotPasswordErrorResponse;

export interface ResetPasswordSuccessResponse {
  success: true;
  message: string;
}

export interface ResetPasswordErrorResponse {
  error: string;
  details?: string;
}

export type ResetPasswordResponse =
  | ResetPasswordSuccessResponse
  | ResetPasswordErrorResponse;
