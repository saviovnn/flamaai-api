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
