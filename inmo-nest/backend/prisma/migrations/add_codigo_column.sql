-- Migración: Columna codigo para clientes y propiedades
-- Ejecutar en Supabase SQL Editor

ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;
ALTER TABLE "propiedades" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;
