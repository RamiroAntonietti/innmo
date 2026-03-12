-- Ejecutar en Supabase SQL Editor o: npx prisma db execute --file prisma/migrations/add_respuesta_consultas.sql
ALTER TABLE "consultas_portal" ADD COLUMN IF NOT EXISTS "respuesta" TEXT;
ALTER TABLE "consultas_portal" ADD COLUMN IF NOT EXISTS "respuesta_at" TIMESTAMP(3);
