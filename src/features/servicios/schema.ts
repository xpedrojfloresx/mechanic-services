import { z } from 'zod'

export function hoyLocal() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Forma de los campos, sin reglas (sirve para formularios donde el ingreso
// es opcional y solo se valida si se completó algo).
export const ingresoCampos = z.object({
  fecha_ingreso: z.string(),
  km: z.string(),
  motivo: z.string(),
  estado: z.string(),
})

// Ingreso completo: fecha, km y motivo son obligatorios; el estado en que
// llegó el vehículo es lo único opcional.
export const ingresoSchema = z.object({
  fecha_ingreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  km: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Ingresá el kilometraje (solo números)')
    .refine((v) => Number(v) <= 3_000_000, 'Kilometraje inválido'),
  motivo: z.string().trim().min(1, 'Ingresá el motivo de ingreso'),
  estado: z.string().trim(),
})

export type IngresoValues = z.infer<typeof ingresoSchema>

// Ingreso opcional: si no se completó ni km, ni motivo, ni estado, se ignora;
// si se completó algo, tiene que cumplir las reglas del ingreso completo.
export const ingresoTieneDatos = (v: IngresoValues) =>
  [v.km, v.motivo, v.estado].some((c) => c.trim() !== '')

export const ingresoOpcionalSchema = ingresoCampos.superRefine((v, ctx) => {
  if (!ingresoTieneDatos(v)) return
  const resultado = ingresoSchema.safeParse(v)
  if (resultado.success) return
  for (const issue of resultado.error.issues) {
    ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path })
  }
})

export const ingresoVacio = (): IngresoValues => ({
  fecha_ingreso: hoyLocal(),
  km: '',
  motivo: '',
  estado: '',
})

// Valores del formulario -> lo que se manda a la base.
export function ingresoAInput(v: IngresoValues) {
  return {
    fecha_ingreso: v.fecha_ingreso,
    km_al_ingreso: Number(v.km),
    motivo_ingreso: v.motivo,
    estado_al_ingreso: v.estado || null,
  }
}

// Renglón de servicio realizado (o repuesto/mano de obra). Acepta coma o
// punto como separador decimal.
export const aNumero = (v: string) => Number(v.trim().replace(',', '.'))

export const itemSchema = z.object({
  descripcion: z.string().trim().min(1, 'Ingresá qué se hizo'),
  cantidad: z
    .string()
    .refine((v) => v.trim() !== '' && aNumero(v) > 0, 'Cantidad inválida'),
  precio: z
    .string()
    .refine((v) => v.trim() === '' || aNumero(v) >= 0, 'Precio inválido'),
})

export type ItemValues = z.infer<typeof itemSchema>

export const itemVacio = (): ItemValues => ({
  descripcion: '',
  cantidad: '1',
  precio: '',
})

export function itemAInput(v: ItemValues) {
  return {
    descripcion: v.descripcion.trim(),
    cantidad: aNumero(v.cantidad),
    precio: v.precio.trim() === '' ? null : aNumero(v.precio),
  }
}
