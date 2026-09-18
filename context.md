# Bitácora del proyecto — Gestión de Talleres

## Estado actual

**Fase 0: completa.** Preguntas abiertas confirmadas por Pedro (2026-09-18).
Arrancando **Fase 1 (Base de datos y esquema en Supabase)**.

## Hecho y verificado

- Proyecto Vite + React + TypeScript inicializado (`npm create vite@latest . -- --template react-ts`).
- Tailwind CSS v4 instalado y configurado vía `@tailwindcss/vite` (sin `tailwind.config.js`, CSS-first).
- shadcn/ui inicializado (`npx shadcn@latest init --template vite --base radix --preset nova`), con alias `@/*` → `./src/*` en `tsconfig.json` / `tsconfig.app.json` y `vite.config.ts`.
- TanStack Query, React Hook Form, Zod, `@hookform/resolvers`, `@supabase/supabase-js` instalados.
- `vite-plugin-pwa` instalado y configurado en `vite.config.ts` (manifest básico, sin íconos reales todavía).
- Reemplazado `oxlint` (default del template nuevo de Vite) por **ESLint + Prettier**, como pide el plan. Config en `eslint.config.js`, `.prettierrc.json`, `.prettierignore`.
- Estructura de carpetas: `src/features/`, `src/lib/` (con `supabase.ts` y `queryClient.ts`), `src/routes/`, `src/components/ui/`.
- Boilerplate de Vite (logos, hero, css de ejemplo) eliminado; `App.tsx` y `main.tsx` mínimos, con `QueryClientProvider` ya envolviendo la app.
- `.gitignore` actualizado para excluir `.env` explícitamente (además de `*.local`) y permitir `.env.example`.
- `.env.example` creado con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` vacías.
- `README.md` reescrito con setup, scripts y stack.
- `CLAUDE.md` creado con las reglas permanentes de trabajo (sección 0 del plan).
- Verificado: `npm run build` compila sin errores, `npm run lint` corre limpio (1 warning benigno de un patrón estándar de shadcn en `button.tsx`, no es un problema real).
- Verificado en navegador: `npm run dev` levanta, la página carga sin errores de consola, muestra "Gestión de Talleres" y los estilos de Tailwind se aplican.
- `.claude/launch.json` agregado para poder levantar el servidor de dev desde las herramientas de Claude Code.
- Repo Git: inicializado localmente, remoto agregado (`origin` → `https://github.com/xpedrojfloresx/mechanic-services.git`). Nombre del proyecto en `package.json` actualizado a `mechanic-services`.
- Pedro creó el proyecto en Supabase y cargó `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en `.env` local.

## Qué falta (Fase 0)

- [x] Crear el repo en GitHub y agregar el remoto.
- [x] Confirmar con Pedro las preguntas abiertas de la sección 5 del plan.
- [x] Crear proyecto en Supabase y cargar credenciales en `.env` local.
- [ ] Primer `git push` al remoto (pendiente de confirmación explícita antes de pushear).

## Decisiones tomadas y motivo

- **Tailwind v4 en vez de v3**: es la versión estable actual (4.3.3 al momento de instalar), y shadcn/ui ya soporta el flujo CSS-first (`@import "tailwindcss"` + `@theme inline`), sin `tailwind.config.js`. No hay razón para instalar v3 en un proyecto nuevo.
- **shadcn con preset "nova" y base "radix"**: es el preset/base por defecto de la CLI actual (`shadcn@4.21.0`); "radix" es la base clásica de shadcn/ui (la más probada), en vez de "aria" o "base". No se investigó a fondo la diferencia entre presets visuales (Nova/Vega/Maia/...) — si Pedro tiene una preferencia de estilo, se puede recrear con otro preset.
- **ESLint + Prettier en vez de oxlint**: el template nuevo de `create-vite` trae `oxlint` por defecto, pero el plan pide explícitamente ESLint + Prettier. Se removió `oxlint` y se instaló el stack estándar (`eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, `eslint-config-prettier`).
- **Sin íconos reales de PWA todavía**: `vite-plugin-pwa` está configurado pero con `icons: []` en el manifest — hacen falta archivos PNG (192x192, 512x512, maskable) que no existen todavía. Se completa en la Fase 6 (PWA) o cuando Pedro tenga un logo.
- **`baseUrl` removido de los tsconfig**: TypeScript 6 lo marca deprecado (`TS5101`) y con `moduleResolution: "bundler"` no hace falta — `paths` funciona sin `baseUrl`.
- **`usuarios.rol` se mantiene en el esquema** aunque hoy todos los usuarios son "owner": Pedro planea diferenciar roles a futuro (multi-tenant), así que la columna evita una migración de esquema más adelante. Por ahora el valor por defecto/único será `owner`.

## Preguntas de la sección 5 — respondidas por Pedro (2026-09-18)

1. **Arquitectura**: multi-tenant es el objetivo a futuro, pero el MVP queda
   single-tenant-ready: cada taller se loguea con su usuario y ve solo su
   propia data. Confirma el enfoque `taller_id` + RLS desde el día uno.
2. **Nombre**: "Mechanic Services" por ahora (repo:
   `xpedrojfloresx/mechanic-services`, `package.json` name:
   `mechanic-services`). Puede cambiar más adelante.
3. **Campos de entidades**: el modelo de la sección 4 del plan queda como
   está por ahora. Posible expansión de campos más adelante (no especificada
   todavía).
4. Login: sin cambios respecto al plan (email + contraseña, magic link,
   reset por Brevo SMTP — Fase 2).
5. **Usuarios por taller**: máximo 5 usuarios por taller, **todos "owners"**
   (sin roles de cliente ni permisos diferenciados por ahora). Implicancia
   para el esquema: la columna `usuarios.rol` puede tener un solo valor
   posible en la práctica hoy, pero se deja la columna para diferenciar
   roles a futuro sin tener que migrar.
6. **Fotos (Fase 7)**: NO entran en este MVP. Posiblemente más adelante.
7. **Datos adicionales del rubro**: por ahora ninguno.

## Pasos manuales pendientes para Pedro

- Confirmar si puedo hacer el primer `git push` a `origin` (repo ya vinculado localmente).
- Cuenta/bucket de Cloudflare R2 — se pospone (fotos no van en el MVP).
- Cuenta de Brevo (SMTP) — se pide en la Fase 2, con instrucciones exactas en ese momento.
- Para la Fase 1 (migraciones con Supabase CLI): probablemente haga falta que Pedro corra `supabase login` en su máquina (flujo OAuth por navegador que Claude Code no puede completar en esta sesión) y/o me pase un access token / el project ref para linkear el proyecto. Se detalla en cuanto se llegue a ese paso.

## Comandos clave del proyecto

```bash
npm run dev            # servidor de desarrollo
npm run build          # type-check + build de producción
npm run preview        # sirve el build de producción
npm run lint           # ESLint
npm run format         # Prettier (escribe cambios)
npm run format:check   # Prettier (solo verifica)
```

## Versiones relevantes (al momento de instalar, 2026-09-18)

- Node v22.18.0, npm 11.10.0
- Vite 8.3.0, React 19.2.8, TypeScript ~6.0.2
- Tailwind CSS 4.3.3
- shadcn CLI 4.21.0
- @tanstack/react-query 5.103.1
- @supabase/supabase-js 2.116.0
- vite-plugin-pwa 1.3.0
