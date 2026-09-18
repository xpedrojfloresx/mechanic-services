# Bitácora del proyecto — Gestión de Talleres ("Mechanic Services")

> **Fuente de verdad para retomar el trabajo.** Leer primero este archivo y `CLAUDE.md`.
> Última actualización: 2026-09-18. Repo: `https://github.com/xpedrojfloresx/mechanic-services` (rama `main`, todo commiteado y pusheado).

## PASOS A SEGUIR EN LA NUEVA SESIÓN (en este orden)

1. **Ponerse al día (5 min)**: leer `CLAUDE.md` y este archivo (§1 a §3 alcanzan para empezar). Correr `git status` y `git log --oneline | head` para confirmar que el repo está limpio y en `main` (solo pueden quedar sin commitear `.agents/` y `skills-lock.json`, que **no** se commitean).
2. **Saludar a Pedro con un resumen de 3 líneas** y hacerle las preguntas que bloquean la Fase 6, todas juntas (con `AskUserQuestion` si conviene):
   - ¿Tenés el **logo/ícono** de la app? (si no: se hace la PWA con un ícono provisorio a partir del favicon y se cambia después).
   - ¿Pudiste **probar la app logueada** (recibir un auto → cargar servicios → recordatorio → WhatsApp)? ¿Algo que arreglar antes de seguir? Si Pedro reporta bugs o falta de intuición, **eso va primero**.
   - ¿Aprobás los **textos de WhatsApp** y los **umbrales de aviso de entrega** (5 días En taller / 2 días Listo)?
3. **Fase 6 (PWA)**, si Pedro da el OK: (a) íconos PNG 192/512/maskable en `public/` y en el `manifest` de `vite.config.ts` (`icons`, `display: 'standalone'`, `start_url`, `background_color`); (b) cache **de lectura** con Workbox (`runtimeCaching`, red primero con respaldo de cache) para las consultas a Supabase de fichas/búsquedas recientes; **sin** sync de escritura offline ni push (confirmar antes si Pedro los pide); (c) `registerType: 'autoUpdate'` ya está; (d) verificar con `npm run build && npm run preview` que el service worker se registra y que "Instalar" aparece; (e) actualizar `.gitignore`/docs si hace falta y anotar en este archivo.
4. **Fase 8 (deploy y backups)** después de la 6: Cloudflare Workers con Static Assets (wrangler), variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (la **publishable**, nunca la secret), agregar la URL de producción a **Redirect URLs** de Supabase Auth, documentar el deploy paso a paso y **escribir el plan de backups** (Supabase free no trae: Pro o `pg_dump` programado a R2). Pedro tiene que crear la cuenta/proyecto en Cloudflare: decirle exactamente qué crear.
5. **En paralelo, cuando Pedro las tenga**: cargar la **clave SMTP de Brevo** en Supabase (§9) y probar el **magic link** recibiendo el mail.
6. **Cada unidad de trabajo**: `npm run build` + `npm run lint`, probar (SQL con RLS simulada y/o navegador con sesión falsa, §12), actualizar este archivo, commit chico + push (sin `.agents/` ni `skills-lock.json`), y contarle a Pedro qué quedó hecho y qué falta.
7. **Si Pedro pide algo de la lista "NO construir"** de `CLAUDE.md` (ARCA, caja, stock, sueldos, multi-sucursal, firma digital): frenar y confirmar el alcance antes de escribir código.

## 1. Arranque rápido (leer esto primero)

**Qué es**: app web (PWA a futuro) para mecánicos y talleres: clientes, vehículos, ingresos/servicios, recordatorios de próximo servicio y búsqueda rápida por patente o nombre. Se usa desde el celular y la PC. Un solo desarrollador (Pedro), part-time; prioridad: **simple, rápido, barato, poco código**.

**Dónde estamos**: Fases 0 a 5 del plan **hechas** más varios extras que pidió Pedro (rediseño de flujo, WhatsApp, cambiar de dueño, modo ágil, insights, rediseño visual). Todo verificado por Claude con SQL/RLS y en navegador con datos falsos; **Pedro todavía no probó nada de esto con datos reales**. **Siguiente: Fase 6 (PWA)**, que necesita un logo/ícono de Pedro (el `manifest` tiene `icons: []`).

**Primeras cosas a hacer en una sesión nueva**
1. Leer `CLAUDE.md` (reglas permanentes) y este archivo.
2. `git status` (debería estar limpio salvo `.agents/` y `skills-lock.json`, que **no** se commitean; ver §11).
3. Preguntarle a Pedro: ¿probó la app logueada?, ¿tiene el logo para la Fase 6?, ¿aprueba los textos de WhatsApp y los umbrales de aviso? (ver §9).
4. Antes de cambiar el esquema o construir algo grande: respetar el alcance de `CLAUDE.md` (lista "NO construir") y **preguntar, no inventar**.

**Pedro** (`pflores0213@gmail.com`): habla español rioplatense, quiere respuestas cortas, decide rápido y da feedback de uso real ("no es intuitivo para un mecánico con mil cosas en la cabeza"). Le gusta que se le muestre qué se hizo y qué falta. **Claude no debe escribir su contraseña ni usar credenciales reales**: no puede loguearse; las pruebas visuales se hacen con sesión falsa (ver §12).

## 2. Estado por fase del plan

| Fase | Estado | Notas |
|---|---|---|
| 0 Setup | Hecha | Vite+React+TS, Tailwind v4, shadcn/ui, TanStack Query, RHF+Zod, Supabase, vite-plugin-pwa, ESLint+Prettier. Repo en GitHub. |
| 1 Base de datos | Hecha | 7 tablas con `taller_id`, RLS, índices `pg_trgm`, tipos generados. Aislamiento entre talleres probado con usuario real. |
| 2 Autenticación | Hecha, falta Brevo | Login email+contraseña, magic link, reset. Mails por el mailer de prueba de Supabase. **Falta clave SMTP de Brevo** (Pedro). Magic link no se probó recibiendo el mail. |
| 3 Clientes, vehículos, búsqueda | Hecha (sin prueba de Pedro) | Buscador global, fichas, patente normalizada y validada. |
| 4 Servicios e ítems | Hecha (sin prueba de Pedro) | Ingreso con estado, servicios realizados (renglones), total calculado. |
| 5 Recordatorios | Hecha (sin prueba de Pedro) | Con atajos de fecha, agrupados por urgencia, WhatsApp. |
| 6 PWA | **Pendiente (siguiente)** | Instalable, cache de lectura de últimas búsquedas/fichas. **Sin** sync offline de escritura ni push (confirmar con Pedro antes). Falta logo. |
| 7 Fotos | **Fuera del MVP** | Pedro dijo que no entra. |
| 8 Deploy y backups | Pendiente | Cloudflare Workers (Static Assets, wrangler); plan de backups escrito (free de Supabase no trae; Pro o `pg_dump` a R2). No darlo por resuelto en silencio. |

**Extras hechos a pedido de Pedro** (no son fases del plan): dashboard con menú lateral; insights con gráficos; teléfono AR/CL; eliminar clientes; ingreso del vehículo (motivo, estado al llegar); rediseño del flujo ("Recibir vehículo" por patente); buscador global; servicios múltiples por ingreso; avisos de "¿ya se entregó?"; modo ágil; cambiar de dueño; botón de WhatsApp; rediseño visual (sin animaciones).

## 3. Mapa de la app (rutas y pantallas)

Públicas: `/login` (email+contraseña; sección "Otras formas de iniciar sesión" con magic link), `/olvide-mi-contrasena`, `/restablecer-contrasena` (sin guard: la sesión de recuperación la arma el link del mail).

Protegidas (dentro de `AppLayout`: barra superior con botón de menú + **buscador global**, menú lateral en escritorio, **barra inferior en celular**: Inicio · Servicios · **Recibir** (destacado) · Clientes):

- `/` **Inicio**: botón grande "Recibir vehículo"; **"En el taller ahora"** (servicios En taller/Listo, el más viejo primero; botón de un toque para avanzar estado; aviso "¿Ya se entregó?" si lleva muchos días; ícono de WhatsApp); **"Para avisar"** (recordatorios vencidos o de este mes, top 3); **Resumen** (clientes, vehículos, en taller); **Insights** (gráficos Semana/Mes/Año de clientes y vehículos nuevos).
- `/recibir?patente=` **Recibir vehículo** (flujo principal): escribir la patente → si existe, solo km + motivo (+ estado al llegar opcional; muestra el último km); si figura abierto en el taller pregunta "¿ya se entregó?" antes de abrir otro ingreso; si es nueva → "Cliente nuevo" o "Cliente que ya tengo" + datos del auto + ingreso en una pantalla. Al guardar cae en `/servicios/:id`.
- `/servicios` lista con filtros **En el taller / Entregados / Todos** (abre en "En el taller"); botón **Añadir servicio** → `/servicios/nuevo` (elegir auto por patente o nombre → ingreso abierto → cargar varios servicios con un solo Guardar). `/servicios/:id` ficha (cliente primero con teléfono tocable, botones de estado, "Servicios realizados" con total, WhatsApp, "Próximos servicios", datos del ingreso, editar/eliminar). `/servicios/:id/editar`.
- `/clientes` lista; `/clientes/:id` ficha (vehículos, WhatsApp, editar, **eliminar con confirmación**: borra vehículos e historial); `/clientes/:id/editar`; `/clientes/nuevo` (existe pero el camino principal es Recibir).
- `/vehiculos/:id` ficha (datos, dueño, WhatsApp, **Cambiar de dueño**, "Próximos servicios", historial); `/vehiculos/:id/editar` (con ingreso opcional por si se olvidó); `/vehiculos/nuevo?cliente=`, `/vehiculos/:id/ingreso` (rutas viejas, ya sin enlaces principales); `/vehiculos/:id/cambiar-cliente`.
- `/recordatorios` (Vencidos / Este mes / Más adelante; Hecho, Quitar, WhatsApp); `/recordatorios/nuevo`.
- `*` → página 404.

## 4. Stack y estructura del código

Vite 8 + React 19 + TypeScript 6, Tailwind v4 (CSS-first, sin `tailwind.config.js`), shadcn/ui (radix, preset nova, fuente Geist, íconos `lucide-react`), TanStack Query, React Hook Form + Zod 4, `react-router` 7 (rutas con componentes, no modo framework), Supabase (Postgres+Auth+RLS; **sin backend propio**), `recharts` (vía shadcn `chart`), `vite-plugin-pwa`. Hosting previsto: Cloudflare Workers Static Assets. Ver versiones en §13.

```
src/
  components/      app-layout, form-field, mas-datos, patente, empty-state, ui/ (shadcn)
  features/        auth, busqueda, clientes, vehiculos, servicios, recordatorios, resumen, whatsapp
                   (cada una: api.ts con hooks TanStack Query, schema.ts, components/)
  routes/          una página por ruta
  lib/             supabase.ts (cliente tipado), queryClient.ts, database.types.ts (GENERADO), formato.ts, like.ts, utils.ts, use-debounced-value.ts
  hooks/use-mobile.ts (de shadcn, reescrito con useSyncExternalStore)
supabase/          config.toml, migrations/, seed.sql
```
Convención: **nombres en inglés, textos y comentarios en español rioplatense**. Un hook por operación en `api.ts`; invalidar las `queryKey` relacionadas al mutar.

## 5. Base de datos (Supabase proyecto "Mechanic Services", ref `yvpixnfacvffpwqsvdct`)

Tablas (todas con `taller_id` y RLS por `taller_id = current_taller_id()`): `talleres`, `usuarios` (id = `auth.users.id`, `rol` default `owner`), `clientes` (nombre, telefono solo dígitos, email), `vehiculos` (patente normalizada, **única por taller**; marca, modelo, anio, color, `cliente_id`), `servicios` (= **ingreso**: `fecha_ingreso`, `fecha_entrega`, `km_al_ingreso`, `motivo_ingreso`, `estado_al_ingreso`, `estado` en_taller/listo/entregado con `check`; `observaciones` y `total` existen pero la UI no los usa), `servicio_items` (renglones: descripcion, cantidad, precio opcional; en la UI se llaman "servicios realizados"), `recordatorios` (tipo km/fecha, `target_km`, `fecha_estimada` obligatoria, nota, estado pendiente/hecho).

Migraciones aplicadas (en `supabase/migrations/`):
1. `…000001_initial_schema` tablas, constraints, índices `pg_trgm`.
2. `…000002_rls_policies` `current_taller_id()` (SECURITY DEFINER), triggers que derivan `taller_id` del padre **solo si viene null**, `updated_at`, RLS y policies (en `talleres`/`usuarios` solo SELECT).
3. `…000003_cascade_delete` `vehiculos.cliente_id` y `servicios.vehiculo_id` en cascada: **borrar un cliente borra sus vehículos e historial, sin deshacer**.
4. `…000004_ingreso_y_alta_completa` columnas `motivo_ingreso`/`estado_al_ingreso` + función `crear_cliente_completo(p_cliente, p_vehiculo, p_ingreso)` (una transacción).
5. `…000005_crear_vehiculo_con_ingreso` función `crear_vehiculo_con_ingreso(p_cliente_id, p_vehiculo, p_ingreso)`.
6. `…000006_estado_servicio` `estado` not null default `en_taller` + `check` + índice.
7. `…000007_validar_cambio_de_cliente` trigger que rechaza (42501) pasar un vehículo a un cliente de **otro taller** (las FK no pasan por RLS).

Datos reales: taller **"Mecánicos Boock"** (id `b3257d3b-a512-477a-8cc1-5ceff74422b7`), usuario Pedro (id `b61a328a-d5a6-44bd-bd1f-f84ddee9402b`, `owner`). Existe además el **"Taller Demo"** del `seed.sql` (id `00000000-0000-0000-0000-000000000001`, 2 clientes). Pedro pudo haber creado clientes de prueba.
**Altas de talleres y usuarios son manuales** (sin self-service, como pide el plan): crear el usuario en el Dashboard de Supabase (Authentication → Users, "Auto Confirm") y vincularlo por SQL a un taller y a `public.usuarios`.
Notas de seguridad: `taller_id` lo manda el front en los inserts (tipos lo exigen) y los triggers/`WITH CHECK` son la garantía real (probado). Los **errores de RLS** se ven como `42501`; unicidad de patente como `23505`.

## 6. Reglas de negocio y decisiones de producto

- **Patente**: se normaliza (mayúsculas, sin espacios/guiones) al guardar; solo formatos `ABC123` y `AB123CD`. **Motos no** (Pedro: "por el momento no").
- **Teléfono**: solo dígitos; formatos Argentina (10 dígitos, 0+10, 54+10, 549+10) y Chile (9, 56+9); acepta separadores y `+` al escribir pero guarda solo dígitos; opcional. Supuesto no verificado en fuente oficial; no acepta el `15`.
- **Estado del servicio**: lista fija En taller (default) / Listo / Entregado. Al pasar a Entregado se guarda `fecha_entrega` (hoy); al volver atrás se borra.
- **Que no dependa de que el mecánico se acuerde de marcar la entrega**: aviso "¿Ya se entregó?" tras **5 días En taller o 2 días Listo** (`DIAS_PARA_PREGUNTAR` en `features/servicios/estados.ts`; **umbrales propuestos por Claude, a confirmar**); y al recibir un auto que figura abierto se pregunta antes de abrir otro ingreso (cierra los anteriores con fecha de hoy).
- **Total del servicio** = suma de cantidad × precio de los renglones con precio; se calcula al mostrar, no se guarda. Sin símbolo de moneda en pantalla (se usan AR y CL); en WhatsApp se usa `$`.
- **Insights**: "clientes nuevos" = clientes cargados por período (semana = 7 días por día, mes = 30 días por día, año = 12 meses); agrupa en el navegador por fecha local; **límite**: PostgREST devuelve máx. 1000 filas (si un taller pasa de 1000 altas/año, pasar a función SQL). Interpretación de "cantidad de clientes que se tuvo" a confirmar; se podría sumar "clientes atendidos".
- **Recordatorios**: fecha estimada la elige el mecánico (atajos 3/6/12 meses, por defecto 6); km objetivo opcional (con km es tipo `km`, sin km tipo `fecha`). Sin avisos automáticos ni push: solo se muestran en Inicio y `/recordatorios`.
- **WhatsApp** (sin API de WhatsApp Business): botón que abre `https://wa.me/<número>?text=<mensaje>`. Número: AR → `549` + 10 dígitos; CL → `56` + 9 dígitos (supuesto: un número AR de 10 dígitos se trata como celular). Mensajes en `features/whatsapp/whatsapp.ts` (**textos propuestos por Claude, Pedro debe aprobarlos**): según estado (recibimos / ya está listo para retirar + detalle y total / gracias + detalle), saludo general, y aviso de recordatorio. No se probó abrir WhatsApp de verdad.
- **Cambiar de dueño**: solo cambia `vehiculos.cliente_id`; el historial queda con el vehículo.
- **Modo ágil**: lo avanzado va plegado en "Más datos (opcional)" (`MasDatos`): email del cliente, año y color del vehículo, fecha de ingreso (default hoy). Siempre visibles: nombre, teléfono, patente, marca, modelo, km, motivo, estado al llegar (opcional). Se abre solo si hay error o si ya tiene datos.
- **Bandera legal**: se guardan datos personales de terceros (Ley 25.326): datos mínimos, nada sensible. Sin dudas legales abiertas hoy.

## 7. Diseño de interfaz (reglas vigentes)

- **Sin animaciones ni librerías de animación** (decisión de Pedro; `gpt-taste` descartada por ser GSAP/landing). Sí: hover/active/focus normales.
- Un único **acento azul acero** (`--primary` `oklch(0.43 0.085 245)` en `src/index.css`, es una sola variable) y grises con leve tinte del mismo tono; `chart-*` derivados. Ámbar solo para avisos, rojo para destructivo. Modo oscuro definido pero sin interruptor.
- **Patente** siempre con el componente `Patente` (estilo chapa, monoespaciada). Etiquetas (`Badge`) cuadradas (`rounded-md`), coherentes con botones. Cifras tabulares en todo el cuerpo.
- Estados vacíos con `EmptyState` (ícono + qué falta + acción), carga con `Skeleton`, errores en línea. **Los errores de carga solo se muestran si no hay datos que mostrar** (una recarga en segundo plano que falla no debe ocultar lo ya cargado).
- Mobile-first: barra inferior, botones grandes, formularios cortos. Cliente siempre primero (en negrita) en tarjetas y fichas.
- No usar guiones largos como "sin dato" (usar "Sin teléfono", "Sin dato", "-"). Íconos: `lucide` (no cambiar de librería sin consultar). Favicon propio provisorio (llave sobre el acento).
- Skills de diseño del sistema: se usó `redesign-existing-projects` y las reglas aplicables de `design-taste-frontend`. `brandkit` (logos) **no** usar.

## 8. Historial de decisiones técnicas relevantes

- Tailwind v4 (no v3); shadcn preset "nova" + base "radix"; ESLint+Prettier en vez de `oxlint` (que trae el template); `baseUrl` removido de tsconfig (TS 6 lo depreca).
- **React Router elegido por Pedro** (no estaba en el plan). Ruteo con componentes.
- Puerto de dev fijo **5199** en `vite.config.ts` y `.claude/launch.json` (Windows tiene 5173/5174/5180 ocupados por un `svchost`); es el que está en Supabase Auth → URL Configuration (Site URL `http://localhost:5199`, Redirect URLs `http://localhost:5199/**`). Si Pedro ya tiene su server en 5199, Vite usa 5200.
- **Bug clave**: `VITE_SUPABASE_ANON_KEY` tenía la clave *secret* en vez de la *publishable* → todo fallaba con mensajes genéricos. Se diagnosticó con un `fetch` directo (`Forbidden use of secret API key in browser`). Desde entonces los formularios de auth hacen `console.error` con el error real antes del mensaje amigable.
- Sin Docker en la máquina: las migraciones se aplican directo al proyecto remoto con `supabase db push` (probar siempre por SQL con RLS simulada, ver §12).
- `database.types.ts` está en `.prettierignore` (Prettier lo reformateaba) y **se regenera** tras cada migración; conviene commitearlo enseguida. **Trampa recurrente**: varias veces `src/lib/database.types.ts` apareció **vacío (0 bytes)** en la carpeta de trabajo sin causa clara (pasó tras correr Prettier/build); **antes de cada commit correr `wc -l src/lib/database.types.ts` (debe dar ~496) y, si da 0, restaurarlo con `git checkout -- src/lib/database.types.ts`** (o regenerarlo con `supabase gen types`).
- El error `useState`+efecto rompe la regla de lint `react-hooks/set-state-in-effect`: se resuelve con `key`, `useSyncExternalStore` o derivando estado.
- `SidebarInset` de shadcn ya renderiza un `<main>`: no anidar otro.

## 9. Pendientes y dudas abiertas para Pedro

**Bloqueantes/importantes**
- **Probar todo logueado** (`npm run dev`, `http://localhost:5199`): recibir un auto nuevo → cargar 2 servicios → programar recordatorio → marcar Listo → avisar por WhatsApp; y en el celular. Nada de esto se probó con datos reales.
- **Logo/ícono** para el manifest de la Fase 6 (PNG 192, 512 y maskable).
- **Clave SMTP de Brevo** (Fase 2): crear cuenta, Settings → SMTP & API → SMTP, generar **clave SMTP dedicada** (no la API key) y cargarla en Supabase (Authentication → SMTP Settings). Sin esto los mails salen del mailer de prueba (límites bajos). Antes de exponerlo a un cliente real: dominio propio + SPF/DKIM.
- Aprobar o cambiar los **textos de WhatsApp** y los **umbrales de aviso** (5 días En taller / 2 días Listo).
- Confirmar los **formatos de teléfono** y el supuesto del número de WhatsApp.

**Preguntas sin responder** (se aplicó la recomendación de Claude; confirmar): estructura de "servicio" dentro del ingreso (se hizo "línea simple": renglones con nombre, cantidad y precio) y dónde vive "Añadir servicio" (se hizo "elegir auto y sumar servicios"). Interpretación de "clientes que se tuvo" en Insights.

**Ideas no hechas (a pedido de Pedro si las quiere)**: eliminar vehículos sueltos; fecha de entrega editable al cerrar; aviso de demora también en el menú; cierre automático tras N días; guardar el total o campo `tipo` repuesto/mano de obra; sugerir próximo servicio; recordatorio recurrente; guardar "observaciones" (la columna existe sin uso en UI).
**Después del MVP (no adelantarse)**: fotos, dictado por voz, QR por vehículo, importar/exportar CSV, roles, presupuesto previo, turnero. **Nunca**: facturación ARCA, caja/cuenta corriente, stock, sueldos, multi-sucursal, firma digital (ver `CLAUDE.md`).
Otro: Pedro decide si quiere la skill `find-skills` enlazada en `~/.claude/skills` (instaló `brandkit` y `find-skills` pero Claude Code no las ve: las skills se leen de `.claude/skills`, no de `.agents/`).

## 10. Plan de la Fase 6 (PWA) y siguientes

- Fase 6: `vite-plugin-pwa` ya está instalado con manifest básico (nombre "Gestión de Talleres", `theme_color` `#2b5b84`). Falta: íconos, `display: standalone`, cache **de lectura** de las últimas búsquedas/fichas (estrategia de red primero con cache, sin escribir offline), probar "instalar" en un celular. **No** sync offline de escritura ni push sin confirmar con Pedro.
- Fase 8: deploy en Cloudflare Workers (Static Assets/wrangler) con variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) y documentar el paso a paso acá; **agregar la URL de producción a las Redirect URLs de Supabase Auth**; escribir el plan de backups.
- Aviso: el bundle pesa ~660 kB (warning de Vite); cuando llegue el momento se puede hacer code-splitting por ruta.

## 11. Reglas de trabajo con git y con Pedro

- Commits chicos y descriptivos, con `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Pedro autorizó commitear y pushear a `main` de forma rutinaria; **si rechaza un commit, esperar su OK**.
- **No commitear `.agents/` ni `skills-lock.json`** (son de una instalación de skills de otro agente): usar `git add -A -- . ':!.agents' ':!skills-lock.json'` en vez de `git add -A` a secas. Antes de commitear, revisar `git status` por archivos raros (se colaron dos archivos vacíos por comandos de shell mal escapados; ya se borraron).
- Antes de cada commit: `npm run build` y `npm run lint` (deja 5 warnings benignos de `react-refresh/only-export-components`, de shadcn y del contexto de auth).
- Actualizar este archivo al terminar cada unidad de trabajo.

## 12. Cómo probar sin loguearse y trampas del entorno (Windows)

- Claude **no** usa la contraseña de Pedro. Para ver pantallas: abrir `/login` en el navegador de Claude, inyectar en `localStorage` una sesión falsa con la clave `sb-yvpixnfacvffpwqsvdct-auth-token` (`access_token` con JWT de forma válida, `expires_at` a futuro, `user.id` = id de Pedro, `refresh_token` cualquiera), redirigir a `/`, y cargar datos con `queryClient.setQueryData([...clave], datos)` importando `/src/lib/queryClient.ts` (las claves están en cada `api.ts`; ej. `['servicios','lista','en_curso']`, `['recordatorios','lista','pendiente']`, `['taller-actual', <userId>]`, `['conteos']`). Para navegar sin recargar: `history.pushState` + `dispatchEvent(new PopStateEvent('popstate'))`. Al terminar `localStorage.clear()` y parar el servidor. **Editar archivos recarga la página y pierde los datos inyectados.** Las consultas reales fallan (401) con la sesión falsa: es esperado.
- Servidor: `mcp__Claude_Browser__preview_start` con `name: "dev"` (usa `.claude/launch.json`); mirar `preview_logs` para ver el puerto real (5199 si está libre, si no 5200). Hay un **tope de pestañas**: cerrar las viejas con `tabs_close`. Si el screenshot da timeout, reintentar o usar `get_page_text`.
- **Probar la base con RLS simulada** (sin login): `npx supabase db query --linked "set local role authenticated; set local request.jwt.claim.sub = '<id de Pedro>'; <sql>"`. Cada llamada es una transacción; una consulta con CTE no ve filas insertadas en la misma sentencia (hacer pasos separados). **Siempre borrar los datos de prueba** (usar nombres con prefijo `ZZ`).
- Validar la sintaxis de una consulta de la app contra la API real con `fetch` a `/rest/v1/...` usando la clave publishable del `.env` (como anónimo devuelve `200 []`; un 400 delata un error de sintaxis/relación).
- **Shell**: en el `Bash` de esta máquina los **backslashes se pierden** dentro de heredocs/`python -`: usar `os.sep` o la herramienta `Write` para archivos con `\`. Un `>` o `>=` sin comillas en un comando crea archivos basura (pasó). Preferir `Write`/`Edit` para código.
- Ver §8 para el puerto 5199 y la clave anon/secret.

## 13. Comandos clave y versiones

```bash
npm run dev            # servidor de desarrollo (puerto 5199)
npm run build          # type-check + build de producción
npm run preview        # sirve el build
npm run lint           # ESLint
npm run format         # Prettier (escribe)  |  npm run format:check
npx supabase migration list                    # local vs remoto (proyecto ya linkeado)
npx supabase db push                           # aplicar migraciones nuevas
npx supabase db push --include-seed            # + seed.sql
npx supabase gen types typescript --linked > src/lib/database.types.ts   # regenerar tipos
npx supabase db query --linked "<sql>"         # consultas/pruebas contra el remoto
npx shadcn@latest add <componente> -y -o       # agregar componente shadcn (-o sobrescribe)
```
Versiones (al instalar, 2026-09-18): Node 22.18, npm 11.10, Vite 8.3, React 19.2, TypeScript ~6.0, Tailwind 4.3, shadcn CLI 4.21, TanStack Query 5.103, supabase-js 2.116, vite-plugin-pwa 1.3, supabase CLI 2.117, react-router 7.18, recharts 3.8, zod 4.6, react-hook-form 7.88.
`supabase login` ya lo hizo Pedro en su máquina (el token queda en su perfil); el proyecto está linkeado (`supabase/.temp`, no borrar).

## 14. Respuestas de Pedro a las preguntas iniciales (sección 5 del plan)

1. Multi-tenant a futuro; el MVP es single-tenant-ready (cada taller se loguea con su usuario y ve solo lo suyo). 2. Nombre: "Mechanic Services" por ahora (repo `xpedrojfloresx/mechanic-services`; puede cambiar). 3. Campos del modelo del plan: bien, con posible expansión. 4. Login: email+contraseña, magic link como alternativa, reset por mail vía Brevo SMTP. 5. Máximo **5 usuarios por taller, todos "owners"** (sin roles ni clientes). 6. **Fotos: no** en el MVP. 7. Sin datos extra del rubro por ahora.
