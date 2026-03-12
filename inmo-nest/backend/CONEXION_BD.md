# Conexión a la base de datos (Supabase)

## Error: "Timed out fetching a new connection from the connection pool"

Este error ocurre cuando Prisma intenta usar más conexiones de las permitidas (ej. Supabase free tier con límite bajo).

### Solución: ajustar DATABASE_URL

En tu archivo `.env`, asegurate de usar la **URL del pooler** de Supabase y parámetros adecuados:

```
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5"
```

**Importante:**
- Usá el **pooler** (puerto **6543**), no la conexión directa (5432).
- Host: `*.pooler.supabase.com`
- Agregá `?pgbouncer=true` para modo transacción.
- Agregá `&connection_limit=5` para permitir varias consultas en paralelo (dashboard, etc.).

### Dónde encontrar la URL en Supabase

1. Proyecto Supabase → **Settings** → **Database**
2. En **Connection string**, elegí **URI**
3. Usá la opción **Transaction** (pooler, puerto 6543)
4. Reemplazá `[YOUR-PASSWORD]` por tu contraseña
5. Agregá al final: `&connection_limit=5`

### Ejemplo completo

```
DATABASE_URL="postgresql://postgres.abcdefgh:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5"
```

### Si sigue fallando

- Probá con `connection_limit=3` (menos conexiones).
- Verificá que no haya otros procesos usando la BD (migraciones, Prisma Studio, etc.).
- Reiniciá el backend después de cambiar el `.env`.
