# Release Notes — InmoSaaS
## Versión 2.0.0 — 07/03/2026

---

## 🔐 Seguridad y Autenticación

### Bloqueo por intentos fallidos
- La cuenta se bloquea automáticamente tras **5 intentos fallidos** de login
- Bloqueo de **15 minutos**, con mensaje indicando el tiempo restante
- El contador se resetea al iniciar sesión correctamente

### Validación de contraseñas
- Mínimo 8 caracteres
- Debe contener al menos una letra y un número
- Aplica tanto al registro como al cambio de contraseña

---

## 🗑️ Soft Delete (eliminación lógica)

Los registros ya **no se borran permanentemente** de la base de datos. En cambio, se marca un campo `deleted_at`.

Aplica en:
- **Clientes** — se puede desactivar en lugar de eliminar
- **Propiedades**
- **Usuarios**

### Integridad de datos
- No se puede eliminar un **cliente** que tenga contratos activos, propiedades asociadas o historial de pagos
- No se puede eliminar una **propiedad** con contratos activos, pagos o gastos registrados
- No se puede eliminar al **último administrador** activo
- Un usuario no puede eliminarse a sí mismo

---

## 📋 Auditoría

Nueva tabla `audit_logs` que registra automáticamente:

| Acción | Cuándo |
|--------|--------|
| `CREATE` | Al crear cualquier registro |
| `UPDATE` | Al modificar un registro |
| `SOFT_DELETE` | Al eliminar (lógicamente) |
| `LOGIN` | Al iniciar sesión correctamente |
| `LOGIN_FAILED` | Al fallar el login |
| `PAGO` | Al registrar un pago |
| `ANULAR` | Al anular un contrato |

Los administradores pueden consultar el historial desde el endpoint `GET /audit`.

---

## ✅ Validaciones de negocio

### Contratos
- No se puede crear un contrato si la propiedad no está en estado **DISPONIBLE**
- El inquilino debe ser de tipo **INQUILINO**
- No puede haber dos contratos activos para la misma propiedad
- Al crear un contrato → la propiedad pasa automáticamente a **ALQUILADO**
- Al anular un contrato → la propiedad vuelve a **DISPONIBLE**

### Propiedades
- El propietario debe ser un cliente de tipo **PROPIETARIO**

### Pagos
- El monto pagado no puede superar el saldo pendiente
- Los pagos parciales generan automáticamente el saldo restante como nueva cuota

### Facturas de servicios
- Se marca automáticamente como **VENCIDA** si pasa la fecha de vencimiento
- Cron job que actualiza el estado cada hora
- Alerta de facturas próximas a vencer (próximos 7 días) en `GET /facturas/proximas`

### Usuarios
- Email único por inmobiliaria
- No se puede crear un usuario duplicado

---

## 💳 Sistema de Planes

Nuevo sistema de suscripción con tres niveles:

### Starter — $12.900/mes
- Hasta **10 propiedades**
- **1 usuario**
- Módulos: Clientes, Propiedades, Contratos, Cobros, Tareas, Contratos PDF, Métricas básicas

### Pro — $27.900/mes ⭐ Recomendado
- Propiedades **ilimitadas**
- Hasta **5 usuarios**
- Todos los módulos anteriores más: Gastos, Facturas de servicios, Ventas, Import/Export Excel, Métricas avanzadas, Ajuste IPC automático, Notificaciones avanzadas

### Enterprise — $54.900/mes
- Propiedades y usuarios **ilimitados**
- Todo lo de Pro más: Multi-sucursal, API de integración, Portal de propietario/inquilino, Automatizaciones, Reportes avanzados *(preparados como feature flags para implementación futura)*

### Controles de plan en backend
- El backend **bloquea endpoints** según el plan del tenant
- Al crear una propiedad verifica el límite de `max_properties`
- Al crear un usuario verifica el límite de `max_users`
- Nuevo guard `PlanGuard` + decorador `@RequirePlanModule('modulo')`

### Controles de plan en frontend
- El sidebar muestra con **candado 🔒** los módulos no disponibles
- Al hacer clic en un módulo bloqueado aparece un **modal de upgrade**
- Badge del plan visible en el sidebar con uso de propiedades en tiempo real

---

## 🌐 Landing Page

Nueva página de inicio pública en `/` con las secciones:

- **Quiénes somos** — propuesta de valor y diferenciales
- **Funcionalidades** — los 16 módulos del sistema
- **Planes** — comparativa con precios actualizados
- **Contratar** — formulario de registro directo
- **Iniciar sesión** — acceso para usuarios existentes

Las rutas del sistema pasaron de `/dashboard`, `/clients`, etc. a `/app/dashboard`, `/app/clients`, etc.

---

## 🛠️ Cambios técnicos

### Schema de base de datos — campos nuevos

```
usuarios:     login_attempts, locked_until, deleted_at
clientes:     deleted_at
propiedades:  deleted_at
```

### Tablas nuevas

```
audit_logs          — historial de acciones
subscription_plans  — definición de planes
```

### Columnas nuevas en tenants

```
plan_id, subscription_status, subscription_start, subscription_end
```

### Nuevos módulos backend

```
src/audit/       — AuditService, AuditModule
src/plans/       — PlanService, PlansModule, plan.constants.ts
src/common/guards/plan.guard.ts
```

### Nuevos archivos frontend

```
src/stores/plan.js
src/composables/usePlanAccess.js
src/components/common/UpgradeModal.vue
src/pages/auth/LandingPage.vue
```

---

## 📦 Migraciones SQL a ejecutar en Supabase

1. `add_validations.sql` — campos de soft delete, login attempts y tabla audit_logs
2. `add_plans.sql` — tabla subscription_plans, datos iniciales y columnas en tenants

Después de aplicar los SQLs: `npx prisma generate`
