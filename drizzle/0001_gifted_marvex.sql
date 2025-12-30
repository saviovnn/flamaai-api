CREATE TABLE IF NOT EXISTS "fire_risk_weather_data" (
	"id" text PRIMARY KEY NOT NULL,
	"fire_risk_id" text NOT NULL,
	"weather_data_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fire_risk_weather_data" ADD CONSTRAINT "fire_risk_weather_data_fire_risk_id_fire_risk_id_fk" FOREIGN KEY ("fire_risk_id") REFERENCES "public"."fire_risk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fire_risk_weather_data" ADD CONSTRAINT "fire_risk_weather_data_weather_data_id_weather_data_id_fk" FOREIGN KEY ("weather_data_id") REFERENCES "public"."weather_data"("id") ON DELETE cascade ON UPDATE no action;