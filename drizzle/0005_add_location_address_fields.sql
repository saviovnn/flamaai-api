-- Adiciona campos de endereço na tabela location
ALTER TABLE "location" ADD COLUMN IF NOT EXISTS "public_place" text;
ALTER TABLE "location" ADD COLUMN IF NOT EXISTS "neighborhood" text;
ALTER TABLE "location" ADD COLUMN IF NOT EXISTS "state" varchar(2);
