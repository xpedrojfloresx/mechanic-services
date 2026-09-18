# Gestión de Talleres

App web para que mecánicos y talleres independientes gestionen clientes,
vehículos e historial de reparaciones, con búsqueda rápida por patente o
nombre.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 + shadcn/ui
- TanStack Query
- React Hook Form + Zod
- Supabase (Postgres + Auth + RLS)
- Cloudflare R2 (storage de fotos)
- vite-plugin-pwa
- Hosting: Cloudflare Workers (Static Assets / wrangler)

## Requisitos

- Node.js 22+
- Una cuenta de Supabase con un proyecto creado

## Setup local

```bash
npm install
cp .env.example .env
# completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env
npm run dev
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor de desarrollo |
| `npm run build` | Type-check + build de producción |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | Corre ESLint |
| `npm run format` | Formatea el código con Prettier |
| `npm run format:check` | Verifica formato sin escribir cambios |

## Variables de entorno

Ver `.env.example`. Nunca commitear `.env` con valores reales.

## Estado del proyecto

Ver [`context.md`](./context.md) para la bitácora de avance, decisiones y
dudas pendientes. Ver [`CLAUDE.md`](./CLAUDE.md) para las reglas de trabajo.
