import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  varchar,
  doublePrecision,
  geometry,
  index,
  integer,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const spatialRefSys = pgTable(
  'spatial_ref_sys',
  {
    srid: integer('srid').primaryKey().notNull(),
    authName: varchar('auth_name', { length: 256 }),
    authSrid: integer('auth_srid'),
    srtext: varchar('srtext', { length: 2048 }),
    proj4text: varchar('proj4text', { length: 2048 }),
  },
  () => [
    check('spatial_ref_sys_srid_check', sql`(srid > 0) AND (srid <= 998999)`),
  ],
);

export const municipiosIbge = pgTable(
  'municipios_ibge',
  {
    gid: serial('gid').primaryKey().notNull(),
    cdMun: varchar('cd_mun', { length: 7 }),
    nmMun: varchar('nm_mun', { length: 100 }),
    cdRgi: varchar('cd_rgi', { length: 6 }),
    nmRgi: varchar('nm_rgi', { length: 100 }),
    cdRgint: varchar('cd_rgint', { length: 4 }),
    nmRgint: varchar('nm_rgint', { length: 100 }),
    cdUf: varchar('cd_uf', { length: 2 }),
    nmUf: varchar('nm_uf', { length: 50 }),
    siglaUf: varchar('sigla_uf', { length: 2 }),
    cdRegia: varchar('cd_regia', { length: 1 }),
    nmRegia: varchar('nm_regia', { length: 20 }),
    siglaRg: varchar('sigla_rg', { length: 2 }),
    cdConcu: varchar('cd_concu', { length: 7 }),
    nmConcu: varchar('nm_concu', { length: 100 }),
    areaKm2: doublePrecision('area_km2'),
    geom: geometry('geom', { type: 'multipolygon', srid: 4674 }),
  },
  (table) => [
    index('municipios_ibge_geom_idx').using(
      'gist',
      table.geom.asc().nullsLast().op('gist_geometry_ops_2d'),
    ),
  ],
);
