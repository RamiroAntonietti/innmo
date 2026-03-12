-- Migración: Consultas del portal (inquilinos/propietarios)
-- Ejecutar en Supabase SQL Editor o: npx prisma db execute --file prisma/migrations/add_consultas_portal.sql

CREATE TABLE "consultas_portal" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id"  TEXT NOT NULL,
  "cliente_id" TEXT NOT NULL,
  "rol"        "RolPortal" NOT NULL,
  "mensaje"    TEXT NOT NULL,
  "leido"      BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "consultas_portal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "consultas_portal_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "consultas_portal_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE
);

CREATE INDEX "consultas_portal_tenant_id_idx" ON "consultas_portal"("tenant_id");
CREATE INDEX "consultas_portal_cliente_id_idx" ON "consultas_portal"("cliente_id");
CREATE INDEX "consultas_portal_leido_idx" ON "consultas_portal"("leido");
