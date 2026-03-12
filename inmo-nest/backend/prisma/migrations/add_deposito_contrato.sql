-- Ejecutar en Supabase SQL Editor o: npx prisma db execute --file prisma/migrations/add_deposito_contrato.sql
DO $$ BEGIN
  CREATE TYPE "EstadoDeposito" AS ENUM ('PENDIENTE', 'DEVUELTO', 'RETENIDO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "contratos_alquiler" ADD COLUMN IF NOT EXISTS "deposito" DECIMAL(12,2);
ALTER TABLE "contratos_alquiler" ADD COLUMN IF NOT EXISTS "deposito_estado" "EstadoDeposito";
ALTER TABLE "contratos_alquiler" ADD COLUMN IF NOT EXISTS "deposito_devuelto_at" TIMESTAMP(3);
ALTER TABLE "contratos_alquiler" ADD COLUMN IF NOT EXISTS "deposito_notas" TEXT;
