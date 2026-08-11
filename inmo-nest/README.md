# InmoSaaS — NestJS + Vue 3

Sistema de gestión inmobiliaria multi-tenant (Argentina). La SPA entra por login en `/` (sin landing comercial ni registro público).

## Stack
- **Backend:** NestJS + TypeScript + Prisma
- **Frontend:** Vue 3 + Vite + Tailwind + Pinia
- **DB / storage:** PostgreSQL + Storage (Supabase)
- **Deploy:** Render (backend) + Vercel (frontend)

---

## Setup Backend

```bash
cd inmo-nest/backend
npm install
cp .env.example .env
# Editar .env con DB, JWT y (opcional) mail / Mercado Pago
npx prisma generate
npx prisma migrate deploy
npm run db:seed      # carga datos demo
npm run start:dev    # desarrollo → http://localhost:3001
```

## Setup Frontend

```bash
cd inmo-vue/frontend
npm install
cp .env.example .env
# Completar VITE_API_URL y, si usás imágenes/logo, variables Supabase
npm run dev          # → http://localhost:5173
```

---

## Variables de entorno Backend

Ver [backend/.env.example](backend/.env.example). Destacadas:

| Variable | Notas |
|----------|--------|
| `JWT_SECRET` / `JWT_PORTAL_SECRET` | Obligatorias si `NODE_ENV=production` |
| `MP_ACCESS_TOKEN` | Respaldo global; preferir token por tenant |
| `MP_WEBHOOK_SECRET` | Firma de webhooks MP; obligatoria en producción |
| `FRONTEND_URL` / `API_URL` | CORS y `notification_url` de MP |

## Variables de entorno Frontend

Ver [../inmo-vue/frontend/.env.example](../inmo-vue/frontend/.env.example):

```
VITE_API_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Acceso

- **Panel admin:** `http://localhost:5173/` (login)
- **Portal inquilino/propietario:** `http://localhost:5173/portal`
- **Registro de inmobiliarias:** no está en la UI; usar seed o `POST /api/v1/auth/register`

## Credenciales demo (solo seed / README)

- Inmobiliaria (tenant email): `demo@inmobiliaria.com`
- Usuario: `admin@demo.com`
- Password: `Admin123!`

---

## Deploy

**Backend → Render:**
- Root directory: `inmo-nest/backend` (o `backend` según repo)
- Build: `npm install && npx prisma generate && npm run build`
- Start: `node dist/main`
- Definir `NODE_ENV=production` y secretos JWT / MP webhook

**Frontend → Vercel:**
- Root directory: `inmo-vue/frontend`
- Build: `npm run build`
- Output: `dist`
- Variables: `VITE_API_URL`, y si aplica `VITE_SUPABASE_*`

---

## Notas de producto

- Multi-tenant intacto (`tenantId` en datos y JWT).
- AFIP y Mercado Libre: pendientes (ver `PENDIENTES.md`).
- Mercado Pago portal: funcional con token por tenant + validación de firma webhook.
