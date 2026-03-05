-- Migración: Gestión de gastos por propiedad
-- Ejecutar en Supabase SQL Editor

CREATE TYPE "TipoGasto" AS ENUM ('REPARACION', 'IMPUESTO', 'EXPENSA', 'SEGURO', 'SERVICIO', 'HONORARIO', 'OTRO');
CREATE TYPE "PagadoPor" AS ENUM ('PROPIETARIO', 'INMOBILIARIA');

CREATE TABLE "gastos_propiedad" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id"    TEXT NOT NULL,
  "propiedad_id" TEXT NOT NULL,
  "tipo"         "TipoGasto" NOT NULL,
  "descripcion"  TEXT NOT NULL,
  "monto"        DECIMAL(12,2) NOT NULL,
  "fecha"        TIMESTAMP(3) NOT NULL,
  "pagado_por"   "PagadoPor" NOT NULL DEFAULT 'PROPIETARIO',
  "comprobante"  TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "gastos_propiedad_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gastos_propiedad_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "gastos_propiedad_propiedad_id_fkey"
    FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE
);

CREATE INDEX "gastos_propiedad_tenant_id_idx" ON "gastos_propiedad"("tenant_id");
CREATE INDEX "gastos_propiedad_propiedad_id_idx" ON "gastos_propiedad"("propiedad_id");
