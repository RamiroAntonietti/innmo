-- Migración: Renombrar columna baños → banos (evitar caracteres especiales)
-- Solo ejecuta si la columna "baños" existe. Si ya es "banos", no hace nada.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'propiedades' AND column_name = 'baños'
  ) THEN
    ALTER TABLE "propiedades" RENAME COLUMN "baños" TO "banos";
  END IF;
END $$;
