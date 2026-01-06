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
  jsonb,
  unique,
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
    cdMun: varchar('cd_mun', { length: 7 }).notNull(),
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
    unique('municipios_ibge_cdmun_unique').on(table.cdMun),
  ],
);

export const biomasIbge = pgTable('biomas_ibge', {
  gid: serial('gid').primaryKey().notNull(),
  cdBioma: varchar('cd_bioma', { length: 2 }),
  bioma: varchar('bioma', { length: 100 }),
  geom: geometry('geom', { type: 'multipolygon', srid: 4674 }),
});

export const location = pgTable('location', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  biomaId: integer('bioma_id')
    .notNull()
    .references(() => biomasIbge.gid, { onDelete: 'cascade' }),
  cdMun: varchar('cd_mun', { length: 7 })
    .notNull()
    .references(() => municipiosIbge.cdMun, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const fireRisk = pgTable('fire_risk', {
  id: text('id').primaryKey().notNull(),
  locationId: text('location_id')
    .notNull()
    .references(() => location.id, { onDelete: 'cascade' }),
  week_start_date: timestamp('week_start_date').notNull(),
  week_end_date: timestamp('week_end_date').notNull(),
  dailyRisks: jsonb('daily_risks').notNull(),
  weekly_risk_mean: doublePrecision('weekly_risk_mean').notNull(),
  risk_level: varchar('risk_level', { length: 20 }).notNull(),
  rag_explanation: text('rag_explanation').notNull(),
  model_version: text('model_version').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const weatherData = pgTable('weather_data', {
  id: text('id').primaryKey().notNull(),
  location_id: text('location_id')
    .notNull()
    .references(() => location.id, { onDelete: 'cascade' }),
  time: timestamp('time').notNull(),
  temperature_2m_max: doublePrecision('temperature_2m_max').notNull(),
  temperature_2m_min: doublePrecision('temperature_2m_min').notNull(),
  temperature_2m_mean: doublePrecision('temperature_2m_mean').notNull(),
  relative_humidity_2m_mean: doublePrecision(
    'relative_humidity_2m_mean',
  ).notNull(),
  precipitation_sum: doublePrecision('precipitation_sum').notNull(),
  rain_sum: doublePrecision('rain_sum'),
  windspeed_10m_max: doublePrecision('windspeed_10m_max').notNull(),
  windgusts_10m_max: doublePrecision('windgusts_10m_max').notNull(),
  et0_fao_evapotranspiration: doublePrecision(
    'et0_fao_evapotranspiration',
  ).notNull(),
  uv_index_max: doublePrecision('uv_index_max').notNull(),
  pm10: doublePrecision('pm10').notNull(),
  pm2_5: doublePrecision('pm2_5').notNull(),
  carbon_monoxide: doublePrecision('carbon_monoxide').notNull(),
  nitrogen_dioxide: doublePrecision('nitrogen_dioxide').notNull(),
  sulphur_dioxide: doublePrecision('sulphur_dioxide').notNull(),
  ozone: doublePrecision('ozone').notNull(),
  aerosol_optical_depth: doublePrecision('aerosol_optical_depth').notNull(),
  dust: doublePrecision('dust').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const fireRiskWeatherData = pgTable('fire_risk_weather_data', {
  id: text('id').primaryKey().notNull(),
  fireRiskId: text('fire_risk_id')
    .notNull()
    .references(() => fireRisk.id, { onDelete: 'cascade' }),
  weatherDataId: text('weather_data_id')
    .notNull()
    .references(() => weatherData.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
