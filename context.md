# Bitácora del proyecto — Gestión de Talleres

## Estado actual

### >>> PRÓXIMA TAREA (pedida por Pedro, hacer ANTES de la Fase 6) <<<

**Rediseño visual de toda la interfaz** usando estas tres skills, en este orden: `redesign-existing-projects` (auditar lo existente y detectar patrones genéricos), `design-taste-frontend` y `gpt-taste` (aplicar criterio de diseño). Cargarlas con la herramienta Skill (están en la lista de skills de la sesión). Alcance: **todas** las pantallas y componentes creados (login/recuperar contraseña, layout con menú lateral y barra inferior de celular, buscador global, Inicio, Recibir vehículo, Servicios y su ficha, Clientes y su ficha, Vehículo y su ficha, Recordatorios, formularios, tarjetas, estados vacíos, gráficos).
Reglas para no romper el producto (de `CLAUDE.md` y de lo que pidió Pedro): mantener **simple, rápido y mobile-first** para un mecánico apurado; no agregar features nuevas; **no** meter animaciones pesadas ni librerías nuevas sin consultar (`gpt-taste` propone GSAP: adaptarlo o descartarlo, la app debe seguir liviana para la PWA); conservar el flujo actual (Recibir por patente, buscador global, avisos de entrega, "Más datos" plegado); textos en español rioplatense; verificar en navegador (escritorio y celular, con sesión falsa + datos inyectados en `queryClient`, ver abajo) y con `npm run build` / `npm run lint`. Pedro no vio nada de esto con datos reales todavía, así que **mostrarle antes/después** y commitear por partes chicas. `brandkit` (logos) NO usarla: Pedro dijo que no. Al terminar, recién ahí seguir con la **Fase 6 (PWA)**; para eso hace falta un logo/ícono de Pedro (los íconos del manifest están vacíos).
Cómo probar sin loguearse (Claude no usa la contraseña de Pedro): abrir `/login` en el navegador de Claude, inyectar en `localStorage` una sesión falsa con la clave `sb-yvpixnfacvffpwqsvdct-auth-token` (JWT de forma válida, `exp` a futuro, usuario `b61a328a-d5a6-44bd-bd1f-f84ddee9402b`) y cargar datos de ejemplo con `queryClient.setQueryData([...clave], datos)` importando `/src/lib/queryClient.ts`; al terminar `localStorage.clear()` y parar el servidor. El puerto 5199 lo suele ocupar Pedro: si Vite arranca en otro (5200), usar ese.
Estado del repo: todo commiteado y pusheado en `main` (último: Fase 5 recordatorios). Sin commitear a propósito: `.agents/` y `skills-lock.json` (skills de otro agente; no incluir en commits, usar `git add -A -- . ':!.agents' ':!skills-lock.json'`).
Otros pendientes de Pedro: clave SMTP de Brevo (Fase 2), aprobar los textos de WhatsApp, probar todo logueado, y decidir si quiere `find-skills` enlazada en `~/.claude/skills`.


**Fase 0: completa y pusheada a GitHub** (`main`,
`https://github.com/xpedrojfloresx/mechanic-services`).

**Fase 1 (Base de datos y esquema en Supabase): completa.** La prueba de
aislamiento entre talleres con un usuario real ya se hizo (ver más abajo) —
queda cerrada del todo.

**Fase 2 (Autenticación): completa para el MVP**, con una sola cosa
pendiente a propósito: cargar la clave SMTP de Brevo (Pedro la va a mandar
cuando la tenga; mientras tanto los mails de auth los manda el mailer propio
de Supabase, que funciona pero no es para producción).

**Fase 5 (Recordatorios): código escrito y probado por SQL/navegador con datos falsos; falta la prueba de Pedro logueado.** Ver "Fase 5" en "Hecho y verificado".

**Fase 4 (Servicios e ítems): código escrito y probado por SQL/navegador con datos falsos; falta la prueba de Pedro logueado.** Ver "Fase 4" en "Hecho y verificado".

**Fase 3 (Clientes, vehículos y búsqueda rápida): código escrito, falta que
Pedro la pruebe logueado en el navegador** (Claude no puede loguearse: no
usa la contraseña de Pedro). Ver "Qué falta (Fase 3)".

## Hecho y verificado

### Fase 5 — Recordatorios / próximos servicios (2026-09-18)

- **Cargar un recordatorio** (`RecordatorioForm`, modo ágil): "¿Qué hay que hacer?" + atajos **"En 3 meses / 6 meses / 1 año"** (por defecto 6 meses, muestra la fecha estimada) + "A los cuántos km" **opcional** (con el km del ingreso como referencia en el ejemplo) + "Otra fecha" plegada. Si se pone km es de tipo `km` (con `target_km`) y si no, de tipo `fecha`; **la fecha estimada la elige siempre el mecánico** (el km depende del uso, como pide el plan). Sin fecha de vencimiento por km automática.
- **Dónde se carga**: en la ficha del servicio y en la del vehículo ("Próximos servicios" → "Programar próximo servicio", `ProximosServicios`), y desde la nueva sección **Recordatorios** del menú (botón "Nuevo recordatorio": elige el auto y carga el aviso).
- **Sección Recordatorios** (`/recordatorios`, ahora en el menú; se sacó el grupo "Próximamente"): pendientes agrupados en **Vencidos / Este mes / Más adelante**, cada uno con cliente, patente, qué hay que hacer, fecha y km, y botones **Hecho** (pasa a `hecho`), **Quitar** y el ícono de **WhatsApp** con el mensaje armado ("…tiene pendiente: <nota> (a los X km o hacia el dd/mm/aaaa). Escribinos para coordinar." — texto propuesto por mí, a aprobar).
- **Inicio**: sección **"Para avisar (N)"** con los vencidos y los de este mes (los 3 más urgentes + link a ver todos), justo debajo de "En el taller ahora".
- Base: la tabla `recordatorios` ya existía desde la Fase 1 (sin migración nueva). Probado por SQL con RLS: alta con y sin km (tipo `km`/`fecha`), listado con joins, marcar hecho, `check` de tipo inválido rechazado, y borrar un cliente arrastra sus recordatorios. La lista de recordatorios ya usa fecha local (no UTC) para "hoy".
- Verificado en navegador con datos falsos: agrupación por urgencia, Inicio, ficha del vehículo, validaciones del formulario (nota, km inválido) y atajos de fecha. **Falta** la prueba de Pedro con datos reales.
- `ElegirVehiculo` (buscador de auto) quedó compartido entre "Añadir servicio" y "Nuevo recordatorio".
- Ideas que **no** se hicieron (fuera del alcance del MVP o a confirmar): avisos automáticos/push, sugerir el próximo servicio según lo que se hizo, recordatorio recurrente ("cada 6 meses").

### Botón de WhatsApp (2026-09-18)

Versión mínima, **sin la API de WhatsApp Business**: un botón abre `https://wa.me/<número>?text=<mensaje>` y la persona revisa y envía el mensaje ella. Archivos: `features/whatsapp/whatsapp.ts` (funciones puras) y `components/boton-whatsapp.tsx`.
- **Número**: se arma desde los dígitos guardados. Argentina (10 dígitos, 0+10, 54+10, 549+10) → `549` + 10 dígitos; Chile (9 dígitos o 56+9) → `56` + 9 dígitos. Probado con 10 casos. **Supuestos a confirmar**: un número argentino de 10 dígitos se trata como celular (`549…`; si era un fijo WhatsApp no lo encuentra) y no se acepta el `15`. Sin teléfono válido el botón aparece deshabilitado ("Falta un teléfono válido") o, en las tarjetas chicas, no aparece.
- **Dónde**: ficha del servicio ("Avisar por WhatsApp", el mensaje cambia según el estado y en *Listo*/*Entregado* incluye el detalle de servicios y el **total**), ícono en cada tarjeta de "En el taller ahora" (un toque), y "WhatsApp" en la ficha del cliente y del vehículo.
- **Textos propuestos por mí (Pedro los tiene que aprobar o cambiar)**, en `whatsapp.ts`: *En taller*: "Hola Juan, recibimos tu Ford Fiesta (AB123CD) en <taller>. Te avisamos cuando esté listo." · *Listo*: "…ya está listo para retirar en <taller>." + detalle · *Entregado*: "…gracias por confiar en <taller>. Te dejamos el detalle del servicio…" + detalle · general: "Hola Juan, te escribimos de <taller> por tu Ford Fiesta (AB123CD)." El importe usa el símbolo `$` (lo usan Argentina y Chile) sin moneda.
- Verificado en navegador con datos falsos (enlaces correctos en las cuatro pantallas, tarjeta sin teléfono sin botón). **No** se probó abrir WhatsApp de verdad.

### Cambiar de dueño de un vehículo (2026-09-18)

Botón **"Cambiar de dueño"** en la ficha del vehículo → `/vehiculos/:id/cambiar-cliente`: se elige un **cliente que ya existe** (buscador por nombre, sin ofrecer al dueño actual; pide confirmación "¿Pasar AB123CD a X?") o se crea un **cliente nuevo** (nombre + teléfono) y se le pasa. Solo cambia `vehiculos.cliente_id`: el **historial de servicios se queda con el vehículo** (probado: el servicio sigue asociado a la patente tras el cambio). Migración `20260918000007_validar_cambio_de_cliente.sql` (aplicada): trigger `BEFORE UPDATE OF cliente_id` que rechaza (42501) pasar un vehículo a un cliente de **otro taller** (las claves foráneas no pasan por RLS, sin esto se podía enlazar entre talleres); probado por SQL con RLS (mismo taller OK, otro taller rechazado). El buscador de clientes se extrajo a `ClientePicker` y también lo usa Recibir. Verificado en navegador con datos falsos; falta la prueba de Pedro con datos reales.

### Modo ágil (2026-09-18)

Los formularios de recibir/crear muestran solo lo indispensable; lo avanzado va plegado en **"Más datos (opcional)"** (`components/mas-datos.tsx`): **email** del cliente, **año y color** del vehículo y **fecha de ingreso** (por defecto hoy). Siempre visibles: nombre, teléfono, patente, marca, modelo, kilometraje, motivo y el **estado en que llegó** (opcional pero visible, porque Pedro pidió tenerlo siempre a mano). Los campos plegados siguen montados (se guardan igual) y la sección **se abre sola si hay un error** en alguno, o si al editar ya tiene datos (ej. un vehículo con año). Aplica a `ClienteNuevoForm`, `VehiculoFields`, `IngresoFields` y por lo tanto a Recibir, alta/edición de vehículo y editar ingreso. Se agregó `key` por id en los formularios de edición para que no se arrastre estado entre registros. Verificado en navegador con datos falsos; falta la opinión de Pedro sobre qué más plegar.

### Referencia competitiva (Vehix) y alcance (2026-09-18)

Pedro compartió una referencia de Vehix; quedó como **regla permanente en `CLAUDE.md`** (sección "Alcance"): lista de lo que se suma al MVP, ideas para después y lo que **no** se construye (ARCA, caja/cuenta corriente, stock, sueldos, multi-sucursal, firma digital). Si se pide algo de esa lista, frenar y confirmar.

Pendiente derivado, a criterio de Pedro y de menor a mayor esfuerzo:
- ~~Modo ágil por defecto~~ **hecho** (ver "Modo ágil" abajo).
- ~~Botón "enviar por WhatsApp"~~ **hecho** (ver "WhatsApp" abajo); falta que Pedro apruebe los textos.
- ~~Reasignar un vehículo a otro cliente~~ **hecho** (ver "Cambiar de dueño" abajo).
- Estado del servicio: ya cubierto (En taller / Listo / Entregado).

### Servicios múltiples, cliente visible y olvido de la entrega (2026-09-18, pedido de Pedro)

Pedro pidió tres cosas; **no respondió** las dos preguntas de diseño que le hice (estructura de "servicio" y dónde vive "Añadir servicio"), así que se aplicó lo recomendado — **confirmar o corregir**.

- **Varios servicios en un mismo ingreso**: un ingreso tiene una lista de **"Servicios realizados"** (renglones: qué se hizo, cantidad, precio opcional). Es la tabla `servicio_items` de antes con otro nombre en pantalla (ya no se dice "repuestos y mano de obra"; un repuesto se carga igual, como un renglón). Componente `AgregarServiciosForm` (React Hook Form `useFieldArray`): un bloque por servicio, botón "Añadir otro servicio", quitar bloque, y **un solo Guardar** ("Guardar 3 servicios") que inserta todo junto (`useGuardarItems`). Se usa en la ficha del ingreso (botón "Añadir servicios") y en la pantalla nueva.
- **"Añadir servicio" en la pestaña Servicios** (`/servicios/nuevo`): 1) buscar el auto por patente o nombre del cliente, 2) se usa su ingreso abierto (si tiene varios, elige cuál; si no tiene ninguno, manda a "Recibir vehículo"), 3) se cargan todos los servicios y se cae en la ficha del ingreso. No permite cargar servicios a un ingreso ya entregado.
- **Cliente siempre visible en Servicios**: en la lista y en las tarjetas del Inicio el **nombre del cliente va primero** (en negrita), y en la ficha del ingreso es el título con su teléfono (toca para llamar) y el vehículo debajo. Antes el cliente quedaba como texto gris secundario.
- **Que no dependa de que el mecánico se acuerde de marcar la entrega**:
  - Pestaña Servicios ahora abre en **"En el taller"** (En taller + Listo; antes los *Listo* quedaban ocultos) y sus filtros son En el taller / Entregados / Todos.
  - Un vehículo que lleva **5+ días "En taller" o 2+ días "Listo"** muestra "¿Ya se entregó?": en el Inicio con botones **"Ya se entregó"** (lo pasa a Entregado con fecha de hoy) y "Sigue acá" (oculta el aviso esa sesión); en la lista de Servicios como marca ámbar. **Umbrales propuestos por mí**, en `DIAS_PARA_PREGUNTAR` (`features/servicios/estados.ts`).
  - **Al recibir un auto que todavía figura abierto** (`/recibir`), antes de abrir el ingreso nuevo se pregunta "¿Ya se entregó?": "Sí, ya se entregó: recibirlo de nuevo" (cierra los ingresos anteriores y sigue) o "Todavía está acá: ver ese ingreso". Así un auto no queda "en el taller" para siempre.
  - Pendiente si se quiere: elegir otra fecha de entrega al cerrar (hoy se usa la fecha del día en que se marca), aviso también en el menú, o cerrar automáticamente tras N días.
- Verificado en navegador con sesión y datos falsos: tarjeta con aviso a los 7 días, lista con cliente primero y marca ámbar, ficha con cliente/teléfono, flujo Añadir servicio (búsqueda → ingreso abierto → 2 bloques → botón "Guardar 2 servicios", bloque vacío pide descripción, quitar bloque), y el control en Recibir. **Falta** la prueba de Pedro con datos reales.
- **Estado del repo**: el rediseño del flujo y estos cambios están **sin commitear** (Pedro rechazó el commit en el momento; esperar su OK).

### Fase 4 (2026-09-18)

- **Estado del servicio con lista fija** (elegido por Pedro): `en_taller` (por defecto) / `listo` / `entregado`. Migración `20260918000006_estado_servicio.sql` (aplicada): `estado` pasa a `not null default 'en_taller'` con `check`, los existentes se completaron, índice `(taller_id, estado)`. Al pasar a *Entregado* se guarda `fecha_entrega` (hoy); si se vuelve atrás se borra. Etiquetas en `features/servicios/estados.ts`.
- **Ficha del servicio** `/servicios/:id`: vehículo y cliente (con links), botones de estado, datos del ingreso, editar (`/servicios/:id/editar`, reutiliza `IngresoForm`) y **eliminar con confirmación** (borra sus ítems en cascada).
- **Ítems** (`servicio_items`): repuestos/mano de obra con descripción, cantidad y precio opcional; alta, edición y quitar en la misma pantalla (`item-form.tsx`, `items-section.tsx`). Acepta coma o punto decimal. **Total = suma de cantidad × precio** (los ítems sin precio no suman); se calcula al mostrarlo, **no se guarda** (la columna `servicios.total` queda sin usar). No hay símbolo de moneda porque se usan Argentina y Chile.
- **Servicios** en el menú (`/servicios`): lista global con filtro En taller / Listo / Entregado / Todos (arranca en *En taller*), con vehículo, cliente, fecha y motivo. El historial del vehículo ahora enlaza a cada servicio y muestra su estado. Inicio suma la tarjeta **"En taller"**.
- Helpers movidos a `src/lib/formato.ts` (`formatoNumero`, `formatearFecha`).
- Verificado: por SQL con la identidad de Pedro (ítems heredan `taller_id`, estado inválido rechazado por el `check`, entregar guarda fecha, borrar servicio arrastra ítems, joins de la lista); sintaxis de consultas anidadas contra la API (200); en navegador con sesión falsa y datos inyectados: lista, detalle, total 32.000, validaciones de ítem. **Falta** que Pedro pruebe el guardado real logueado.
- **Pendiente/ideas**: eliminar vehículos sueltos; recordatorios (Fase 5); si se quiere guardar el total o distinguir "repuesto" de "mano de obra" con un campo `tipo`.

### Fase 3 (2026-09-18)

- shadcn agregado: `input`, `label`, `card`, `badge`, `skeleton`. UI = Tailwind v4 + shadcn/ui (radix, preset nova, Geist, lucide).
- `src/features/clientes/` (hooks TanStack Query: listar, ficha, recientes, guardar; `cliente-form.tsx` con RHF+Zod), `src/features/vehiculos/` (hooks, `patente.ts`, `vehiculo-form.tsx`), `src/features/busqueda/api.ts` (búsqueda), `src/components/app-layout.tsx` (header con navegación + salir), `src/components/form-field.tsx`.
- Rutas nuevas (todas protegidas, dentro de `AppLayout`): `/` (buscador + clientes recientes), `/clientes`, `/clientes/nuevo`, `/clientes/:id`, `/clientes/:id/editar`, `/vehiculos/nuevo?cliente=<id>`, `/vehiculos/:id`, `/vehiculos/:id/editar`.
- Patente: se normaliza (mayúsculas, sin espacios/guiones) antes de guardar; se validan los formatos `ABC123` y `AB123CD`; duplicada por taller → mensaje "Ya existe un vehículo con esa patente." (código Postgres `23505`).
- Búsqueda: debounce 250 ms, mínimo 2 caracteres, `ilike` parcial sobre `vehiculos.patente` (normalizada) y `clientes.nombre` (con `%`/`_` escapados), 20 resultados por tipo, usando los índices `pg_trgm` de la Fase 1.
- Verificado por Claude: `npm run build` y `npm run lint` limpios; sintaxis de las consultas (embed `clientes(...)`, `ilike`) validada contra la API real (200); con la identidad de Pedro simulada por SQL: alta de cliente+vehículo OK, patente duplicada → `23505`, insertar en taller ajeno → bloqueado por RLS, búsqueda por patente y nombre encuentra el registro. Datos de prueba borrados (el taller de Pedro quedó con 0 clientes). Smoke en navegador sin sesión: sin errores de consola.
- `src/lib/database.types.ts` agregado a `.prettierignore` (Prettier lo reformateaba).
- **Dashboard con menú lateral** (pedido de Pedro con una imagen de referencia: solo estructura, sin colores ni gráficos): sidebar de shadcn (`sidebar`, `sheet`, `tooltip`, `separator`; en celular se pliega detrás de un botón) con nombre del taller, botón "Nuevo cliente", secciones Inicio y Clientes, y "Próximamente" (Servicios, Recordatorios, deshabilitadas) hasta que existan sus fases; pie con email y "Cerrar sesión". Barra superior con el botón del menú. Inicio muestra tarjetas de resumen (cantidad de clientes y de vehículos), el buscador y clientes recientes. Archivos: `components/app-layout.tsx`, `features/resumen/api.ts`, `features/auth/hooks/use-taller-actual.ts`.
- Verificado en navegador con una sesión falsa inyectada en el localStorage (solo para ver la estructura, sin datos reales): se ve bien en escritorio y en celular, el menú lateral abre. `src/hooks/use-mobile.ts` (generado por shadcn) reescrito con `useSyncExternalStore` porque rompía la regla de lint `set-state-in-effect`.
- **Insights en Inicio** (pedido de Pedro): dos gráficos de barras (**clientes nuevos** y **vehículos nuevos**) con filtro Semana / Mes / Año — semana = últimos 7 días por día, mes = últimos 30 días por día, año = últimos 12 meses por mes; muestra el total del período. Se agrupa por fecha local del navegador (Argentina), no por UTC. Archivos: `features/resumen/rangos.ts`, `features/resumen/api.ts` (`useSerieAltas`), `features/resumen/components/insights.tsx`. Se sumó el componente `chart` de shadcn, que instala **recharts** (dependencia nueva, dentro del ecosistema shadcn), y `tabs`.
- Verificado: lógica de rangos con un script (7/30/12 barras, un alta a las 23:30 locales cae en su día); en navegador con sesión falsa y datos de ejemplo inyectados en el cache de TanStack Query (no datos reales): los tres filtros cambian el gráfico y el total. Falta verlo con datos reales de Pedro.
- **Interpretación a confirmar**: "cantidad de clientes que se tuvo" se tomó como *clientes nuevos cargados por período* (fecha de alta). Cuando existan los servicios (Fase 4) se puede agregar "clientes atendidos" (con al menos un servicio en el período).
- **Límite conocido**: los gráficos traen las fechas y agrupan en el navegador; PostgREST devuelve máximo 1000 filas por consulta. Si un taller supera 1000 altas en un año, pasar el agrupado a una función SQL.
- **Teléfono solo números, formatos Argentina y Chile** (pedido de Pedro; "asa" se aceptaba): `features/clientes/telefono.ts`. Acepta separadores (espacios, guiones, paréntesis, puntos) y un `+` inicial, y guarda **solo dígitos**. Formatos: AR = 10 dígitos, o con 0 (11), o con 54 (12) / 549 celular (13); CL = 9 dígitos, o con 56 (11). Vacío es válido (opcional). Probado con 13 casos. **Supuesto a confirmar**: los largos salen de mi conocimiento general de los planes de numeración, no de una fuente oficial; no se acepta el prefijo `15` de Argentina.
- **Eliminar clientes** (pedido de Pedro): botón en la ficha con diálogo de confirmación (avisa cuántos vehículos se borran). Migración `20260918000003_cascade_delete.sql` (aplicada): `vehiculos.cliente_id` y `servicios.vehiculo_id` pasan a `on delete cascade`, así que borrar un cliente **elimina sus vehículos y su historial de servicios, sin deshacer**. Probado con RLS: el vehículo desaparece con el cliente y no quedan restos.
- **Ingreso del vehículo (adelanto de la Fase 4)** (pedido de Pedro; motivo de ingreso incluido, ubicación: "ambos lugares"): un *ingreso* es un registro de `servicios` con fecha, km, **motivo**, **estado en que llegó** y observaciones. Migración `20260918000004_ingreso_y_alta_completa.sql` (aplicada): columnas `servicios.motivo_ingreso` y `servicios.estado_al_ingreso`, y función SQL `crear_cliente_completo(p_cliente, p_vehiculo, p_ingreso)` que crea cliente + vehículo + ingreso **en una sola transacción** (si algo falla, no queda nada a medias; probado con patente repetida: 23505 y sin cliente huérfano). Tipos regenerados.
  - **Nuevo cliente** (`/clientes/nuevo`): **sin casillas** (cambio pedido por Pedro): siempre se cargan cliente, vehículo e ingreso. Obligatorios: nombre, patente, marca, modelo, fecha, km y motivo de ingreso; **lo único opcional del ingreso es el estado en que llegó** (además de año/color del vehículo y email/teléfono del cliente). Se quitó el campo "observaciones" del formulario (la columna sigue en la base).
  - **Editar vehículo**: muestra los mismos campos de ingreso para cargarlo si se olvidó; si se deja vacío no se agrega nada, y si se completa algo se exigen km y motivo (`ingresoOpcionalSchema`). Se hace en dos pasos (actualizar vehículo, luego crear ingreso): si el segundo falla, el vehículo ya quedó actualizado y se puede reintentar.
  - **Alta de vehículo** (`/vehiculos/nuevo?cliente=`): también lleva el ingreso obligatorio, atómico con la función SQL `crear_vehiculo_con_ingreso` (migración `20260918000005`, aplicada y probada).
  - Componentes compartidos: `VehiculoFields`, `IngresoFields` (formularios con claves `vehiculo.*` / `ingreso.*`).
  - **Ficha del vehículo**: botón "Nuevo ingreso" (`/vehiculos/:id/ingreso`) y el historial lista los ingresos (fecha, km, motivo, cómo llegó, observaciones).
  - Verificado: RPC por SQL con RLS (alta completa OK y rollback); en navegador con sesión falsa: Nuevo cliente sin casillas y validando todo salvo el estado; Editar vehículo acepta ingreso vacío y exige motivo si solo se pone km. **Falta** que Pedro pruebe el guardado real logueado.
  - Esquema del vehículo extraído a `features/vehiculos/schema.ts` (lo comparten los dos formularios).
- **Fase 4 sigue pendiente**: ítems del servicio (repuestos/mano de obra, cantidad, precio) y el **estado** del servicio (¿estados fijos como En taller / Listo / Entregado, o libre? sin responder). Editar/eliminar ingresos tampoco existe todavía.

## Hecho y verificado (Fases 0–2)

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
- **Bug encontrado y resuelto: `VITE_SUPABASE_ANON_KEY` tenía la clave "secret" en vez de la "publishable"**. Síntoma: login con contraseña, magic link y reset de contraseña fallaban todos con mensajes genéricos ("email o contraseña incorrectos", "no pudimos enviar el mail"), porque nuestro código atrapa cualquier error y muestra un mensaje amigable — eso tapó la causa real. Diagnosticado haciendo un `fetch` directo desde la consola del navegador contra la API de Supabase, que devolvió explícitamente `"Forbidden use of secret API key in browser"`. Pedro reemplazó la clave en `.env` por la publishable/anon correcta desde Project Settings → API Keys, y a partir de ahí todo funcionó. Se agregó `console.error` con el error real antes de cada mensaje genérico en `login-form.tsx`, `forgot-password-form.tsx` y `reset-password-form.tsx`, para que la próxima vez el error real aparezca en la consola del navegador sin exponerlo al usuario final.
- **Usuario real de Pedro creado y probado de punta a punta**: creó su usuario en el Dashboard de Supabase (email `pflores0213@gmail.com`, autoconfirmado); se le creó el taller **"Mecánicos Boock"** y la fila en `public.usuarios` vinculándolo como `owner` (por SQL directo, ya que no hay alta self-service). Con la clave correcta, Pedro pudo: pedir el reset de contraseña desde `/olvide-mi-contrasena`, recibir el mail (con el mailer por defecto de Supabase, sin Brevo todavía), llegar a `/restablecer-contrasena`, cambiar la contraseña, y loguearse con la nueva. Login con email+contraseña confirmado funcionando end-to-end.
- **Prueba de aislamiento entre talleres con usuario real** (la que quedó pendiente desde la Fase 1): simulando el JWT de Pedro por SQL (`set local role authenticated; set local request.jwt.claim.sub = '<su id>'`), consultó `clientes` y `talleres` — vio **0 clientes** (correcto: su taller no tiene ninguno) y **1 solo taller visible** ("Mecánicos Boock", no el "Taller Demo" del seed que tiene 2 clientes). Aislamiento confirmado con un usuario real, no solo con los tests negativos de `anon`/`authenticated-sin-perfil` de la Fase 1.

## Qué falta (Fase 3)

- [ ] **Pedro prueba logueado** (`npm run dev`, http://localhost:5199): cargar un cliente, agregarle un vehículo, buscarlo por parte de la patente y por parte del nombre, editar ambos, probar patente inválida y duplicada. Recién ahí se marca la fase como hecha.
- [ ] Probar en el celular (uso principal: responder por WhatsApp).
- Borrado de vehículos: todavía no existe (solo de clientes). Pedir si se necesita.
- **Pendiente de definir con Pedro**: formulario opcional de "recepción del vehículo" al crear un cliente (estado en que llegó, kilometraje, otros datos). Ver preguntas en la conversación; se apoya en la tabla `servicios` de la Fase 4.

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
- [x] Usuario real de Pedro creado en Supabase y vinculado a un taller (`public.usuarios` + `public.talleres`).
- [x] Configurado en el Dashboard: Site URL `http://localhost:5199`, Redirect URLs `http://localhost:5199/**`.
- [x] Login con email+contraseña probado de punta a punta con un usuario real.
- [x] Reset de contraseña probado de punta a punta (pedir el link, entrar, cambiar la contraseña, loguearse con la nueva).
- [x] Prueba de aislamiento entre talleres con un usuario real (heredada de la Fase 1).
- [ ] **Magic link sin probar de punta a punta todavía** (solo se probó que el pedido no tira error; falta que alguien reciba el mail y entre por ese link). Bajo riesgo porque usa el mismo mecanismo que el reset de contraseña, que ya se probó completo.
- [ ] Cuenta de Brevo + clave SMTP dedicada, y cargarla en Supabase (Authentication → Auth Settings → SMTP Settings) para que los mails de auth salgan de un remitente propio en vez del mailer de test de Supabase. Pedro la va a mandar cuando la tenga.

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
- **Mensajes de error genéricos al usuario + `console.error` con el error real**: por seguridad no queremos mostrarle a un usuario cualquiera el motivo exacto de un fallo de login (evita filtrar si un email existe o no, por ejemplo), pero el error real se loguea en la consola del navegador para poder diagnosticar — se agregó recién después de perder tiempo con el bug de la clave `VITE_SUPABASE_ANON_KEY` (ver más abajo) que quedó tapado por un mensaje genérico.

### Fase 3
- **`taller_id` se envía desde el front** (tomado de `useUsuarioActual`) en los inserts: los tipos generados lo exigen en `Insert` y así evitamos casts. Los triggers y `WITH CHECK` de RLS siguen siendo la garantía real (probado: un `taller_id` ajeno es rechazado).
- **Vehículo siempre parte de un cliente**: `/vehiculos/nuevo` requiere `?cliente=<id>`; sin él muestra un aviso con link a la lista de clientes (no hay selector de cliente en el form, para mantener poco código).
- **Historial en la ficha del vehículo**: por ahora un texto "todavía no hay servicios"; se completa en la Fase 4.

## Dudas abiertas para Pedro (Fase 3)

- ~~Patentes de motos~~: Pedro dijo que **por ahora no se atienden motos** (2026-09-18); solo `ABC123` y `AB123CD`.
- Dashboard: el menú y las tarjetas actuales son una propuesta mía a partir de la imagen de referencia. Pedro puede pedir otras secciones/tarjetas. Falta decidir si se agrega un buscador también en la barra superior (hoy está solo en Inicio).
- ¿Querés un botón "abrir WhatsApp" en la ficha del cliente? Requiere definir cómo normalizar los teléfonos argentinos (código de país / el `9` de celulares); no lo armé para no inventar.

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
- **Cuenta de Brevo** (SMTP): crear cuenta gratis en brevo.com, ir a Settings → SMTP & API → SMTP, generar una **clave SMTP dedicada** (no la API key) y pasarla para cargarla en Supabase (Authentication → Auth Settings → SMTP Settings). El login ya funciona sin esto (Supabase manda mails de prueba con su servicio propio, límites bajos), pero antes de usar la app con clientes reales hace falta.

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
- react-router 7.x (agregado 2026-09-18, Fase 2; ver package-lock)
- recharts 3.8 (vía shadcn `chart`, Fase 3)
