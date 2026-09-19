import { z } from 'zod'

export const perfilSchema = z.object({
  nombreMecanico: z.string().trim().max(60, 'Máximo 60 caracteres'),
  nombreTaller: z
    .string()
    .trim()
    .min(1, 'Ingresá el nombre del taller')
    .max(80, 'Máximo 80 caracteres'),
})

export type PerfilValues = z.infer<typeof perfilSchema>
