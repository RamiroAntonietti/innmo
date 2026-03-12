-- Configuración del tenant (logo, MP, ML)
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "direccion" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "sitio_web" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mp_access_token" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mp_public_key" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ml_app_id" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ml_client_id" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ml_client_secret" TEXT;
