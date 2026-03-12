# Migraciones SQL manuales

Este proyecto usa scripts SQL manuales en lugar del flujo estándar `prisma migrate`. Las migraciones deben ejecutarse en el orden indicado.

## Orden de ejecución

Ejecutar en este orden (las que usan `IF NOT EXISTS` son idempotentes y pueden omitirse si ya se aplicaron):

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `add_codigo_column.sql` | Columna `codigo` en clientes y propiedades |
| 2 | `add_fiscal_data.sql` | Datos fiscales en tenants y clientes |
| 4 | `add_gastos_propiedad.sql` | Tabla gastos de propiedad |
| 5 | `add_codigo_gastos_propiedad.sql` | Columna `codigo` en gastos |
| 6 | `add_portal_acceso.sql` | Tabla portal_accesos |
| 7 | `add_consultas_portal.sql` | Tabla consultas_portal |
| 8 | `add_respuesta_consultas.sql` | Columnas `respuesta` y `respuesta_at` en consultas_portal |
| 9 | `add_mercado_pago.sql` | Tabla pagos_mercado_pago |
| 10 | `add_fecha_vence_pago_alquiler.sql` | Columna `fecha_vence` en pagos_alquiler (**requerido para dashboard**) |
| 11 | `add_deposito_contrato.sql` | Campos depósito en contratos_alquiler |
| 12 | `add_comision_alquiler_tenant.sql` | Columna `comision_porcentaje_alquiler` en tenants |
| 13 | `add_estado_inactivo_cliente.sql` | Valor `INACTIVO` en enum EstadoCliente |
| 14 | `preparacion_facturacion_electronica.sql` | Consolidado: facturas_emitidas, datos fiscales, códigos. Alternativa a 2, 3 y tabla facturas. |
| 15 | `rename_banos_column.sql` | Renombra `baños` → `banos` (solo si existe). Opcional; al final por si falla conexión. |
| 16 | `add_inventario_amueblada.sql` | Columna `amueblada` en propiedades + tabla `inventario_items` (9.1) |
| 17 | `add_presupuestos.sql` | Tablas `presupuestos` y `presupuestos_propiedad` (9.2) |
| 18 | `add_tenant_config.sql` | Logo, dirección, MP, ML en tenants |

**Nota:** `preparacion_facturacion_electronica.sql` puede usarse como migración única para bases nuevas. En bases existentes, preferir las migraciones individuales.

## Cómo ejecutar

### Opción A: Supabase SQL Editor (recomendado)

1. Abrir el SQL Editor en el proyecto de Supabase.
2. Abrir el archivo `SUPABASE_EJECUTAR.sql` (contiene todos los comandos en orden).
3. Copiar y pegar **cada bloque** (separado por `-- ---------- N. ...`) y ejecutar uno por uno.
4. Si un bloque da error "already exists", omitirlo y seguir con el siguiente.

### Opción B: Prisma db execute (CLI)

```bash
cd inmo-nest/backend

# Ejecutar una migración
npx prisma db execute --file prisma/migrations/add_fecha_vence_pago_alquiler.sql

# O todas en orden (PowerShell)
Get-Content prisma/migrations/add_fecha_vence_pago_alquiler.sql | npx prisma db execute --stdin
```

### Opción C: Script npm (todas en orden)

```bash
cd inmo-nest/backend
npm run db:migrate:manual
```

Ejecuta todas las migraciones en el orden documentado. Al finalizar verás un resumen:
```
═══════════════════════════════════════
  MIGRACIONES FINALIZADAS
  ✅ Ejecutadas: X  ⏭️ Omitidas: Y  ❌ Errores: Z
═══════════════════════════════════════
```
Los errores (ej. columna ya existe) se registran pero no detienen el proceso.

## Verificación

Tras ejecutar las migraciones, regenerar el cliente Prisma:

```bash
npx prisma generate
```

## Errores frecuentes

- **"column fecha_vence does not exist"** → Ejecutar `add_fecha_vence_pago_alquiler.sql`
- **"column baños does not exist"** → La columna ya es `banos`; omitir `rename_banos_column.sql`
- **"type EstadoCliente does not exist"** → La base fue creada con Prisma; el enum ya existe. Para `add_estado_inactivo_cliente.sql`, usar solo: `ALTER TYPE "EstadoCliente" ADD VALUE IF NOT EXISTS 'INACTIVO';`
- **P1017 "Server has closed the connection"** → Timeout o conexión cerrada por Supabase. Apagar el backend, ejecutar migraciones de a una en Supabase SQL Editor, o reintentar. La migración `rename_banos_column` se movió al final y es opcional.
