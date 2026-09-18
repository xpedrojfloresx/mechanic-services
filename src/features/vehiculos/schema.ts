import { z } from 'zod'
import { esPatenteValida } from '@/features/vehiculos/patente'

const anioMaximo = new Date().getFullYear() + 1

export const vehiculoSchema = z.object({
  patente: z
    .string()
    .trim()
    .refine(esPatenteValida, 'Patente inválida. Formatos: ABC123 o AB123CD'),
  marca: z.string().trim().min(1, 'Ingresá la marca'),
  modelo: z.string().trim().min(1, 'Ingresá el modelo'),
  anio: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (/^\d{4}$/.test(v) && +v >= 1900 && +v <= anioMaximo),
      'Año inválido',
    ),
  color: z.string().trim(),
})

export type VehiculoValues = z.infer<typeof vehiculoSchema>
