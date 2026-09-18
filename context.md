# Bitácora del proyecto — Gestión de Talleres

## Estado actual

**Fase 0: completa y pusheada a GitHub** (`main`,
`https://github.com/xpedrojfloresx/mechanic-services`).

**Fase 1 (Base de datos y esquema en Supabase): completa**, con una
salvedad: la prueba de aislamiento entre talleres con usuarios reales queda
pendiente para la Fase 2 (ver "Qué falta" y "Verificación de RLS" más abajo).

**Fase 2 (Autenticación): en curso.** Código de login/magic
link/reset de contraseña + rutas protegidas ya escrito y probado en el
navegador (sin sesión real todavía). Bloqueada en: (a) que Pedro cree su
usuario en el Dashboard de Supabase, (b) que configure Site
URL/Redirect URLs, (c) la clave SMTP de Brevo (para que magic
link/reset lleguen por mail de verdad).

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
- Primer `git push` a `origin/main` hecho (con confirmación explícita de Pedro antes de pushear).
- Supabase CLI instalado como devDependency (`supabase@2.117.0`) y `supabase init` corrido (`supabase/config.toml`).
- Migración `supabase/migrations/20260918000001_initial_schema.sql`: tablas `talleres`, `usuarios`, `clientes`, `vehiculos`, `servicios`, `servicio_items`, `recordatorios`, con `taller_id` en todas las de negocio, constraints (unique `taller_id+patente`, checks en `tipo`/`estado` de `recordatorios`), índices normales + índices GIN `pg_trgm` para búsqueda parcial rápida por nombre de cliente y patente (extensión `pg_trgm` habilitada).
- Migración `supabase/migrations/20260918000002_rls_policies.sql`: función `current_taller_id()` (SECURITY DEFINER) para evitar recursión de RLS al leer `usuarios`; triggers `BEFORE INSERT` que derivan `taller_id` automáticamente desde la fila padre (o desde el usuario logueado en `clientes`) **solo si el cliente no lo mandó** — así el front no necesita pasar `taller_id` a mano, pero si alguien intenta forzar uno, la policy `WITH CHECK` lo rechaza igual; triggers `updated_at`; RLS activado y políticas de select/insert/update/delete por `taller_id` en todas las tablas de negocio, y policies de solo lectura en `talleres`/`usuarios` (no hay alta de talleres/usuarios vía RLS todavía — se hacen a mano con el service role, ver decisiones).
- `supabase/seed.sql`: datos de desarrollo (1 taller demo, 2 clientes, 2 vehículos, 1 servicio con 2 items, 1 recordatorio). No crea usuarios de `auth.users` (eso se resuelve en la Fase 2).
- Pedro corrió `npx supabase login` (OAuth por navegador, no lo podía hacer esta sesión). Con eso: `supabase link --project-ref yvpixnfacvffpwqsvdct` y `supabase db push` aplicaron las dos migraciones al proyecto remoto **"Mechanic Services"** sin errores.
- `supabase db push --include-seed` cargó `seed.sql` sin errores.
- Verificado con queries directas (`supabase db query --linked`):
  - Conteos del seed correctos (2 clientes, 2 vehículos, 1 servicio, 2 servicio_items, 1 recordatorio) y **0 inconsistencias** entre el `taller_id` de cada fila hija y el de su padre (vehículo↔cliente, servicio↔vehículo, servicio_item↔servicio, recordatorio↔vehículo) — confirma que los triggers que derivan `taller_id` funcionan bien.
  - `relrowsecurity = true` en las 7 tablas de negocio.
  - Con `role anon` (sin login): `select count(*) from clientes` devuelve **0** filas — confirma que sin sesión no se ve nada.
  - Con `role authenticated` pero con un `sub` de JWT que no tiene fila en `usuarios` (usuario logueado sin perfil): también **0** filas — confirma que `current_taller_id()` devuelve `null` y las policies bloquean correctamente.
- Tipos generados: `npx supabase gen types typescript --linked > src/lib/database.types.ts` (482 líneas, las 7 tablas presentes). `src/lib/supabase.ts` actualizado para usar `createClient<Database>(...)`. `npm run build` compila limpio con los tipos reales.
- Instalado `react-router` (v8) para ruteo — decisión consultada con Pedro (no estaba en el stack del plan).
- `src/features/auth/auth-context.tsx`: `AuthProvider` + hook `useAuth()`, suscripto a `supabase.auth.onAuthStateChange`.
- `src/features/auth/hooks/use-usuario-actual.ts`: trae la fila de `usuarios` (con `taller_id`) del usuario logueado vía TanStack Query.
- `src/features/auth/components/`: `login-form.tsx` (email+contraseña con React Hook Form + Zod, y sección colapsable "Otras formas de iniciar sesión" con magic link), `forgot-password-form.tsx`, `reset-password-form.tsx`, `require-auth.tsx` (`RequireAuth` redirige a `/login` sin sesión, `RedirectIfAuthed` redirige a `/` si ya hay sesión).
- Rutas en `src/App.tsx`: `/login`, `/olvide-mi-contrasena` (públicas, redirigen a `/` si hay sesión), `/restablecer-contrasena` (pública, sin guard — la sesión de recuperación la arma el propio link del mail), `/` protegida (placeholder con email del usuario, su `taller_id` y botón de cerrar sesión).
- Puerto de dev fijado en `5199` en `vite.config.ts` y `.claude/launch.json`: en esta máquina Windows, `5173`/`5174`/`5180` los tiene tomados un proceso `svchost` (no es el rango de exclusión de `netsh`, es un listener real — no se investigó de qué servicio es). `5199` está libre y es el que hay que usar en la config de Supabase Auth (Site URL / Redirect URLs).
- Verificado en navegador (sin sesión real todavía): entrar a `/` redirige a `/login`; el formulario de login renderiza bien; "Otras formas de iniciar sesión" despliega el form de magic link; el link "¿Olvidaste tu contraseña?" navega a `/olvide-mi-contrasena` y ese formulario también renderiza bien. Sin errores de consola. `npm run build` y `npm run lint` limpios (solo el mismo warning benigno de siempre + uno nuevo igual de benigno en `auth-context.tsx` por exportar provider+hook juntos, patrón estándar de React).

## Qué falta (Fase 0)

- [x] Crear el repo en GitHub y agregar el remoto.
- [x] Confirmar con Pedro las preguntas abiertas de la sección 5 del plan.
- [x] Crear proyecto en Supabase y cargar credenciales en `.env` local.
- [x] Primer `git push` al remoto.

## Qué falta (Fase 1)

- [x] Aplicar migraciones al proyecto remoto.
- [x] Generar tipos TypeScript y usarlos en el cliente.
- [x] Verificar RLS con `anon` y con `authenticated` sin perfil (0 filas en ambos casos).
- [ ] **Verificación de RLS con dos talleres reales** ("un taller no ve datos de otro" tal cual lo pide el plan) queda pendiente hasta la Fase 2: para probarla de verdad hacen falta usuarios reales en `auth.users`, que se crean recién con el login. No se simuló insertando directo en `auth.users` porque son tablas internas de Supabase Auth y no quise adivinar su estructura exacta (regla de "no inventar"). Se hace como parte del criterio de "hecho" de la Fase 2, que ya pide explícitamente "solo ve su taller".

## Qué falta (Fase 2)

- [x] Código de login (email+contraseña), magic link, reset de contraseña, y protección de rutas.
- [ ] **Bloqueo actual**: Pedro tiene que crear su usuario en el Dashboard de Supabase (Authentication → Users → Add user, con "Auto Confirm User" tildado) y avisarme el email que usó, para que yo cree el taller y la fila en `public.usuarios` que lo vincule.
- [ ] Configurar en el Dashboard (Authentication → URL Configuration): Site URL `http://localhost:5199`, Redirect URLs `http://localhost:5199/**`.
- [ ] Cuenta de Brevo + clave SMTP dedicada, y cargarla en Supabase (Authentication → Auth Settings → SMTP Settings) para que el magic link y el reset de contraseña lleguen por mail de verdad (mientras tanto, Supabase manda los mails con su propio servicio de test, con límites bajos — sirve para probar el flujo pero no para uso real).
- [ ] Login con email+contraseña probado de punta a punta con un usuario real.
- [ ] Magic link probado de punta a punta (recibir el mail y entrar).
- [ ] Reset de contraseña probado de punta a punta (pedir el link, entrar, cambiar la contraseña, loguearse con la nueva).
- [ ] La prueba de aislamiento entre dos talleres (heredada de la Fase 1) con dos usuarios reales.

## Decisiones tomadas y motivo

- **Tailwind v4 en vez de v3**: es la versión estable actual (4.3.3 al momento de instalar), y shadcn/ui ya soporta el flujo CSS-first (`@import "tailwindcss"` + `@theme inline`), sin `tailwind.config.js`. No hay razón para instalar v3 en un proyecto nuevo.
- **shadcn con preset "nova" y base "radix"**: es el preset/base por defecto de la CLI actual (`shadcn@4.21.0`); "radix" es la base clásica de shadcn/ui (la más probada), en vez de "aria" o "base". No se investigó a fondo la diferencia entre presets visuales (Nova/Vega/Maia/...) — si Pedro tiene una preferencia de estilo, se puede recrear con otro preset.
- **ESLint + Prettier en vez de oxlint**: el template nuevo de `create-vite` trae `oxlint` por defecto, pero el plan pide explícitamente ESLint + Prettier. Se removió `oxlint` y se instaló el stack estándar (`eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, `eslint-config-prettier`).
- **Sin íconos reales de PWA todavía**: `vite-plugin-pwa` está configurado pero con `icons: []` en el manifest — hacen falta archivos PNG (192x192, 512x512, maskable) que no existen todavía. Se completa en la Fase 6 (PWA) o cuando Pedro tenga un logo.
- **`baseUrl` removido de los tsconfig**: TypeScript 6 lo marca deprecado (`TS5101`) y con `moduleResolution: "bundler"` no hace falta — `paths` funciona sin `baseUrl`.
- **`usuarios.rol` se mantiene en el esquema** aunque hoy todos los usuarios son "owner": Pedro planea diferenciar roles a futuro (multi-tenant), así que la columna evita una migración de esquema más adelante. Por ahora el valor por defecto/único será `owner`.
- **`taller_id` se auto-completa por trigger** en vez de exigir que el front lo mande en cada insert: reduce código en el front (no hay que leer el `taller_id` del usuario logueado en cada formulario) y reduce la superficie de error humano. La seguridad real sigue estando en las policies RLS (`WITH CHECK`), el trigger es solo comodidad — si el trigger fallara o alguien lo desactivara, RLS igual bloquea un `taller_id` incorrecto.
- **No hay policies de INSERT/UPDATE/DELETE en `talleres` ni `usuarios`**: no hay registro self-service todavía (explícitamente fuera de alcance del MVP), así que altas de talleres y usuarios se hacen a mano por Pedro con el `service_role` key (que bypassea RLS) desde el SQL Editor de Supabase o el Dashboard. Si en algún momento se agrega un flujo de invitación de usuarios, hay que sumar policies ahí.
- **Índices `pg_trgm` para búsqueda parcial** (`clientes.nombre`, `vehiculos.patente`) se agregaron ya en la Fase 1 en vez de esperar a la Fase 3, porque son parte del esquema/índices que pide el checklist de esta fase y evitan una migración extra después.
- **Sin stack local de Supabase (Docker no disponible en esta máquina)**: no se pudo correr `supabase start` para probar las migraciones localmente antes de aplicarlas. Se aplicaron directo al proyecto remoto de Pedro con `supabase db push` después de que él hizo `supabase login`. Es una desviación menor de lo ideal (probar local primero) pero razonable dado el entorno, y terminó funcionando sin errores.
- **Test de aislamiento entre talleres pospuesto a la Fase 2**: hacerlo bien requiere usuarios reales de `auth.users`, que no existen todavía (no hay login). No se simuló creando filas a mano en `auth.users` porque es una tabla interna de Supabase Auth (GoTrue) y no tengo certeza de su estructura exacta — se prefirió no inventar. En cambio se verificó lo que sí se puede probar sin usuarios reales: `anon` ve 0 filas, y `authenticated` sin perfil en `usuarios` también ve 0 filas.
- **React Router elegido por Pedro** (sobre TanStack Router o rutas a mano) para las páginas de la app y la protección de rutas: no estaba definido en el stack del plan, se consultó explícitamente antes de instalar una librería nueva.
- **Ruteo con componentes (`<BrowserRouter>`/`<Routes>`/`<Route>`)** en vez del modo "framework" de React Router (con su plugin de Vite y convención de archivos): para una app de este tamaño es más simple de entender y mantener por un solo desarrollador part-time, y no depende de una convención de carpetas nueva.
- **`/restablecer-contrasena` es una ruta pública, sin guard de auth**: cuando el usuario toca el link del mail de reset, Supabase le arma una sesión de recuperación temporal (vía `detectSessionInUrl`), así que técnicamente "hay sesión" en ese momento. En vez de mezclar esa ruta con la lógica de `RequireAuth`/`RedirectIfAuthed`, se dejó aparte: si el link venció o es inválido, `supabase.auth.updateUser` devuelve error y se lo mostramos al usuario en el propio formulario.
- **Creación de talleres/usuarios sigue siendo manual** (sin self-service, como pide el plan): el primer usuario (Pedro) se crea a mano desde el Dashboard de Supabase, y yo vinculo esa fila de `auth.users` a un `taller` y a `public.usuarios` por SQL. Si en el futuro se necesitan altas de usuario más frecuentes (para el máximo de 5 por taller), conviene armar una pantalla de invitación — no está en el alcance de esta fase.
- **Puerto de dev fijo (`5199`)** en vez de dejar que Vite elija uno libre: Supabase Auth necesita que las Redirect URLs sean exactas (o un wildcard fijo), así que un puerto que cambie en cada corrida rompería el flujo de magic link/reset en desarrollo.

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

- Cuenta/bucket de Cloudflare R2 — se pospone (fotos no van en el MVP).
- **Crear el usuario de Pedro** en Supabase Dashboard → Authentication → Users → Add user (con "Auto Confirm User" tildado) y avisar el email usado.
- **Configurar Site URL / Redirect URLs** en Authentication → URL Configuration: `http://localhost:5199` y `http://localhost:5199/**`.
- **Cuenta de Brevo** (SMTP): crear cuenta gratis en brevo.com, ir a Settings → SMTP & API → SMTP, generar una **clave SMTP dedicada** (no la API key) y pasarla para cargarla en Supabase (Authentication → Auth Settings → SMTP Settings). Se puede seguir probando el flujo sin esto (Supabase manda mails de prueba con su servicio propio, límites bajos), pero antes de usar la app con clientes reales hace falta.

## Comandos clave del proyecto

```bash
npm run dev            # servidor de desarrollo
npm run build          # type-check + build de producción
npm run preview        # sirve el build de producción
npm run lint           # ESLint
npm run format         # Prettier (escribe cambios)
npm run format:check   # Prettier (solo verifica)

npx supabase migration list           # ver estado de migraciones local vs remoto
npx supabase db push                  # aplicar migraciones nuevas al remoto (proyecto ya linkeado)
npx supabase db push --include-seed   # aplicar migraciones + supabase/seed.sql
npx supabase gen types typescript --linked > src/lib/database.types.ts   # regenerar tipos tras cambiar el esquema
```

## Versiones relevantes (al momento de instalar, 2026-09-18)

- Node v22.18.0, npm 11.10.0
- Vite 8.3.0, React 19.2.8, TypeScript ~6.0.2
- Tailwind CSS 4.3.3
- shadcn CLI 4.21.0
- @tanstack/react-query 5.103.1
- @supabase/supabase-js 2.116.0
- vite-plugin-pwa 1.3.0
- supabase (CLI) 2.117.0
- react-router 8.4.0 (agregado 2026-09-18, Fase 2)
