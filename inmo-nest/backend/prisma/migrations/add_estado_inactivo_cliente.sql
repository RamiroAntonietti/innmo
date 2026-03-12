-- Añadir valor INACTIVO al enum EstadoCliente
-- Ejecutar en Supabase SQL Editor o: npx prisma db execute --file prisma/migrations/add_estado_inactivo_cliente.sql

ALTER TYPE "EstadoCliente" ADD VALUE IF NOT EXISTS 'INACTIVO';
