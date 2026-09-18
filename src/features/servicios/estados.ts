import { hoyLocal } from '@/features/servicios/schema'

export const ESTADOS = [
  { value: 'en_taller', label: 'En taller' },
  { value: 'listo', label: 'Listo' },
  { value: 'entregado', label: 'Entregado' },
] as const

export type Estado = (typeof ESTADOS)[number]['value']

export function etiquetaEstado(estado: string) {
  return ESTADOS.find((e) => e.value === estado)?.label ?? estado
}

// Siguiente paso del trabajo y su texto de botón (null si ya se entregó).
export function siguienteEstado(estado: string) {
  if (estado === 'en_taller') return { valor: 'listo', boton: 'Marcar listo' }
  if (estado === 'listo') return { valor: 'entregado', boton: 'Entregar' }
  return null
}

// Al entregar se guarda la fecha de entrega; si vuelve atrás, se limpia.
export function valoresCambioEstado(
  estado: string,
  fechaEntregaActual: string | null,
) {
  return {
    estado,
    fecha_entrega:
      estado === 'entregado' ? (fechaEntregaActual ?? hoyLocal()) : null,
  }
}

// Días después de los cuales se le pregunta al mecánico si el vehículo ya se
// entregó (es fácil olvidarse de marcarlo). Valores propuestos, ajustables.
export const DIAS_PARA_PREGUNTAR: Record<string, number> = {
  en_taller: 5,
  listo: 2,
}

export function estaDemorado(estado: string, dias: number) {
  const limite = DIAS_PARA_PREGUNTAR[estado]
  return limite !== undefined && dias >= limite
}
