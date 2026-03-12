-- Inventario de propiedades amuebladas (9.1)
-- Ejecutar: npx prisma db execute --file prisma/migrations/add_inventario_amueblada.sql

ALTER TABLE "propiedades" ADD COLUMN IF NOT EXISTS "amueblada" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  CREATE TYPE "EstadoInventario" AS ENUM ('BUENO', 'REGULAR', 'DETERIORADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "inventario_items" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id"    TEXT NOT NULL,
  "propiedad_id" TEXT NOT NULL,
  "nombre"       TEXT NOT NULL,
  "cantidad"     INTEGER NOT NULL DEFAULT 1,
  "estado"       "EstadoInventario" NOT NULL DEFAULT 'BUENO',
  "observaciones" TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventario_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventario_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "inventario_items_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "inventario_items_tenant_id_idx" ON "inventario_items"("tenant_id");
CREATE INDEX IF NOT EXISTS "inventario_items_propiedad_id_idx" ON "inventario_items"("propiedad_id");
