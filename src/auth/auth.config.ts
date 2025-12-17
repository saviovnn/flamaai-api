// Configuração de mapeamento de campos para o Better Auth

export const betterAuthFieldMapping = {
  user: {
    tableName: 'users',
    fields: {
      id: 'id',
      name: 'name',
      email: 'email',
      emailVerified: 'email_verified',
      image: 'image',
      password: 'password',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  session: {
    tableName: 'sessions',
    fields: {
      id: 'id',
      userId: 'user_id',
      expiresAt: 'expires_at',
      token: 'token',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  account: {
    tableName: 'accounts',
    fields: {
      id: 'id',
      userId: 'user_id',
      accountId: 'account_id',
      providerId: 'provider_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  verification: {
    tableName: 'verifications',
    fields: {
      id: 'id',
      identifier: 'identifier',
      value: 'value',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
};
