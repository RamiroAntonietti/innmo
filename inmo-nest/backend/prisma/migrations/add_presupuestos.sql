-- Presupuestos de propiedades (9.2)
-- Ejecutar: npx prisma db execute --file prisma/migrations/add_presupuestos.sql

DO $$ BEGIN
  CREATE TYPE "TipoPresupuesto" AS ENUM ('ALQUILER', 'VENTA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoPresupuesto" AS ENUM ('BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "presupuestos" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id"     TEXT NOT NULL,
  "codigo"        TEXT UNIQUE,
  "cliente_id"    TEXT NOT NULL,
  "tipo"          "TipoPresupuesto" NOT NULL,
  "monto_total"   DECIMAL(12,2) NOT NULL,
  "vigencia_hasta" TIMESTAMP(3) NOT NULL,
  "estado"        "EstadoPresupuesto" NOT NULL DEFAULT 'BORRADOR',
  "notas"         TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "presupuestos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "presupuestos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "presupuestos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "presupuestos_tenant_id_idx" ON "presupuestos"("tenant_id");
CREATE INDEX IF NOT EXISTS "presupuestos_cliente_id_idx" ON "presupuestos"("cliente_id");
CREATE INDEX IF NOT EXISTS "presupuestos_estado_idx" ON "presupuestos"("estado");

CREATE TABLE IF NOT EXISTS "presupuestos_propiedad" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "presupuesto_id" TEXT NOT NULL,
  "propiedad_id"   TEXT NOT NULL,
  "monto"          DECIMAL(12,2) NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "presupuestos_propiedad_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "presupuestos_propiedad_presupuesto_id_fkey" FOREIGN KEY ("presupuesto_id") REFERENCES "presupuestos"("id") ON DELETE CASCADE,
  CONSTRAINT "presupuestos_propiedad_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE,
  CONSTRAINT "presupuestos_propiedad_presupuesto_id_propiedad_id_key" UNIQUE ("presupuesto_id", "propiedad_id")
);
CREATE INDEX IF NOT EXISTS "presupuestos_propiedad_presupuesto_id_idx" ON "presupuestos_propiedad"("presupuesto_id");
CREATE INDEX IF NOT EXISTS "presupuestos_propiedad_propiedad_id_idx" ON "presupuestos_propiedad"("propiedad_id");
