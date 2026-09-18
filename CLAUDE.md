# Reglas de trabajo — Gestión de Talleres

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
