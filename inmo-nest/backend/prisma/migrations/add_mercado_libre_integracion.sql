-- Preparación para integración Mercado Libre (publicar inmuebles)
-- Ejecutar en Supabase SQL Editor o con run-migrations.js

-- Tokens OAuth de Mercado Libre (se obtienen tras el flujo de autorización)
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ml_access_token" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ml_refresh_token" TEXT;

-- Tabla para vincular propiedades con publicaciones en Mercado Libre
CREATE TABLE IF NOT EXISTS "propiedades_mercado_libre" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "propiedad_id" UUID NOT NULL REFERENCES "propiedades"("id") ON DELETE CASCADE,
  "ml_item_id" TEXT NOT NULL,
  "ml_permalink" TEXT,
  "ml_status" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("propiedad_id")
);

CREATE INDEX IF NOT EXISTS "idx_prop_ml_tenant" ON "propiedades_mercado_libre"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_prop_ml_item" ON "propiedades_mercado_libre"("ml_item_id");
