-- Migración: Columna fecha_vence en pagos_alquiler
-- Ejecutar en Supabase SQL Editor o: npx prisma db execute --file prisma/migrations/add_fecha_vence_pago_alquiler.sql

-- 1. Agregar columna nullable
ALTER TABLE "pagos_alquiler" ADD COLUMN IF NOT EXISTS "fecha_vence" TIMESTAMP(3);

-- 2. Poblar: fecha_pago si existe (era la fecha de vencimiento antes), sino created_at
UPDATE "pagos_alquiler" SET "fecha_vence" = COALESCE("fecha_pago", "created_at") WHERE "fecha_vence" IS NULL;

-- 3. Hacer NOT NULL
ALTER TABLE "pagos_alquiler" ALTER COLUMN "fecha_vence" SET NOT NULL;
