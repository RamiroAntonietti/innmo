-- Migración: Preparación para facturación electrónica (AFIP/ARCA)
-- Ejecutar en Supabase SQL Editor
-- Incluye: datos fiscales, columna codigo, tabla facturas_emitidas

-- 1. Columna codigo (si no existe)
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;
ALTER TABLE "propiedades" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;
ALTER TABLE "contratos_alquiler" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;
ALTER TABLE "pagos_alquiler" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;

-- 2. Datos fiscales Tenant (emisor)
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "cuit" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "razon_social" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "condicion_iva" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "domicilio_fiscal" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "punto_venta" INTEGER;

-- 3. Datos fiscales Cliente (receptor)
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "cuit" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "razon_social" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "condicion_iva" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "domicilio_fiscal" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "requiere_factura" BOOLEAN NOT NULL DEFAULT false;

-- 4. Tabla facturas_emitidas (a clientes - para integración AFIP)
CREATE TABLE IF NOT EXISTS "facturas_emitidas" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id" TEXT NOT NULL,
  "cliente_id" TEXT NOT NULL,
  "codigo" TEXT UNIQUE,
  "tipo_comprobante" TEXT NOT NULL,
  "punto_venta" INTEGER NOT NULL,
  "numero" INTEGER,
  "fecha_emision" TIMESTAMP(3) NOT NULL,
  "concepto" INTEGER NOT NULL DEFAULT 2,
  "descripcion" TEXT,
  "monto_neto" DECIMAL(12,2) NOT NULL,
  "monto_iva" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "monto_total" DECIMAL(12,2) NOT NULL,
  "cae" TEXT,
  "fecha_vencimiento_cae" TIMESTAMP(3),
  "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
  "error_afip" TEXT,
  "operacion_venta_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "facturas_emitidas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facturas_emitidas_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "facturas_emitidas_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "facturas_emitidas_tenant_id_idx" ON "facturas_emitidas"("tenant_id");
CREATE INDEX IF NOT EXISTS "facturas_emitidas_cliente_id_idx" ON "facturas_emitidas"("cliente_id");
CREATE INDEX IF NOT EXISTS "facturas_emitidas_fecha_emision_idx" ON "facturas_emitidas"("fecha_emision");
