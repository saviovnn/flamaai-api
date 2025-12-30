CREATE TABLE IF NOT EXISTS "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "biomas_ibge" (
	"gid" serial PRIMARY KEY NOT NULL,
	"cd_bioma" varchar(2),
	"bioma" varchar(100),
	"geom" geometry(multipolygon, 4674)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fire_risk" (
	"id" text PRIMARY KEY NOT NULL,
	"location_id" text NOT NULL,
	"weather_data_id" text NOT NULL,
	"week_start_date" timestamp NOT NULL,
	"week_end_date" timestamp NOT NULL,
	"daily_risks" jsonb NOT NULL,
	"weekly_risk_mean" double precision NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"rag_explanation" text NOT NULL,
	"model_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "location" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bioma_id" integer NOT NULL,
	"cd_mun" varchar(7) NOT NULL,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "municipios_ibge" (
	"gid" serial PRIMARY KEY NOT NULL,
	"cd_mun" varchar(7) NOT NULL,
	"nm_mun" varchar(100),
	"cd_rgi" varchar(6),
	"nm_rgi" varchar(100),
	"cd_rgint" varchar(4),
	"nm_rgint" varchar(100),
	"cd_uf" varchar(2),
	"nm_uf" varchar(50),
	"sigla_uf" varchar(2),
	"cd_regia" varchar(1),
	"nm_regia" varchar(20),
	"sigla_rg" varchar(2),
	"cd_concu" varchar(7),
	"nm_concu" varchar(100),
	"area_km2" double precision,
	"geom" geometry(multipolygon, 4674),
	CONSTRAINT "municipios_ibge_cdmun_unique" UNIQUE("cd_mun")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spatial_ref_sys" (
	"srid" integer PRIMARY KEY NOT NULL,
	"auth_name" varchar(256),
	"auth_srid" integer,
	"srtext" varchar(2048),
	"proj4text" varchar(2048),
	CONSTRAINT "spatial_ref_sys_srid_check" CHECK ((srid > 0) AND (srid <= 998999))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weather_data" (
	"id" text PRIMARY KEY NOT NULL,
	"location_id" text NOT NULL,
	"time" timestamp NOT NULL,
	"temperature_2m_max" double precision NOT NULL,
	"temperature_2m_min" double precision NOT NULL,
	"temperature_2m_mean" double precision NOT NULL,
	"relative_humidity_2m_mean" double precision NOT NULL,
	"precipitation_sum" double precision NOT NULL,
	"rain_sum" double precision,
	"windspeed_10m_max" double precision NOT NULL,
	"windgusts_10m_max" double precision NOT NULL,
	"et0_fao_evapotranspiration" double precision NOT NULL,
	"uv_index_max" double precision NOT NULL,
	"pm10" double precision NOT NULL,
	"pm2_5" double precision NOT NULL,
	"carbon_monoxide" double precision NOT NULL,
	"nitrogen_dioxide" double precision NOT NULL,
	"sulphur_dioxide" double precision NOT NULL,
	"ozone" double precision NOT NULL,
	"aerosol_optical_depth" double precision NOT NULL,
	"dust" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint 
		WHERE conname = 'municipios_ibge_cdmun_unique'
	) THEN
		ALTER TABLE "municipios_ibge" ADD CONSTRAINT "municipios_ibge_cdmun_unique" UNIQUE("cd_mun");
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_user_id_users_id_fk') THEN
		ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fire_risk_location_id_location_id_fk') THEN
		ALTER TABLE "fire_risk" ADD CONSTRAINT "fire_risk_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fire_risk_weather_data_id_weather_data_id_fk') THEN
		ALTER TABLE "fire_risk" ADD CONSTRAINT "fire_risk_weather_data_id_weather_data_id_fk" FOREIGN KEY ("weather_data_id") REFERENCES "public"."weather_data"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'location_user_id_users_id_fk') THEN
		ALTER TABLE "location" ADD CONSTRAINT "location_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'location_bioma_id_biomas_ibge_gid_fk') THEN
		ALTER TABLE "location" ADD CONSTRAINT "location_bioma_id_biomas_ibge_gid_fk" FOREIGN KEY ("bioma_id") REFERENCES "public"."biomas_ibge"("gid") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'location_cd_mun_municipios_ibge_cd_mun_fk') THEN
		ALTER TABLE "location" ADD CONSTRAINT "location_cd_mun_municipios_ibge_cd_mun_fk" FOREIGN KEY ("cd_mun") REFERENCES "public"."municipios_ibge"("cd_mun") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_users_id_fk') THEN
		ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weather_data_location_id_location_id_fk') THEN
		ALTER TABLE "weather_data" ADD CONSTRAINT "weather_data_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_indexes 
		WHERE indexname = 'municipios_ibge_geom_idx'
	) THEN
		CREATE INDEX "municipios_ibge_geom_idx" ON "municipios_ibge" USING gist ("geom" gist_geometry_ops_2d);
	END IF;
END $$;