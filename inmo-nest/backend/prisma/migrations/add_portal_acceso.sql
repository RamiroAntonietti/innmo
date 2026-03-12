-- CreateEnum
CREATE TYPE "RolPortal" AS ENUM ('INQUILINO', 'PROPIETARIO');

-- CreateTable
CREATE TABLE "portal_accesos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "RolPortal" NOT NULL DEFAULT 'INQUILINO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "primer_login" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_accesos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portal_accesos_cliente_id_key" ON "portal_accesos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "portal_accesos_tenant_id_email_key" ON "portal_accesos"("tenant_id", "email");

-- AddForeignKey
ALTER TABLE "portal_accesos" ADD CONSTRAINT "portal_accesos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_accesos" ADD CONSTRAINT "portal_accesos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
