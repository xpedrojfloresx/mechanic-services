import { sumarDias } from '@/features/recordatorios/fechas'
import { hoyLocal } from '@/features/servicios/schema'
import { formatearFecha } from '@/lib/formato'

// Días de diferencia entre hoy y una fecha AAAA-MM-DD (negativo si ya pasó).
function diasHasta(fecha: string) {
  const [a, m, d] = fecha.split('-').map(Number)
  const [ha, hm, hd] = hoyLocal().split('-').map(Number)
  return Math.round(
    (Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86_400_000,
  )
}

// "Hoy", "Mañana", "Ayer" o la fecha.
export function etiquetaPrometido(fecha: string) {
  const dias = diasHasta(fecha)
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias === -1) return 'ayer'
  return formatearFecha(fecha)
}

// Vencida: se prometió para un día anterior a hoy y el vehículo sigue en el taller.
export function prometidoVencido(fecha: string | null, estado: string) {
  return !!fecha && estado !== 'entregado' && diasHasta(fecha) < 0
}

export const atajosPrometido = [
  { texto: 'Hoy', fecha: () => hoyLocal() },
  { texto: 'Mañana', fecha: () => sumarDias(hoyLocal(), 1) },
  { texto: 'En 2 días', fecha: () => sumarDias(hoyLocal(), 2) },
]
