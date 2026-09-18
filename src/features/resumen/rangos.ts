export type Rango = 'semana' | 'mes' | 'anio'

export type Barra = { clave: string; etiqueta: string; total: number }

const diaCorto = new Intl.DateTimeFormat('es-AR', { weekday: 'short' })
const diaMes = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
})
const mesCorto = new Intl.DateTimeFormat('es-AR', { month: 'short' })

const pad = (n: number) => String(n).padStart(2, '0')
// Se agrupa por fecha local (la del navegador), no por UTC.
const claveDia = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const claveMes = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

// Semana = últimos 7 días, mes = últimos 30 días (ambos por día),
// año = últimos 12 meses (por mes).
export function armarBarras(rango: Rango, ahora = new Date()) {
  const barras: Barra[] = []

  if (rango === 'anio') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      barras.push({
        clave: claveMes(d),
        etiqueta: mesCorto.format(d),
        total: 0,
      })
    }
  } else {
    const dias = rango === 'semana' ? 7 : 30
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate() - i,
      )
      barras.push({
        clave: claveDia(d),
        etiqueta: rango === 'semana' ? diaCorto.format(d) : diaMes.format(d),
        total: 0,
      })
    }
  }

  // Inicio del rango en hora local, para pedir solo lo necesario.
  const primera = barras[0].clave.split('-').map(Number)
  const desde = new Date(primera[0], primera[1] - 1, primera[2] ?? 1)

  return { barras, desde, claveDe: rango === 'anio' ? claveMes : claveDia }
}
