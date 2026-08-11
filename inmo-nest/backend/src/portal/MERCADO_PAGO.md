# Integración Mercado Pago - Portal Inquilino

## Configuración

### 1. Variables de entorno (.env)

```env
# Token de acceso de Mercado Pago (respaldo; preferir token por tenant en Configuración)
MP_ACCESS_TOKEN="APP_USR-xxxx..."

# Secret de firma del webhook (Tus integraciones → Webhooks). Obligatorio en producción.
MP_WEBHOOK_SECRET="xxxx..."

# URL pública del API (para webhook - debe ser accesible desde internet)
API_URL="https://tu-dominio.com"
```

### 2. Webhook

Mercado Pago envía notificaciones a:
```
POST {API_URL}/api/v1/portal/pago-mp/webhook?topic=payment&id={payment_id}
```

El endpoint valida el header `x-signature` con `MP_WEBHOOK_SECRET` y verifica el pago con el Access Token del tenant (o el global de respaldo).

En desarrollo local, usá [ngrok](https://ngrok.com) para exponer el puerto y configurar la URL en la preferencia. Sin `MP_WEBHOOK_SECRET` la firma se omite solo fuera de producción.

## Flujo

1. Inquilino ve su deuda en el portal
2. Clic en "Pagar con Mercado Pago" → crea preferencia → redirige a Checkout Pro
3. Usuario paga en MP
4. MP notifica al webhook → se actualiza PagoAlquiler a PAGADO
5. Usuario vuelve al portal (success/failure/pending)

## Migración

Ejecutá el SQL en `prisma/migrations/add_mercado_pago.sql` o:

```bash
npx prisma db push
```
