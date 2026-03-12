-- Migración: Columna codigo para gastos_propiedad
-- Ejecutar en Supabase SQL Editor o: psql -f add_codigo_gastos_propiedad.sql

ALTER TABLE "gastos_propiedad" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;
