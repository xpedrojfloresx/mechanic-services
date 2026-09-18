export const formatoNumero = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

// La fecha viene como AAAA-MM-DD: se formatea a mano para evitar corrimientos
// de zona horaria.
export function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}
