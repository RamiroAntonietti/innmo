-- Agregar MERCADOPAGO a FormaPago
ALTER TYPE "FormaPago" ADD VALUE IF NOT EXISTS 'MERCADOPAGO';

-- Tabla pagos_mercado_pago
CREATE TABLE IF NOT EXISTS "pagos_mercado_pago" (
    "id" TEXT NOT NULL,
    "pago_alquiler_id" TEXT NOT NULL,
    "preference_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "init_point" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_mercado_pago_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pagos_mercado_pago_pago_alquiler_id_key" ON "pagos_mercado_pago"("pago_alquiler_id");

ALTER TABLE "pagos_mercado_pago" ADD CONSTRAINT "pagos_mercado_pago_pago_alquiler_id_fkey" 
  FOREIGN KEY ("pago_alquiler_id") REFERENCES "pagos_alquiler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
