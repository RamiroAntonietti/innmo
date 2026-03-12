-- ============================================================
-- MIGRACIONES PARA SUPABASE - Ejecutar en SQL Editor
-- ============================================================
-- Copiá cada bloque y ejecutalo por separado.
-- Si da error "already exists", omití ese bloque y seguí.
-- Orden: 1 → 2 → 3 → ... → 15
-- ============================================================

-- ---------- 1. CÓDIGO (clientes, propiedades) ----------
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;
ALTER TABLE "propiedades" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;


-- ---------- 2. DATOS FISCALES ----------
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "cuit" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "razon_social" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "condicion_iva" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "domicilio_fiscal" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "punto_venta" INTEGER;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "cuit" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "razon_social" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "condicion_iva" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "domicilio_fiscal" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "requiere_factura" BOOLEAN NOT NULL DEFAULT false;


-- ---------- 3. GASTOS PROPIEDAD (omitir si ya existe la tabla) ----------
DO $$ BEGIN
  CREATE TYPE "TipoGasto" AS ENUM ('REPARACION', 'IMPUESTO', 'EXPENSA', 'SEGURO', 'SERVICIO', 'HONORARIO', 'OTRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "PagadoPor" AS ENUM ('PROPIETARIO', 'INMOBILIARIA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "gastos_propiedad" (
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
  CONSTRAINT "gastos_propiedad_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "gastos_propiedad_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "gastos_propiedad_tenant_id_idx" ON "gastos_propiedad"("tenant_id");
CREATE INDEX IF NOT EXISTS "gastos_propiedad_propiedad_id_idx" ON "gastos_propiedad"("propiedad_id");


-- ---------- 4. CÓDIGO GASTOS ----------
ALTER TABLE "gastos_propiedad" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;


-- ---------- 5. PORTAL ACCESOS (omitir si ya existe) ----------
DO $$ BEGIN
  CREATE TYPE "RolPortal" AS ENUM ('INQUILINO', 'PROPIETARIO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "portal_accesos" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id" TEXT NOT NULL,
  "cliente_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "rol" "RolPortal" NOT NULL DEFAULT 'INQUILINO',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "primer_login" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portal_accesos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "portal_accesos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "portal_accesos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "portal_accesos_cliente_id_key" ON "portal_accesos"("cliente_id");
CREATE UNIQUE INDEX IF NOT EXISTS "portal_accesos_tenant_id_email_key" ON "portal_accesos"("tenant_id", "email");


-- ---------- 6. CONSULTAS PORTAL ----------
CREATE TABLE IF NOT EXISTS "consultas_portal" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id"  TEXT NOT NULL,
  "cliente_id" TEXT NOT NULL,
  "rol"        "RolPortal" NOT NULL,
  "mensaje"    TEXT NOT NULL,
  "leido"      BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consultas_portal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "consultas_portal_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "consultas_portal_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "consultas_portal_tenant_id_idx" ON "consultas_portal"("tenant_id");
CREATE INDEX IF NOT EXISTS "consultas_portal_cliente_id_idx" ON "consultas_portal"("cliente_id");
CREATE INDEX IF NOT EXISTS "consultas_portal_leido_idx" ON "consultas_portal"("leido");


-- ---------- 7. RESPUESTA CONSULTAS ----------
ALTER TABLE "consultas_portal" ADD COLUMN IF NOT EXISTS "respuesta" TEXT;
ALTER TABLE "consultas_portal" ADD COLUMN IF NOT EXISTS "respuesta_at" TIMESTAMP(3);


-- ---------- 8. MERCADO PAGO ----------
ALTER TYPE "FormaPago" ADD VALUE IF NOT EXISTS 'MERCADOPAGO';
CREATE TABLE IF NOT EXISTS "pagos_mercado_pago" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "pago_alquiler_id" TEXT NOT NULL,
  "preference_id" TEXT NOT NULL,
  "payment_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "init_point" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pagos_mercado_pago_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pagos_mercado_pago_pago_alquiler_id_fkey" FOREIGN KEY ("pago_alquiler_id") REFERENCES "pagos_alquiler"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "pagos_mercado_pago_pago_alquiler_id_key" ON "pagos_mercado_pago"("pago_alquiler_id");


-- ---------- 9. FECHA_VENCE (CRÍTICO para dashboard) ----------
ALTER TABLE "pagos_alquiler" ADD COLUMN IF NOT EXISTS "fecha_vence" TIMESTAMP(3);
UPDATE "pagos_alquiler" SET "fecha_vence" = COALESCE("fecha_pago", "created_at", CURRENT_TIMESTAMP) WHERE "fecha_vence" IS NULL;
ALTER TABLE "pagos_alquiler" ALTER COLUMN "fecha_vence" SET NOT NULL;


-- ---------- 10. DEPÓSITO CONTRATO ----------
DO $$ BEGIN
  CREATE TYPE "EstadoDeposito" AS ENUM ('PENDIENTE', 'DEVUELTO', 'RETENIDO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "contratos_alquiler" ADD COLUMN IF NOT EXISTS "deposito" DECIMAL(12,2);
ALTER TABLE "contratos_alquiler" ADD COLUMN IF NOT EXISTS "deposito_estado" "EstadoDeposito";
ALTER TABLE "contratos_alquiler" ADD COLUMN IF NOT EXISTS "deposito_devuelto_at" TIMESTAMP(3);
ALTER TABLE "contratos_alquiler" ADD COLUMN IF NOT EXISTS "deposito_notas" TEXT;


-- ---------- 11. COMISIÓN ALQUILER ----------
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "comision_porcentaje_alquiler" DECIMAL(5,2);


-- ---------- 12. ESTADO INACTIVO CLIENTE ----------
ALTER TYPE "EstadoCliente" ADD VALUE IF NOT EXISTS 'INACTIVO';


-- ---------- 13. CÓDIGO (contratos, pagos) + FACTURAS_EMITIDAS ----------
ALTER TABLE "contratos_alquiler" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;
ALTER TABLE "pagos_alquiler" ADD COLUMN IF NOT EXISTS "codigo" TEXT UNIQUE;
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
  CONSTRAINT "facturas_emitidas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "facturas_emitidas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "facturas_emitidas_tenant_id_idx" ON "facturas_emitidas"("tenant_id");
CREATE INDEX IF NOT EXISTS "facturas_emitidas_cliente_id_idx" ON "facturas_emitidas"("cliente_id");
CREATE INDEX IF NOT EXISTS "facturas_emitidas_fecha_emision_idx" ON "facturas_emitidas"("fecha_emision");


-- ---------- 14. RENOMBRAR BAÑOS (opcional) ----------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'propiedades' AND column_name = 'baños'
  ) THEN
    ALTER TABLE "propiedades" RENAME COLUMN "baños" TO "banos";
  END IF;
END $$;


-- ---------- 15. INVENTARIO PROPIEDADES AMUEBLADAS ----------
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


-- ---------- 16. PRESUPUESTOS ----------
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


-- ---------- 17. CONFIGURACIÓN TENANT ----------
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "direccion" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "sitio_web" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mp_access_token" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mp_public_key" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ml_app_id" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ml_client_id" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ml_client_secret" TEXT;
