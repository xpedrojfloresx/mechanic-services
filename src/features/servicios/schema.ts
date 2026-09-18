import { z } from 'zod'

export function hoyLocal() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const ingresoSchema = z.object({
  fecha_ingreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  km: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Ingresá el kilometraje (solo números)')
    .refine((v) => Number(v) <= 3_000_000, 'Kilometraje inválido'),
  motivo: z.string().trim(),
  estado: z.string().trim(),
  observaciones: z.string().trim(),
})

export type IngresoValues = z.infer<typeof ingresoSchema>

export const ingresoVacio = (): IngresoValues => ({
  fecha_ingreso: hoyLocal(),
  km: '',
  motivo: '',
  estado: '',
  observaciones: '',
})

// Valores del formulario -> lo que se manda a la base.
export function ingresoAInput(v: IngresoValues) {
  return {
    fecha_ingreso: v.fecha_ingreso,
    km_al_ingreso: Number(v.km),
    motivo_ingreso: v.motivo || null,
    estado_al_ingreso: v.estado || null,
    observaciones: v.observaciones || null,
  }
}
