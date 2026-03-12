-- Migración: Datos fiscales para Tenant y Cliente
-- Ejecutar en Supabase SQL Editor si el login da error 500

-- Tenant (inmobiliaria - emisor de facturas)
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "cuit" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "razon_social" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "condicion_iva" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "domicilio_fiscal" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "punto_venta" INTEGER;

-- Cliente (receptor de facturas)
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "cuit" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "razon_social" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "condicion_iva" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "domicilio_fiscal" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "requiere_factura" BOOLEAN NOT NULL DEFAULT false;
