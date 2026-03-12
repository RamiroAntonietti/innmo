# Revisión del sistema de alquileres — Incoherencias y mejoras

Análisis realizado considerando que el sistema está orientado a **gestión de alquileres** de propiedades.

**Última actualización:** 11/03/2025

---

## 1. Incoherencias críticas

### 1.1 ~~Estado INACTIVO inexistente en clientes~~ ✅ Resuelto

- **Problema:** `ClientsService.desactivar()` asigna `estado: 'INACTIVO'`, pero el enum `EstadoCliente` en Prisma solo tenía `ACTIVO`, `PROSPECTO`, `CERRADO`.
- **Implementado:** Añadido `INACTIVO` al enum en schema, DTO, ClientsPage y MigracionPage. Migración `add_estado_inactivo_cliente.sql`.

### 1.2 ~~Falta endpoint GET /rentals/:id~~ ✅ Resuelto

- **Problema:** `ContratoPDFPage.vue` llamaba a `GET /rentals/:id` para cargar un contrato individual. El endpoint no existía.
- **Implementado:** Endpoint `GET /rentals/:id` que devuelve el contrato con `propiedad` (titulo, direccion, ciudad, propietario), `inquilino` y `tenant`.

### 1.3 ~~Redirección incorrecta tras login/registro~~ ✅ Resuelto

- **Problema:** `LoginPage.vue` y `RegisterPage.vue` redirigían a `/dashboard` en lugar de `/app/dashboard`.
- **Implementado:** Cambiado a `router.push('/app/dashboard')` en ambos archivos.

### 1.4 Webhook de Mercado Pago sin validación de firma

- **Problema:** `POST /portal/pago-mp/webhook` es público y no valida la firma de Mercado Pago.
- **Efecto:** Cualquiera podría enviar notificaciones falsas y marcar pagos como aprobados.
- **Ubicación:** `portal.controller.ts`, `mercado-pago.service.ts`
- **Solución:** Validar la firma `x-signature` con el secret de Mercado Pago antes de procesar.

---

## 2. Incoherencias de nomenclatura y UX

### 2.1 ~~Ruta incorrecta en PropertyDetailPage~~ ✅ Resuelto

- **Problema:** El botón "Volver" usaba `$router.push('/properties')` en lugar de `/app/properties`.
- **Implementado:** Corregidas las rutas a `/app/properties` (Volver y Editar).

### 2.2 ~~Estados de cliente incorrectos en MigracionPage~~ ✅ Resuelto

- **Problema:** MigracionPage indicaba "ACTIVO, INACTIVO o POTENCIAL"; el enum real es `ACTIVO`, `INACTIVO`, `PROSPECTO`, `CERRADO`.
- **Implementado:** Descripción actualizada a "ACTIVO, INACTIVO, PROSPECTO o CERRADO" (junto con la corrección 1.1).

### 2.3 ~~Typo en LandingPage~~ ✅ Resuelto

- **Problema:** Texto "Gestión tu inmobiliaria" (sustantivo) en lugar del imperativo "Gestioná tu inmobiliaria".
- **Implementado:** Corregido a "Gestioná tu inmobiliaria".

---

## 3. Funcionalidades incompletas o incoherentes

### 3.1 ~~Alquileres: botones sin implementar~~ ✅ Resuelto

- "Ver pagos" abre un modal con el historial de pagos del contrato.
- "Ajuste" abre un modal para configurar (IPC o fijo), previsualizar y ejecutar el ajuste.

### 3.2 ~~Consultas del portal: sin respuesta~~ ✅ Resuelto

- Las consultas permiten responder desde la app (ConsultasPage).
- Opción de enviar la respuesta por email al cliente.

### 3.3 ~~FacturaServicio vs. FacturaEmitida~~ ✅ Resuelto

- **Servicios por propiedad:** luz, gas, expensas.
- **Facturas a clientes (AFIP):** comprobantes fiscales electrónicos.
- Etiquetas actualizadas en menú, páginas y portal.

---

## 4. Mejoras sugeridas para un sistema de alquileres

### 4.1 ~~Generación de cuotas mensuales~~ ✅ Resuelto

- Cuotas generadas al crear contrato; ajustes IPC/fijo actualizan pendientes.

### 4.2 ~~Depósito / garantía~~ ✅ Resuelto

- Campo `deposito` en ContratoAlquiler; botón "Depósito" para devolución/retención.

### 4.3 ~~Vencimiento de contrato~~ ✅ Resuelto

- Cron diario marca FINALIZADO; botón "Renovar" para contratos próximos a vencer.

### 4.4 ~~Filtro de propiedades disponibles~~ ✅ Resuelto

- Propiedades DISPONIBLE y RESERVADO al crear contrato.

### 4.5 ~~Dashboard~~ ✅ Resuelto

- Contratos por vencer, ingresos proyectados, consultas sin leer.

### 4.6 ~~Portal propietario: liquidaciones~~ ✅ Resuelto

- Desglose bruto, comisión, neto; configuración en Cuenta.

### 4.7 ~~Estado ATRASADO en contrato~~ ✅ Resuelto

- Cron diario actualiza PagoAlquiler y ContratoAlquiler según pagos vencidos.

---

## 5. Migraciones y base de datos

### 5.1 ~~Migraciones SQL manuales~~ ✅ Documentado

- **Problema:** Las migraciones estaban en `prisma/migrations/*.sql` como scripts sueltos, sin orden documentado.
- **Implementado:** `prisma/migrations/MIGRACIONES.md` con orden de ejecución, instrucciones y script `npm run db:migrate:manual`.

### 5.2 Columna fecha_vence en pagos_alquiler

- **Problema:** Si la migración `add_fecha_vence_pago_alquiler.sql` no se ejecutó, el dashboard falla con "column fecha_vence does not exist".
- **Solución:** Ejecutar la migración en Supabase SQL Editor o con `npx prisma db execute --file prisma/migrations/add_fecha_vence_pago_alquiler.sql`.

### 5.3 Orden de migraciones

- `add_consultas_portal.sql` crea la tabla; `add_respuesta_consultas.sql` añade `respuesta` y `respuesta_at`. Debe respetarse el orden.

---

## 6. ~~Código muerto o duplicado~~ ✅ Resuelto

| Archivo | Descripción |
|---------|-------------|
| ~~`pages/ClientsPage.vue` (raíz)~~ | Eliminado; el router usa `pages/clients/ClientsPage.vue` |
| ~~`layout/Layout.vue`~~ | Eliminado; el router usa `components/layout/Layout.vue` |
| ~~`prisma_schema.prisma` (raíz backend)~~ | Eliminado; Prisma usa `prisma/schema.prisma` |
| ~~`*.module.ts.bak`~~ | Eliminados (dashboard, rentals, usuarios) |

---

## 7. Seguridad y validación

| # | Tipo | Descripción |
|---|------|-------------|
| 1 | Seguridad | Webhook Mercado Pago sin validación de firma (ver 1.4) |
| 2 | Validación | `forbidNonWhitelisted: false` en `main.ts` permite campos extra en el body |
| 3 | Validación | Revisar DTOs de creación para evitar persistir campos no esperados |

---

## 8. Resumen de prioridades

### Alta (corregir pronto)

| Item | Acción |
|------|--------|
| ~~Estado INACTIVO en clientes~~ | ✅ Resuelto |
| ~~GET /rentals/:id~~ | ✅ Resuelto |
| ~~Redirección login/registro~~ | ✅ Resuelto |
| Webhook Mercado Pago | Validar firma antes de procesar |

### Media

| Item | Acción |
|------|--------|
| ~~PropertyDetailPage "Volver"~~ | ✅ Resuelto |
| ~~MigracionPage estados cliente~~ | ✅ Resuelto |
| ~~Migraciones manuales~~ | ✅ Documentado en MIGRACIONES.md |

### Baja

| Item | Acción |
|------|--------|
| ~~Código muerto~~ | ✅ Eliminados duplicados y `.bak` |
| ~~Typo LandingPage~~ | ✅ Resuelto |
| Relación FacturaEmitida ↔ OperacionVenta | Completar en schema si aplica |

---

## 9. Pendientes (funcionalidades futuras)

### 9.1 ~~Inventario de propiedades (amuebladas)~~ ✅ Implementado

**Descripción:** Registro de muebles, electrodomésticos y elementos que integran una propiedad amueblada, para entregar al inquilino al firmar el contrato y verificar al finalizar.

**Forma más ágil de implementar:**

1. **Modelo mínimo:** Crear tabla `InventarioItem` vinculada a `Propiedad` (o a `ContratoAlquiler` si el inventario es por contrato): `propiedadId`, `nombre`, `cantidad`, `estado` (opcional: BUENO/REGULAR/DETERIORADO), `observaciones`. Campo booleano `amueblada` en Propiedad para filtrar.
2. **UI simple:** En el detalle de la propiedad, pestaña o sección "Inventario" visible solo si `amueblada = true`. Lista editable (agregar/quitar ítems) sin modal complejo.
3. **PDF:** Incluir el inventario en el contrato PDF existente cuando la propiedad sea amueblada, o generar un anexo descargable.
4. **Evitar:** No crear un módulo separado al inicio; integrar en PropertyDetailPage. No modelar valor monetario por ítem en la primera versión.

**Implementado:** Campo `amueblada` en Propiedad, tabla `InventarioItem` (nombre, cantidad, estado BUENO/REGULAR/DETERIORADO, observaciones). Sección Inventario en PropertyDetailPage cuando amueblada=true. Endpoints CRUD en `/properties/:id/inventario`. Inventario incluido en PDF del contrato. Migración `add_inventario_amueblada.sql` y bloque 15 en SUPABASE_EJECUTAR.sql.

---

### 9.2 ~~Presupuestos de propiedades~~ ✅ Implementado

**Descripción:** Generar presupuestos o cotizaciones para alquiler o venta, con vigencia, condiciones y posibilidad de convertirlos en contrato/operación. Un presupuesto puede incluir **varias propiedades**.

**Forma más ágil de implementar:**

1. **Modelo mínimo:** Tabla `Presupuesto` con `tenantId`, `clienteId` (interesado), `tipo` (ALQUILER/VENTA), `montoTotal`, `vigenciaHasta`, `estado` (BORRADOR/ENVIADO/ACEPTADO/RECHAZADO), `notas`. Tabla auxiliar `PresupuestoPropiedad` (presupuestoId, propiedadId, monto) para la relación N:N con propiedades.
2. **Flujo:** Botón "Crear presupuesto" desde la propiedad (agrega esa propiedad al presupuesto) o desde el cliente. Formulario: seleccionar una o más propiedades, tipo, monto por propiedad o total, vigencia. Generar PDF descargable.
3. **Conversión:** Botón "Convertir en contrato" cuando estado = ACEPTADO; si hay varias propiedades, el usuario elige cuál convertir o se crea un contrato por cada una.
4. **Evitar:** No implementar envío por email ni firma digital en la primera versión. No crear estados intermedios (ej. "En revisión"); mantener BORRADOR → ENVIADO → ACEPTADO/RECHAZADO.

**Implementado:** Tablas `Presupuesto` y `PresupuestoPropiedad`. Módulo presupuestos con CRUD, PDF descargable, conversión a contrato (alquiler) o operación de venta. Botones "Crear presupuesto" en detalle de propiedad y en lista de clientes. Migración `add_presupuestos.sql`. *Detalle: esperando ejemplo de presupuesto.*

---

## 10. Pendientes ampliados (roadmap)

### CRM / Ventas

- ☐ Pipeline de ventas de propiedades (consulta → visita → oferta → venta)
- ☐ Agenda de visitas a propiedades
- ☐ Historial de interacciones con clientes

### Gestión inmobiliaria

- ☐ Liquidación automática a propietarios
- ☐ Generación de liquidación PDF para propietarios
- ☐ Subida de documentos (DNI, garantías, contratos firmados)

### Automatización

- ☐ Recordatorios automáticos de pago por email
- ☐ Notificación de contratos por vencer
- ☐ Notificación automática de nuevas consultas

### Publicación de propiedades

- ☐ Portal público de propiedades (mini sitio web)
- ☐ Publicación automática en portales inmobiliarios
- ☐ Sincronización de propiedades publicadas
- **Portales en Argentina:** Mercado Libre, ZonaProp, Argenprop

### Experiencia del usuario

- ☐ Onboarding inicial para nuevas inmobiliarias
- ☐ Wizard para crear primeros datos (propiedad, cliente, contrato)
- ☐ Centro de ayuda dentro del sistema

### Comunicación

- ☐ Integración con WhatsApp para recordatorios
- ☐ Envío de recibos de pago por email
- ☐ Envío automático de contratos PDF

### SaaS / crecimiento

- ☐ Prueba gratuita de 14 días
- ☐ Sistema de upgrade/downgrade de planes
- ☐ Panel de facturación de la suscripción

---

## 11. Etapas sugeridas (priorización)

| Etapa | Descripción | Items |
|-------|-------------|-------|
| **Etapa 1** (imprescindible) | Funcionalidades core | Portal público de propiedades, Agenda de visitas, Liquidación a propietarios |
| **Etapa 2** (muy valioso) | Mejora operativa | Pipeline de ventas, Documentos, Automatizaciones |
| **Etapa 3** (crecimiento SaaS) | Escalabilidad | Integración WhatsApp, Publicación en portales, Facturación de suscripción |

---

*Documento generado el 11/03/2026*
