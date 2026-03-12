# Funcionalidades del sistema — Lista detallada

Sistema de gestión inmobiliaria SaaS (backend NestJS, frontend Vue 3, PostgreSQL/Prisma). Multi-tenant.

> **Nota:** Este documento debe actualizarse cada vez que se implemente una funcionalidad nueva o se modifique una existente.

---

## 1. Autenticación y acceso

### 1.1 Panel administrativo (inmobiliaria)
- **Registro:** Crear cuenta nueva (tenant + usuario admin) desde la landing.
- **Login:** Iniciar sesión con email y contraseña. Redirección a `/app/dashboard`.
- **Sesión:** JWT almacenado; validación en cada petición.
- **Reset password:** Solicitar restablecimiento de contraseña por email.
- **Me:** Obtener usuario y tenant actual (`GET /auth/me`).

### 1.2 Portal de clientes (inquilinos y propietarios)
- **Login portal:** Acceso con email y contraseña asignada por la inmobiliaria.
- **Cambiar contraseña:** Obligatorio en primer login; opcional después.
- **Roles:** INQUILINO o PROPIETARIO según el cliente.
- **Crear acceso:** La inmobiliaria crea usuario/contraseña para un cliente.
- **Regenerar contraseña:** La inmobiliaria regenera la contraseña de un cliente.

---

## 2. Dashboard

- **Estadísticas:** Clientes totales, propiedades, contratos activos, pagos atrasados, contratos por vencer (30 días), consultas sin leer, ingresos del mes, ingresos proyectados.
- **Tarjetas clicables:** Navegación a Alquileres, Cobros, Consultas según el dato.
- **Notificaciones:** Pagos vencidos, pagos próximos, facturas de servicio vencidas/próximas, tareas vencidas, consultas del portal sin leer.
- **Cada notificación:** Enlace directo a la sección correspondiente.

---

## 3. Clientes (CRM)

- **Listar:** Búsqueda, filtro por tipo (INQUILINO, PROPIETARIO, COMPRADOR, VENDEDOR) y estado (ACTIVO, INACTIVO, PROSPECTO, CERRADO).
- **Crear:** Nombre, apellido, email, teléfono, tipo, estado, notas, datos fiscales (CUIT, razón social, condición IVA, domicilio), requiere factura.
- **Editar:** Actualizar cualquier campo.
- **Desactivar:** Marcar cliente como INACTIVO (soft).
- **Eliminar:** Soft delete (borrado lógico).
- **Código:** Generación automática al crear.

---

## 4. Propiedades

- **Listar:** Búsqueda, filtro por tipo de operación (ALQUILER, VENTA), estado (DISPONIBLE, RESERVADO, ALQUILADO, VENDIDO).
- **Crear:** Título, dirección, ciudad, precio, tipo operación, estado, dormitorios, baños, m², descripción, propietario.
- **Ver detalle:** Propiedad completa, contratos asociados, facturas de servicio, gastos.
- **Editar:** Actualizar cualquier campo.
- **Eliminar:** Soft delete.
- **Imágenes:** Subir y eliminar imágenes (múltiples imágenes por propiedad).
- **Código:** Generación automática al crear.

---

## 5. Alquileres (contratos)

- **Listar:** Contratos con filtro por estado (ACTIVO, ATRASADO, FINALIZADO, ANULADO).
- **Crear:** Propiedad (DISPONIBLE o RESERVADO), inquilino, fechas inicio/fin, monto mensual, depósito opcional. Genera cuotas mensuales (máx. 60).
- **Ver detalle:** Contrato con propiedad, inquilino, pagos.
- **Ver pagos:** Modal con historial de pagos (código, monto, estado, fecha vence/pago, forma de pago).
- **Registrar pago:** Asociar pago a una cuota PENDIENTE o ATRASADO; monto, fecha, forma de pago.
- **Ajuste:** Configurar IPC o fijo, previsualizar, ejecutar. Actualiza cuotas pendientes.
- **Anular:** Marcar contrato como ANULADO.
- **Depósito:** Registrar devolución o retención del depósito (con motivo).
- **Renovar:** Crear nuevo contrato desde uno ACTIVO o FINALIZADO (misma propiedad/inquilino).
- **Estado ATRASADO:** Cron diario marca contratos con pagos vencidos sin abonar.
- **Estado FINALIZADO:** Cron diario marca contratos con fechaFin vencida.

---

## 6. Cobros

- **Listar:** Pagos pendientes y atrasados de todos los contratos.
- **Información:** Propiedad, inquilino, monto, fecha vencimiento, días de atraso.
- **Registrar pago:** Desde el listado o desde Alquileres.

---

## 7. Gastos de propiedad

- **Listar:** Gastos por propiedad con filtros.
- **Crear:** Propiedad, tipo, descripción, monto, fecha, pagado por (PROPIETARIO o INMOBILIARIA).
- **Editar:** Actualizar campos.
- **Eliminar:** Borrado del gasto.
- **Código:** Generación automática.

---

## 8. Servicios por propiedad (FacturaServicio)

- **Listar:** Facturas de luz, gas, expensas, etc. por propiedad.
- **Próximas:** Facturas que vencen en los próximos 7 días.
- **Crear:** Propiedad, tipo de servicio, monto, fecha vencimiento.
- **Editar:** Actualizar campos.
- **Pagar:** Marcar como PAGADO.
- **Eliminar:** Borrado de la factura.
- **Cron:** Actualización horaria de estado (PENDIENTE → VENCIDO).

---

## 9. Facturas a clientes (AFIP)

- **Listar:** Comprobantes fiscales electrónicos emitidos.
- **Crear:** Cliente, tipo comprobante, monto, descripción (estado BORRADOR).
- **Editar:** Modificar borrador.
- **Enviar a AFIP:** Autorizar comprobante (CAE, fecha vencimiento).
- **Eliminar:** Borrar borrador o anular.
- **Integración:** Preparado para AFIP/ARCA (datos fiscales en Tenant).

---

## 10. Tareas

- **Listar:** Filtro por estado (PENDIENTE, EN_PROGRESO, COMPLETADA, CANCELADA) y prioridad.
- **Crear:** Título, descripción, prioridad, fecha vencimiento, cliente asociado.
- **Editar:** Actualizar campos.
- **Eliminar:** Borrado de la tarea.
- **Orden:** Por prioridad y fecha vencimiento.

---

## 11. Consultas del portal

- **Listar:** Consultas enviadas por inquilinos/propietarios desde el portal.
- **Marcar leído:** Indicar que la consulta fue leída.
- **Responder:** Escribir respuesta; opción de enviar por email al cliente.
- **Notificaciones:** Aparecen en el dashboard como pendientes.

---

## 12. Contratos PDF

- **Seleccionar contrato:** Dropdown con contratos activos.
- **Cargar datos:** Contrato con propiedad, propietario, inquilino, tenant.
- **Editor:** Campos editables (título, lugar/fecha, cláusulas, precio, ajuste, obligaciones).
- **Vista previa:** Render en tiempo real.
- **Generar PDF:** Descarga del contrato en PDF (A4).

---

## 13. Alquileres activos (Sales)

- **Listar:** Contratos ACTIVO y ATRASADO con propiedad e inquilino.
- **Vista resumida:** Para seguimiento rápido de alquileres vigentes.

---

## 14. Reportes

- **Pagos últimos 6 meses:** Listado de pagos efectuados para análisis de ingresos.

---

## 15. Métricas (solo ADMIN)

- **Panel:** KPIs y gráficos de ingresos, ocupación, pagos atrasados.
- **Datos:** Agregados por tenant.

---

## 16. Usuarios (solo ADMIN)

- **Listar:** Usuarios del tenant.
- **Crear:** Nombre, apellido, email, contraseña, rol (ADMIN, AGENTE, ASISTENTE).
- **Editar:** Actualizar datos y rol.
- **Eliminar:** Desactivar o borrar usuario.
- **Bloqueo:** Tras intentos fallidos de login.

---

## 17. Datos fiscales (solo ADMIN)

- **Ver:** Datos del tenant (CUIT, razón social, condición IVA, domicilio, punto de venta).
- **Editar fiscales:** Actualizar datos para facturación electrónica.
- **Comisión de alquiler:** Configurar porcentaje que se descuenta en liquidaciones a propietarios (0–100 %).

---

## 18. Migración Excel (solo ADMIN)

- **Cargar archivos:** Importar clientes, propiedades, contratos desde Excel/CSV.
- **Plantillas:** Documentación de columnas esperadas.
- **Validación:** Errores por fila antes de importar.

---

## 19. Auditoría

- **Log:** Registro de acciones (CREATE, UPDATE, DELETE, LOGIN, PAGO, etc.).
- **Filtros:** Por entidad y acción.
- **Paginación:** Historial navegable.

---

## 20. Planes y suscripción

- **Mi plan:** Obtener plan actual del tenant.
- **Módulos:** Control de acceso por plan (gastos, facturas, ventas, migración Excel).
- **Guard:** Bloqueo de rutas según módulos habilitados.

---

## 21. Portal del inquilino

- **Mi contrato:** Contrato activo con propiedad e inquilino.
- **Mis pagos:** Historial de pagos realizados.
- **Mi deuda:** Cuotas pendientes/atrasadas con monto y vencimiento.
- **Pagar con Mercado Pago:** Crear preferencia y redirigir a checkout; webhook actualiza el pago.
- **Mis consultas:** Enviar consultas y ver respuestas de la inmobiliaria.
- **Cambiar contraseña:** Actualizar contraseña del portal.

---

## 22. Portal del propietario

- **Mis propiedades:** Propiedades asociadas al propietario.
- **Servicios por propiedad:** Facturas de luz, gas, expensas de sus propiedades.
- **Gastos:** Gastos de sus propiedades (quién pagó).
- **Liquidaciones:** Ingresos por alquiler con desglose: monto bruto, comisión inmobiliaria, neto a cobrar.
- **Enviar consulta:** Mensaje a la inmobiliaria.
- **Mis consultas:** Ver consultas enviadas y respuestas.
- **Cambiar contraseña:** Actualizar contraseña del portal.

---

## 23. Landing pública

- **Secciones:** Inicio, funcionalidades, planes, contratar, login.
- **Registro:** Formulario para crear cuenta (tenant + admin).
- **Login:** Formulario integrado en la landing.
- **Portal:** Enlace al portal de inquilinos/propietarios.
- **Responsive:** Navegación móvil con menú hamburguesa.

---

## 24. Procesos automáticos (cron)

| Cron | Frecuencia | Función |
|------|------------|---------|
| Finalizar contratos | Diario 00:00 | Marcar como FINALIZADO contratos con fechaFin vencida |
| Estado ATRASADO | Diario 00:00 | Marcar pagos y contratos con cuotas vencidas sin abonar |
| Facturas vencidas | Cada hora | Actualizar estado PENDIENTE → VENCIDO en FacturaServicio |
| Ajuste IPC | Diario 08:00 | Actualizar valor de referencia IPC (ajustes) |
| Email recordatorios | Diario 08:00 (AR) | Envío de recordatorios de pago (si configurado) |

---

## 25. API resumida (endpoints principales)

| Módulo | Método | Ruta | Descripción |
|--------|--------|------|-------------|
| Auth | POST | /auth/register | Registro |
| Auth | POST | /auth/login | Login |
| Auth | GET | /auth/me | Usuario actual |
| Clients | CRUD | /clients | Clientes |
| Properties | CRUD | /properties | Propiedades |
| Properties | POST/DELETE | /properties/imagenes | Imágenes |
| Rentals | CRUD | /rentals | Contratos |
| Rentals | GET | /rentals/:id | Contrato individual |
| Rentals | GET | /rentals/:id/payments | Pagos del contrato |
| Rentals | POST | /rentals/:id/payments | Registrar pago |
| Rentals | POST | /rentals/:id/anular | Anular |
| Rentals | PATCH | /rentals/:id/deposito/devolver | Depósito |
| Rentals | POST | /rentals/:id/renovar | Renovar |
| Ajustes | POST | /ajustes/contratos/:id/ajuste/ejecutar | Ejecutar ajuste |
| Dashboard | GET | /dashboard/stats | Estadísticas |
| Dashboard | GET | /dashboard/notificaciones | Notificaciones |
| Consultas | CRUD | /consultas | Consultas portal |
| Gastos | CRUD | /gastos | Gastos |
| Facturas | CRUD | /facturas | Servicios por propiedad |
| FacturasEmitidas | CRUD | /facturas-emitidas | Facturas AFIP |
| Tareas | CRUD | /tareas | Tareas |
| Usuarios | CRUD | /usuarios | Usuarios |
| Tenant | GET/PUT | /tenant | Datos tenant |
| Portal | * | /portal/* | Endpoints del portal |
| Mercado Pago | POST | /portal/pago-mp/crear-preference | Crear pago |
| Mercado Pago | POST | /portal/pago-mp/webhook | Webhook MP |

---

*Documento generado el 12/03/2026 — Mantener actualizado al implementar nuevas funcionalidades.*
