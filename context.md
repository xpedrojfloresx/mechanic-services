# Bitácora del proyecto — Gestión de Talleres

## Estado actual

**Fase 0 (Setup del proyecto): completa del lado de Claude Code.** Falta
crear el repo remoto en GitHub y confirmar las preguntas abiertas antes de
pasar a la Fase 1 (ver más abajo).

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
- Repo Git: inicializado localmente (`git init`), 2 commits hechos. **Todavía no hay remoto en GitHub** (ver pendientes).

## Qué falta (Fase 0)

- [ ] Crear el repo en GitHub y agregar el remoto (Pedro debe crearlo — ver más abajo). Una vez creado, avisar para hacer `git remote add origin ...` y el primer push.
- [ ] Confirmar con Pedro las preguntas abiertas de la sección 5 del plan antes de arrancar la Fase 1.
- [ ] Crear proyecto en Supabase y cargar `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en `.env` local (Pedro).

## Decisiones tomadas y motivo

- **Tailwind v4 en vez de v3**: es la versión estable actual (4.3.3 al momento de instalar), y shadcn/ui ya soporta el flujo CSS-first (`@import "tailwindcss"` + `@theme inline`), sin `tailwind.config.js`. No hay razón para instalar v3 en un proyecto nuevo.
- **shadcn con preset "nova" y base "radix"**: es el preset/base por defecto de la CLI actual (`shadcn@4.21.0`); "radix" es la base clásica de shadcn/ui (la más probada), en vez de "aria" o "base". No se investigó a fondo la diferencia entre presets visuales (Nova/Vega/Maia/...) — si Pedro tiene una preferencia de estilo, se puede recrear con otro preset.
- **ESLint + Prettier en vez de oxlint**: el template nuevo de `create-vite` trae `oxlint` por defecto, pero el plan pide explícitamente ESLint + Prettier. Se removió `oxlint` y se instaló el stack estándar (`eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, `eslint-config-prettier`).
- **Sin íconos reales de PWA todavía**: `vite-plugin-pwa` está configurado pero con `icons: []` en el manifest — hacen falta archivos PNG (192x192, 512x512, maskable) que no existen todavía. Se completa en la Fase 6 (PWA) o cuando Pedro tenga un logo.
- **`baseUrl` removido de los tsconfig**: TypeScript 6 lo marca deprecado (`TS5101`) y con `moduleResolution: "bundler"` no hace falta — `paths` funciona sin `baseUrl`.

## Dudas abiertas / preguntas pendientes para Pedro

Antes de arrancar la Fase 1 hay que confirmar (sección 5 del plan):

1. **Arquitectura**: ¿confirmás single-tenant-ready por ahora (todas las tablas con `taller_id` + RLS desde el día uno, pero un solo taller en uso)?
2. **Nombre del proyecto y del repo**: se usó `gestiontalleres` como nombre del `package.json` (derivado del nombre de la carpeta). ¿Ese es el nombre definitivo para el repo de GitHub, o preferís otro?
3. **Campos exactos de cada entidad**: ¿confirmás el modelo de la sección 4 del plan (`talleres`, `usuarios`, `clientes`, `vehiculos`, `servicios`, `servicio_items`, `recordatorios`) o falta/sobra algún campo?
4. Login: ya decidido en el plan (email + contraseña principal, magic link como alternativa, reset por mail vía Brevo SMTP). No hay duda acá, solo falta que Pedro cree la cuenta de Brevo cuando lleguemos a la Fase 2.
5. **¿Cuántos usuarios/mecánicos** se van a loguear en el taller (para dimensionar roles/permisos, aunque sea a futuro)?
6. **Fotos (Fase 7)**: ¿entran en el MVP o quedan para después?
7. ¿Hay algún dato del rubro que Pedro quiera registrar y que no esté contemplado en el modelo de datos?

## Pasos manuales pendientes para Pedro

- Crear el repo en GitHub (organización del equipo) — falta definir el nombre (ver duda #2).
- Crear el proyecto en Supabase y pasar la URL y la anon key (van a `.env`, nunca al repo).
- Cuenta/bucket de Cloudflare R2 — puede esperar a la Fase 7.
- Cuenta de Brevo (SMTP) — se pide en la Fase 2, con instrucciones exactas en ese momento.

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
