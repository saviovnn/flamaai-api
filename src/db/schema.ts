import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

// 1. Tabela de USUÁRIOS
export const usuarios = pgTable('usuarios', {
  id: text('id').primaryKey(),
  name: text('nome').notNull(), // TS: name, DB: nome
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verificado').notNull(),
  image: text('imagem'),
  password: text('senha'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),

  // Campos extras do Gov.br
  cpf: text('cpf'),
  govbrLevel: text('govbr_level'), // "gold", "silver", "bronze"
  govbrReliabilities: jsonb('govbr_reliabilities'), // Guarda o JSON dos selos
});

// 2. Tabela de SESSÕES
export const sessoes = pgTable('sessoes', {
  id: text('id').primaryKey(),
  userId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id), // TS: userId
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// 3. Tabela de CONTAS (Social Login)
export const contas = pgTable('contas', {
  id: text('id').primaryKey(),
  userId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  accountId: text('account_id').notNull(), // ID do provedor (Ex: CPF no Gov.br)
  providerId: text('provider_id').notNull(), // "govbr"
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'), // Importante para o Gov.br
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// 4. Tabela de VERIFICAÇÕES (Email)
export const verificacoes = pgTable('verificacoes', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});
