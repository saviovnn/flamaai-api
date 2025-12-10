// Configuração de mapeamento de campos para o Better Auth

export const betterAuthFieldMapping = {
  user: {
    tableName: 'usuarios',
    fields: {
      id: 'id',
      name: 'nome',
      email: 'email',
      emailVerified: 'email_verificado',
      image: 'imagem',
      password: 'senha',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  session: {
    tableName: 'sessoes',
    fields: {
      id: 'id',
      userId: 'usuario_id',
      expiresAt: 'expires_at',
      token: 'token',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  account: {
    tableName: 'contas',
    fields: {
      id: 'id',
      userId: 'usuario_id',
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
    tableName: 'verificacoes',
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
