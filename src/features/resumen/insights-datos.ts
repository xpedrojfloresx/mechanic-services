import { sumarMeses } from '@/features/recordatorios/fechas'
import { hoyLocal } from '@/features/servicios/schema'

// Forma mínima de un servicio para las cuentas de Insights (la consulta de
// api.ts la cumple).
export type ServicioInsights = {
  vehiculo_id: string
  fecha_ingreso: string
  fecha_entrega: string | null
  motivo_ingreso: string | null
  vehiculos: { marca: string } | null
  servicio_items: {
    descripcion: string
    cantidad: number
    precio: number | null
  }[]
}

export type Periodo = 'mes' | 'trimestre' | 'anio'

export const etiquetaPeriodo: Record<Periodo, string> = {
  mes: 'Este mes',
  trimestre: 'Últimos 3 meses',
  anio: 'Últimos 12 meses',
}

export const formatoPesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const primerDiaDelMes = (hoy: string) => hoy.slice(0, 7) + '-01'

// Primer día del período (mes calendario en curso, o 3 / 12 meses contando el actual).
export function desdePeriodo(periodo: Periodo, hoy = hoyLocal()) {
  const inicio = primerDiaDelMes(hoy)
  if (periodo === 'mes') return inicio
  return sumarMeses(inicio, periodo === 'trimestre' ? -2 : -11)
}

export function filtrarDesde(servicios: ServicioInsights[], desde: string) {
  return servicios.filter((s) => s.fecha_ingreso >= desde)
}

// Agrupa textos escritos distinto ("Cambio de aceite", "cambio de aceite ") y
// se queda con la escritura más frecuente para mostrarla.
function contarTextos(textos: string[]) {
  const grupos = new Map<
    string,
    { total: number; variantes: Map<string, number> }
  >()
  for (const texto of textos) {
    const limpio = texto.trim().replace(/\s+/g, ' ')
    if (!limpio) continue
    const clave = limpio.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const g = grupos.get(clave) ?? { total: 0, variantes: new Map() }
    g.total++
    g.variantes.set(limpio, (g.variantes.get(limpio) ?? 0) + 1)
    grupos.set(clave, g)
  }
  return [...grupos.values()]
    .map((g) => ({
      nombre: [...g.variantes.entries()].sort((a, b) => b[1] - a[1])[0][0],
      total: g.total,
    }))
    .sort((a, b) => b.total - a.total)
}

// Trabajos más pedidos: los servicios realizados de cada ingreso y, si el
// ingreso no tiene ninguno cargado, su motivo.
export function trabajosMasComunes(servicios: ServicioInsights[], limite = 8) {
  const textos: string[] = []
  for (const s of servicios) {
    const items = s.servicio_items.map((i) => i.descripcion)
    if (items.length > 0) textos.push(...items)
    else if (s.motivo_ingreso) textos.push(s.motivo_ingreso)
  }
  return contarTextos(textos).slice(0, limite)
}

export function marcasMasComunes(servicios: ServicioInsights[], limite = 5) {
  const ordenadas = contarTextos(
    servicios.flatMap((s) => (s.vehiculos?.marca ? [s.vehiculos.marca] : [])),
  )
  const principales = ordenadas.slice(0, limite)
  const resto = ordenadas.slice(limite).reduce((a, m) => a + m.total, 0)
  return resto > 0
    ? [...principales, { nombre: 'Otras', total: resto }]
    : principales
}

// Lo facturado = suma de cantidad x precio de los servicios realizados que
// tienen precio (los que no, no suman). Es lo cargado en la app, no
// contabilidad.
export function totalFacturado(servicios: ServicioInsights[]) {
  let total = 0
  for (const s of servicios) {
    for (const i of s.servicio_items) total += i.cantidad * (i.precio ?? 0)
  }
  return total
}

const mesCorto = new Intl.DateTimeFormat('es-AR', { month: 'short' })

// Últimos 12 meses (el actual incluido), por fecha de ingreso.
export function facturacionPorMes(
  servicios: ServicioInsights[],
  hoy = hoyLocal(),
) {
  const meses = Array.from({ length: 12 }, (_, i) => {
    const fecha = sumarMeses(primerDiaDelMes(hoy), i - 11)
    const [anio, mes] = fecha.split('-').map(Number)
    return {
      clave: fecha.slice(0, 7),
      etiqueta: mesCorto.format(new Date(anio, mes - 1, 1)).replace('.', ''),
      total: 0,
    }
  })
  const porClave = new Map(meses.map((m) => [m.clave, m]))
  for (const s of servicios) {
    const mes = porClave.get(s.fecha_ingreso.slice(0, 7))
    if (mes) mes.total += totalFacturado([s])
  }
  return meses
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

// Ingresos por día de la semana, de lunes a domingo.
export function ingresosPorDiaSemana(servicios: ServicioInsights[]) {
  const totales = new Array<number>(7).fill(0)
  for (const s of servicios) {
    const [a, m, d] = s.fecha_ingreso.split('-').map(Number)
    totales[new Date(a, m - 1, d).getDay()]++
  }
  return [1, 2, 3, 4, 5, 6, 0].map((i) => ({ dia: DIAS[i], total: totales[i] }))
}

// Días promedio entre el ingreso y la entrega (solo servicios entregados).
export function diasPromedioEnTaller(servicios: ServicioInsights[]) {
  const dias = servicios.flatMap((s) => {
    if (!s.fecha_entrega) return []
    const [a, m, d] = s.fecha_ingreso.split('-').map(Number)
    const [ea, em, ed] = s.fecha_entrega.split('-').map(Number)
    return [(Date.UTC(ea, em - 1, ed) - Date.UTC(a, m - 1, d)) / 86_400_000]
  })
  if (dias.length === 0) return null
  return dias.reduce((a, b) => a + b, 0) / dias.length
}

export function vehiculosDistintos(servicios: ServicioInsights[]) {
  return new Set(servicios.map((s) => s.vehiculo_id)).size
}
