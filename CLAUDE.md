# Reglas de trabajo — Gestión de Talleres

> **Al empezar una sesión**: leer este archivo y luego `context.md` (sección "PASOS A SEGUIR EN LA NUEVA SESIÓN" y §1). `context.md` es la fuente de verdad del estado, las decisiones, los pendientes y las trampas del entorno; este archivo son las reglas permanentes. Estado hoy: Fases 0 a 5 hechas, siguiente Fase 6 (PWA).

**REGLA DE ORO — No inventes.** Si no se sabe algo con certeza —una API, la
sintaxis actual de una librería, una versión, una decisión de negocio, un dato
que falta, cómo se configura un servicio— **frenar y preguntarle a Pedro**. No
asumir, no inventar nombres de campos, no suponer comportamientos de
librerías. Preferir preguntar de más que avanzar sobre una suposición. Si una
duda es de código, verificar primero en la documentación oficial; si ni así
queda claro, preguntar.

**Bitácora `context.md`.** Mantenerla actualizada:
- Al completar cada subtarea o fase, antes de cada commit, y aproximadamente
  cada 30 minutos de trabajo continuo (o antes de compactar el contexto si se
  está llenando).
- Debe contener siempre: (a) estado actual y en qué fase vamos, (b) qué está
  hecho y verificado, (c) qué falta, (d) decisiones tomadas y su motivo,
  (e) dudas abiertas / preguntas pendientes para Pedro, (f) comandos clave del
  proyecto, (g) cualquier paso manual que Pedro tenga que hacer en un servicio
  externo.
- Una feature se marca "hecha" solo cuando se verificó de punta a punta que
  funciona, no cuando el código está escrito.

**Trabajar por fases, en orden.** No saltear fases. Al terminar cada una,
mostrar un resumen de lo hecho y esperar el OK de Pedro antes de seguir si hay
cualquier ambigüedad.

**Commits chicos y descriptivos**, uno por unidad de trabajo coherente.

**Nunca tocar secretos.** No poner API keys, contraseñas ni tokens en el
código ni inventarlos. Cuando haga falta una credencial, decirle a Pedro
exactamente qué crear y dónde, y usar variables de entorno (`.env`, nunca
commiteado; dejar un `.env.example` con las claves vacías).

**Idioma:** UI en español (rioplatense). Nombres de variables/funciones en
inglés, comentarios explicativos en español.

**Verificar versiones.** Usar las últimas versiones estables de cada
herramienta y confirmar en la documentación oficial al momento de instalar.
Si una instrucción depende de una versión puntual, anotarla en `context.md`.

## Stack (decidido — no cambiar sin consultar a Pedro)

| Capa | Herramienta |
|---|---|
| Front | Vite + React + TypeScript |
| Estilos | Tailwind CSS v4 |
| Componentes UI | shadcn/ui |
| Ruteo | React Router (elegido por Pedro, rutas con componentes) |
| Gráficos | recharts, vía el componente `chart` de shadcn |
| Datos / cache | TanStack Query |
| Formularios + validación | React Hook Form + Zod |
| Backend / DB / Auth | Supabase (Postgres + Auth + RLS), cliente JS directo desde el front |
| Lógica de servidor puntual | Supabase Edge Functions o Postgres functions (solo si hace falta) |
| Storage de fotos | Cloudflare R2 |
| PWA | vite-plugin-pwa |
| Hosting | Cloudflare Workers con Static Assets (wrangler) |
| Repositorio | GitHub |
| Tipos | `supabase gen types typescript` (tipos DB → front) |

No hay backend propio: el front habla directo a Supabase y la seguridad la da
RLS.

## Restricciones del equipo

- Un solo desarrollador, a medio tiempo. Prioridad: poco código y poco
  mantenimiento por encima de "lo más potente".
- MVP de bajo costo (free tiers).
- Simplicidad > sofisticación.
- Arquitectura single-tenant-ready: todas las tablas llevan `taller_id` y RLS
  desde el día uno, aunque por ahora haya un solo taller. No construir todavía
  registro self-service de talleres, panel de admin, facturación de
  suscripción ni portal de cliente.

## Bandera legal

Se guardan datos personales de terceros (nombre, teléfono, patente): aplica la
Ley 25.326 de Protección de Datos Personales de Argentina. Pedir datos
mínimos, nada de campos de salud ni datos sensibles. Cualquier requisito legal
que no esté claro se marca en `context.md` como duda para Pedro (eventualmente
con un abogado), no se resuelve por cuenta propia.

## Alcance: referencia competitiva (Vehix) y qué NO construir

Vehix (vehix.com.ar) es un ERP maduro para talleres. **No es el modelo a
copiar**: la mayoría de sus módulos son administración/contabilidad, fuera del
núcleo de esta app. El diferencial de este producto es ser **más simple y
barato**, no tener más features.

**Sumado al MVP (baratas y de alto impacto):**
- Botón "enviar por WhatsApp": abre `wa.me/<número>?text=<mensaje armado>` con
  los datos del vehículo/servicio. Versión mínima, SIN WhatsApp Business API.
- Estado del servicio (hecho: En taller / Listo / Entregado).
- Reasignar un vehículo a otro cliente sin perder su historial.
- **Modo ágil por defecto**: los formularios muestran solo lo indispensable; los
  campos avanzados van ocultos/colapsados. Cargar rápido en el mostrador es
  objetivo de diseño, no un extra.

**Ideas para DESPUÉS del MVP (no construir ahora, no adelantarse):** fotos del
vehículo/estado; dictado por voz (Web Speech API, en español); QR por vehículo
hacia su ficha (uso interno; el portal público para el cliente va mucho después,
con consentimiento y datos mínimos por la Ley 25.326); importar clientes/vehículos
desde CSV; exportar a CSV; roles admin/mecánico; presupuesto/diagnóstico previos a
la orden; turnero/agenda.

**NO construir (fuera de alcance, aunque parezca útil):** facturación electrónica
ARCA; caja, cheques, cuentas bancarias, cuenta corriente/deuda por cliente;
stock/inventario con movimientos y alertas, compras a proveedores; sueldos,
comisiones, liquidaciones; multi-sucursal, actas de custodia con firma digital,
llaveros físicos.

Si Pedro pide alguna de estas, **frenar y confirmar el alcance antes de construir**.

## Convenciones de código

- **Estructura**: `src/features/<dominio>/` (`api.ts` con un hook de TanStack Query por operación, `schema.ts` con Zod, `components/`), `src/routes/` una página por ruta, `src/components/` lo compartido, `src/lib/` utilidades. Al mutar, invalidar las `queryKey` relacionadas.
- **Formularios**: React Hook Form + Zod; mensajes de error en español, en línea (nunca `alert`); mostrar un mensaje genérico al usuario y `console.error` con el error real. Códigos de Postgres útiles: `23505` (unicidad, ej. patente repetida), `42501` (RLS/permiso).
- **Datos sensibles y RLS**: nunca confiar en el front; toda tabla lleva `taller_id` y RLS. Las claves foráneas **no** pasan por RLS: si un cambio puede enlazar filas entre talleres, agregar un trigger de validación (ver migración 7). Cambios de esquema = **migración nueva** en `supabase/migrations/` + `npx supabase db push` + regenerar `src/lib/database.types.ts` (archivo generado, en `.prettierignore`; commitearlo enseguida).
- **Operaciones de varios pasos** (crear cliente + vehículo + ingreso): hacerlas en **una función SQL** (una transacción) en vez de varias llamadas desde el front.
- **Trampa**: `src/lib/database.types.ts` a veces queda vacío (0 bytes) en la carpeta de trabajo. Antes de commitear verificar `wc -l src/lib/database.types.ts` (~496 líneas) y restaurarlo con `git checkout -- src/lib/database.types.ts` si está vacío.
- **Nunca** usar la clave *secret*/`service_role` en el front ni en `.env` con prefijo `VITE_`: solo la **publishable**.
- Lint: no usar `useState` + `useEffect` para derivar estado (regla `react-hooks/set-state-in-effect`); usar `key`, `useSyncExternalStore` o calcular al renderizar. Antes de commitear: `npm run build` y `npm run lint`.

## Diseño de interfaz

- Pensar en **un mecánico apurado en el mostrador, con el celular**: pocos pasos, botones grandes, lo indispensable a la vista y lo avanzado plegado en "Más datos". Si algo no se encuentra o se complica, la app se abandona.
- **Sin animaciones** ni librerías de animación (decisión de Pedro). Sin librerías nuevas sin consultar. Íconos `lucide`.
- Un solo acento de color (variable `--primary` en `src/index.css`); patente siempre con el componente `Patente`; estados vacíos con `EmptyState`; cargas con `Skeleton`; los errores de carga solo se muestran si no hay datos que mostrar; no usar guiones largos como "sin dato".
- Skills de diseño: `gpt-taste` está **descartada** (es de landings con GSAP) y `brandkit` (logos) no se usa. Las otras dos (`redesign-existing-projects`, `design-taste-frontend`) se aplican solo en lo que corresponde a una app de producto.

## Git y pruebas

- Commits chicos con `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`; se puede commitear y pushear a `main` de forma rutinaria, **salvo que Pedro rechace un commit: entonces esperar su OK**. No commitear `.agents/` ni `skills-lock.json` (usar `git add -A -- . ':!.agents' ':!skills-lock.json'`) y revisar `git status` por archivos raros.
- **Claude no usa la contraseña de Pedro ni se loguea con credenciales reales.** Verificar la base con RLS simulada por SQL (`supabase db query --linked "set local role authenticated; set local request.jwt.claim.sub = '<id>'; ..."`) y la interfaz en el navegador con una sesión falsa y datos inyectados en TanStack Query (receta en `context.md` §12). Borrar siempre los datos de prueba.
- Una feature se da por hecha recién cuando Pedro la probó con datos reales; hasta entonces decir "hecha por Claude, falta la prueba de Pedro".
- En esta máquina Windows el shell pierde los backslashes en heredocs y un `>` sin comillas crea archivos: preferir las herramientas `Write`/`Edit` para escribir código.

