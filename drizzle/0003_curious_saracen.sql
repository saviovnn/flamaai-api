-- Adiciona a coluna preference com valor padrão para registros existentes
ALTER TABLE "location" ADD COLUMN "preference" varchar(10) DEFAULT 'weather' NOT NULL;