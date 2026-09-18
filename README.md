# Gestión de Talleres (Mechanic Services)

App web para que mecánicos y talleres independientes gestionen clientes,
vehículos, ingresos, servicios y recordatorios de próximo servicio, con
**búsqueda rápida por patente o nombre**. Pensada para usarse desde el
celular en el mostrador y desde la PC.

## Qué hace hoy

- **Recibir vehículo por patente**: si el auto ya existe, solo se piden km y
  motivo; si es nuevo, se carga cliente, auto e ingreso en una pantalla.
- **Inicio**: qué hay en el taller ahora (con avance de estado en un toque y
  aviso "¿ya se entregó?"), recordatorios para avisar, resumen e insights.
- **Servicios**: ingresos con estado (En taller, Listo, Entregado), varios
  servicios realizados por ingreso y total calculado.
- **Clientes y vehículos**: fichas, historial, cambio de dueño sin perder el
  historial, teléfono de Argentina y Chile.
- **Recordatorios** de próximo servicio (por fecha y, opcional, por km).
- **Botón de WhatsApp** (abre `wa.me` con el mensaje armado, sin API).
- **Buscador global** en todas las pantallas.

Próximo paso del plan: hacerla instalable (PWA), después deploy y backups.
Estado detallado, decisiones y pendientes: [`context.md`](./context.md).
Reglas de trabajo: [`CLAUDE.md`](./CLAUDE.md).

## Stack

Vite + React + TypeScript, Tailwind CSS v4 + shadcn/ui, TanStack Query,
React Hook Form + Zod, React Router, recharts, Supabase (Postgres + Auth +
RLS, sin backend propio), vite-plugin-pwa. Hosting previsto: Cloudflare
Workers (Static Assets).

## Requisitos

- Node.js 22+
- Un proyecto de Supabase con las migraciones aplicadas

## Puesta en marcha

```bash
npm install
cp .env.example .env
# completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env
# (usar la clave PUBLISHABLE/anon, nunca la secret)
npm run dev        # http://localhost:5199
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 5199) |
| `npm run build` | Type-check + build de producción |
| `npm run preview` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier |

## Base de datos (Supabase CLI)

```bash
npx supabase login                       # una vez
npx supabase link --project-ref <ref>    # una vez
npx supabase migration list              # local vs remoto
npx supabase db push                     # aplicar migraciones nuevas
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

Las migraciones están en `supabase/migrations/`. Todas las tablas llevan
`taller_id` y RLS: cada taller solo ve sus propios datos. Los talleres y los
usuarios se crean a mano (no hay registro self-service todavía).

## Variables de entorno

Ver `.env.example`. Nunca commitear `.env` con valores reales.
