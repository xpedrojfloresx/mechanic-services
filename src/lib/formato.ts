export const formatoNumero = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

// La fecha viene como AAAA-MM-DD: se formatea a mano para evitar corrimientos
// de zona horaria.
export function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

// Días transcurridos desde una fecha AAAA-MM-DD (hora local); 0 si es hoy.
export function diasDesde(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const hoy = new Date()
  const desde = new Date(anio, mes - 1, dia)
  const dias = Math.round(
    (new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() -
      desde.getTime()) /
      86_400_000,
  )
  return Math.max(dias, 0)
}

// "Hoy", "Ayer" o "Hace N días".
export function haceCuanto(fecha: string) {
  const dias = diasDesde(fecha)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  return `Hace ${dias} días`
}
