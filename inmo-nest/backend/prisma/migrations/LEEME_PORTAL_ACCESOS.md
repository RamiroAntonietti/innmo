# Migración: tabla portal_accesos

Si el backend falla con "The table `public.portal_accesos` does not exist", ejecutá la migración.

## Opción 1: Prisma (recomendado)

```bash
cd inmo-nest/backend
npx prisma db push
```

O si usás migraciones:

```bash
npx prisma migrate deploy
```

## Opción 2: SQL manual (Supabase / psql)

Ejecutá el contenido de `add_portal_acceso.sql` en el editor SQL de Supabase o con psql.
