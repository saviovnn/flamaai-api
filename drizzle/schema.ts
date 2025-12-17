import {
  pgTable,
  check,
  integer,
  varchar,
  index,
  serial,
  doublePrecision,
  geometry,
  text,
  timestamp,
  unique,
  boolean,
  foreignKey,
  pgView,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const spatialRefSys = pgTable(
  'spatial_ref_sys',
  {
    srid: integer().primaryKey().notNull(),
    authName: varchar('auth_name', { length: 256 }),
    authSrid: integer('auth_srid'),
    srtext: varchar({ length: 2048 }),
    proj4Text: varchar({ length: 2048 }),
  },
  () => [
    check('spatial_ref_sys_srid_check', sql`(srid > 0) AND (srid <= 998999)`),
  ],
);

export const municipiosIbge = pgTable(
  'municipios_ibge',
  {
    gid: serial().primaryKey().notNull(),
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
    geom: geometry({ type: 'multipolygon', srid: 4674 }),
  },
  (table) => [
    index('municipios_ibge_geom_idx').using(
      'gist',
      table.geom.asc().nullsLast().op('gist_geometry_ops_2d'),
    ),
  ],
);

export const verifications = pgTable('verifications', {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable(
  'users',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique('users_email_unique').on(table.email)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: text().primaryKey().notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      mode: 'string',
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      mode: 'string',
    }),
    scope: text(),
    password: text(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'accounts_user_id_users_id_fk',
    }).onDelete('cascade'),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    token: text().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'sessions_user_id_users_id_fk',
    }).onDelete('cascade'),
    unique('sessions_token_unique').on(table.token),
  ],
);
export const geographyColumns = pgView('geography_columns', {
  // TODO: failed to parse database type 'name'
  fTableCatalog: varchar('f_table_catalog', { length: 256 }),
  // TODO: failed to parse database type 'name'
  fTableSchema: varchar('f_table_schema', { length: 256 }),
  // TODO: failed to parse database type 'name'
  fTableName: varchar('f_table_name', { length: 256 }),
  // TODO: failed to parse database type 'name'
  fGeographyColumn: varchar('f_geography_column', { length: 256 }),
  coordDimension: integer('coord_dimension'),
  srid: integer(),
  type: text(),
}).as(
  sql`SELECT current_database() AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geography_column, postgis_typmod_dims(a.atttypmod) AS coord_dimension, postgis_typmod_srid(a.atttypmod) AS srid, postgis_typmod_type(a.atttypmod) AS type FROM pg_class c, pg_attribute a, pg_type t, pg_namespace n WHERE t.typname = 'geography'::name AND a.attisdropped = false AND a.atttypid = t.oid AND a.attrelid = c.oid AND c.relnamespace = n.oid AND (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text)`,
);

export const geometryColumns = pgView('geometry_columns', {
  fTableCatalog: varchar('f_table_catalog', { length: 256 }),
  // TODO: failed to parse database type 'name'
  fTableSchema: varchar('f_table_schema', { length: 256 }),
  // TODO: failed to parse database type 'name'
  fTableName: varchar('f_table_name', { length: 256 }),
  // TODO: failed to parse database type 'name'
  fGeometryColumn: varchar('f_geometry_column', { length: 256 }),
  coordDimension: integer('coord_dimension'),
  srid: integer(),
  type: varchar({ length: 30 }),
}).as(
  sql`SELECT current_database()::character varying(256) AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geometry_column, COALESCE(postgis_typmod_dims(a.atttypmod), sn.ndims, 2) AS coord_dimension, COALESCE(NULLIF(postgis_typmod_srid(a.atttypmod), 0), sr.srid, 0) AS srid, replace(replace(COALESCE(NULLIF(upper(postgis_typmod_type(a.atttypmod)), 'GEOMETRY'::text), st.type, 'GEOMETRY'::text), 'ZM'::text, ''::text), 'Z'::text, ''::text)::character varying(30) AS type FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped JOIN pg_namespace n ON c.relnamespace = n.oid JOIN pg_type t ON a.atttypid = t.oid LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ''''::text, 2), ')'::text, ''::text) AS type FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%geometrytype(% = %'::text) st ON st.connamespace = n.oid AND st.conrelid = c.oid AND (a.attnum = ANY (st.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text)::integer AS ndims FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%ndims(% = %'::text) sn ON sn.connamespace = n.oid AND sn.conrelid = c.oid AND (a.attnum = ANY (sn.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text), '('::text, ''::text)::integer AS srid FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%srid(% = %'::text) sr ON sr.connamespace = n.oid AND sr.conrelid = c.oid AND (a.attnum = ANY (sr.conkey)) WHERE (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT c.relname = 'raster_columns'::name AND t.typname = 'geometry'::name AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text)`,
);
