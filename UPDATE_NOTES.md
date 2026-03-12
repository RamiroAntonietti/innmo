# Update Notes — Cambios desde último commit

**Último commit:** `3aec75e` — feat: codigos entidades + landing actualizada  
**Fecha:** 11/03/2026

---

## Cambios recientes (sesión actual)

### Unificación Alquileres / Alquileres activos
- Eliminado ítem "Alquileres activos" del menú (Layout.vue).
- Filtro por estado en RentalsPage: Todos, Activos, Finalizados, Anulados.
- Backend `/rentals`: soporte para múltiples estados (`estado=ACTIVO,ATRASADO`).
- Ruta `/app/sales` redirige a `/app/rentals?estado=activos` (compatibilidad con enlaces antiguos).

### Logo en documentos PDF
- Composable `usePdfLogo.js`: agrega el logo del tenant a PDFs (arriba izquierda).
- ContratoPDFPage: logo en encabezado del PDF y en vista previa HTML.
- PresupuestosPage: logo en encabezado del PDF.
- El logo se toma de Configuración → Logo (tenant.logoUrl).

### Integración Mercado Libre (preparación)
- Schema: `mlAccessToken`, `mlRefreshToken` en Tenant; modelo `PropiedadMercadoLibre`.
- Migración `add_mercado_libre_integracion.sql`.
- MercadoLibreModule: endpoints GET auth-url, GET oauth/callback, POST publicar, PUT actualizar, DELETE despublicar, GET estado.
- Documentación `src/mercado-libre/INTEGRACION_MERCADOLIBRE.md` para el programador que implemente la integración.
- Tenant: DTO y update para tokens OAuth; enmascarado de mlAccessToken/mlRefreshToken en respuestas.

### Correcciones
- Tenant get(): añadido `mlAccessToken` y `mlRefreshToken` al select para enmascarar correctamente.

---

## Correcciones críticas (anteriores)

### Clientes
- **Estado INACTIVO:** Añadido al enum `EstadoCliente` en schema, DTO y frontend. Migración `add_estado_inactivo_cliente.sql`. El botón "Desactivar" ya no provoca error de constraint.

### API y rutas
- **GET /rentals/:id:** Nuevo endpoint para cargar un contrato individual con propiedad (incl. propietario), inquilino y tenant. Corrige 404 en ContratoPDFPage.
- **Redirección login/registro:** LoginPage y RegisterPage redirigen a `/app/dashboard` en lugar de `/dashboard`.
- **PropertyDetailPage:** Botones "Volver" y "Editar" usan `/app/properties` correctamente.

### Auditoría
- **AuditAccion:** Añadidos `DEPOSITO_DEVUELTO`, `DEPOSITO_RETENIDO` y `RENOVAR` al tipo. Corrige errores de compilación en rentals.

---

## Nuevas funcionalidades

### Portal propietario: liquidaciones
- Campo `comisionPorcentajeAlquiler` en Tenant (configurable en Cuenta).
- Desglose en portal: monto bruto, comisión inmobiliaria, neto al propietario.
- Migración `add_comision_alquiler_tenant.sql`.

### Estado ATRASADO en contratos
- Cron diario (medianoche) que:
  1. Marca `PagoAlquiler` PENDIENTE con `fechaVence` vencida como ATRASADO.
  2. Marca `ContratoAlquiler` ACTIVO como ATRASADO si tiene pagos vencidos sin abonar.
  3. Devuelve a ACTIVO los contratos ATRASADOS cuando ya no tienen pagos vencidos pendientes.

---

## Mejoras de UX y nomenclatura

- **MigracionPage:** Estados de cliente corregidos a "ACTIVO, INACTIVO, PROSPECTO o CERRADO".
- **LandingPage:** Typo corregido — "Gestión tu" → "Gestioná tu inmobiliaria".
- **ClientsPage:** Estado INACTIVO añadido al selector y al badge.

---

## Migraciones y base de datos

- **Documentación:** `prisma/migrations/MIGRACIONES.md` con orden de ejecución de las 14 migraciones.
- **Script:** `npm run db:migrate:manual` ejecuta todas las migraciones en orden.
- **Feedback:** Resumen al finalizar (ejecutadas, omitidas, errores).
- **Migraciones nuevas:** `add_estado_inactivo_cliente.sql`, `add_comision_alquiler_tenant.sql`.

---

## Documentación

- **INCOHERENCIAS_Y_MEJORAS.md:** Renovado con análisis de errores e incoherencias; ítems resueltos marcados.
- **Pendientes:** Sección 9 con Inventario de propiedades (amuebladas) y Presupuestos de propiedades (varias propiedades por presupuesto).

---

## Archivos modificados (resumen)

| Área | Archivos |
|------|----------|
| Backend | `rentals.module.ts`, `portal.service.ts`, `tenant/tenant.module.ts`, `audit.service.ts`, `clients.service.ts`, `clients.dto.ts`, `app.module.ts` |
| Frontend | `Layout.vue`, `RentalsPage.vue`, `ContratoPDFPage.vue`, `PresupuestosPage.vue`, `router/index.js`, `LoginPage.vue`, `RegisterPage.vue`, `PropertyDetailPage.vue`, `LandingPage.vue`, `ClientsPage.vue`, `PropietarioHome.vue`, `CuentaPage.vue`, `MigracionPage.vue` |
| Schema | `prisma/schema.prisma` |
| Migraciones | `add_estado_inactivo_cliente.sql`, `add_comision_alquiler_tenant.sql`, `add_mercado_libre_integracion.sql` |
| Nuevos | `composables/usePdfLogo.js`, `mercado-libre/mercado-libre.module.ts`, `mercado-libre/INTEGRACION_MERCADOLIBRE.md`, `prisma/migrations/MIGRACIONES.md`, `prisma/run-migrations.js` |
| Docs | `INCOHERENCIAS_Y_MEJORAS.md`, `UPDATE_NOTES.md` |

---

## Pendiente (no implementado)

- Webhook Mercado Pago: validación de firma.
- Integración Mercado Libre: implementar métodos TODO en MercadoLibreService (OAuth, publicar, actualizar, despublicar).
