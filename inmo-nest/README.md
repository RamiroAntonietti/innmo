# InmoSaaS — NestJS + Vue 3

## Stack
- **Backend:** NestJS + TypeScript + Prisma
- **Frontend:** Vue 3 + Vite + Tailwind + Pinia
- **DB:** PostgreSQL (Supabase)
- **Deploy:** Render (backend) + Vercel (frontend)

---

## Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales de Supabase
npx prisma generate
npx prisma migrate deploy
npm run db:seed      # carga datos demo
npm run start:dev    # desarrollo
```

## Setup Frontend

```bash
cd frontend
npm install
# Crear .env con:
# VITE_API_URL=http://localhost:3001/api/v1
npm run dev
```

---

## Variables de entorno Backend (.env)

```
DATABASE_URL="postgresql://postgres.xxx:PASSWORD@pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:PASSWORD@pooler.supabase.com:6543/postgres"
JWT_SECRET="secret-largo-y-seguro"
JWT_EXPIRES_IN="7d"
NODE_ENV="production"
PORT=3001
FRONTEND_URL="https://tu-frontend.vercel.app"
```

## Variables de entorno Frontend

```
VITE_API_URL=https://tu-backend.onrender.com/api/v1
```

---

## Deploy

**Backend → Render:**
- Root directory: `backend`
- Build command: `npm install && npx prisma generate`
- Start command: `node dist/main`

**Frontend → Vercel:**
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Variable: `VITE_API_URL`

---

## Credenciales demo

- Inmobiliaria: `demo@inmobiliaria.com`
- Usuario: `admin@demo.com`
- Password: `Admin123!`
