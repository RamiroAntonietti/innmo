-- Ejecutar en Supabase SQL Editor o: npx prisma db execute --file prisma/migrations/add_comision_alquiler_tenant.sql
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "comision_porcentaje_alquiler" DECIMAL(5,2);
