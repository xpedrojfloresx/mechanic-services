import { z } from 'zod'

export const recordatorioSchema = z.object({
  nota: z.string().trim().min(1, 'Ingresá qué hay que hacer'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí una fecha'),
  km: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 3_000_000),
      'Kilometraje inválido (solo números)',
    ),
})

export type RecordatorioValues = z.infer<typeof recordatorioSchema>
