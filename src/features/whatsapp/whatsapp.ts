import { desgloseItems } from '@/features/servicios/items'
import { formatoNumero } from '@/lib/formato'

// Convierte el teléfono guardado (solo dígitos, formatos de Argentina o
// Chile, ver clientes/telefono.ts) al número que espera wa.me: código de país
// + número, sin "+" ni ceros. Devuelve null si no se puede armar.
//
// Argentina: 10 dígitos, 0+10, 54+10 o 549+10  -> 549 + 10 dígitos (celular)
// Chile:     9 dígitos o 56+9                   -> 56 + 9 dígitos
// Supuesto: un número argentino de 10 dígitos se trata como celular (549...);
// si era un fijo, WhatsApp simplemente no lo encuentra.
export function numeroWhatsApp(telefono: string | null | undefined) {
  const d = (telefono ?? '').replace(/\D/g, '')
  if (/^\d{10}$/.test(d)) return `549${d}`
  if (/^0\d{10}$/.test(d)) return `549${d.slice(1)}`
  if (/^54\d{10}$/.test(d)) return `549${d.slice(2)}`
  if (/^549\d{10}$/.test(d)) return d
  if (/^\d{9}$/.test(d)) return `56${d}`
  if (/^56\d{9}$/.test(d)) return d
  return null
}

export function enlaceWhatsApp(telefono: string | null, mensaje: string) {
  const numero = numeroWhatsApp(telefono)
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

type Datos = {
  nombre: string
  marca: string
  modelo: string
  patente: string
  taller: string
}

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0]

// Mensaje general (desde la ficha del cliente o del vehículo).
export function mensajeGeneral(d: Datos) {
  return `Hola ${primerNombre(d.nombre)}, te escribimos de ${d.taller} por tu ${d.marca} ${d.modelo} (${d.patente}).`
}

type Renglon = {
  descripcion: string
  cantidad: number
  precio: number | null
  tipo?: string | null
}

function linea(i: Renglon) {
  const cant = i.cantidad !== 1 ? ` x${formatoNumero.format(i.cantidad)}` : ''
  const precio =
    i.precio != null ? ` - $${formatoNumero.format(i.cantidad * i.precio)}` : ''
  return `- ${i.descripcion}${cant}${precio}`
}

// Detalle del trabajo agrupado en repuestos y mano de obra (lo que no tiene tipo
// va como "Servicios"), con subtotales si hay más de un grupo y el total.
function resumen(items: Renglon[]) {
  if (items.length === 0) return ''
  const d = desgloseItems(items)
  const grupos = [
    { titulo: 'Repuestos', lista: d.repuestos, subtotal: d.subtotalRepuestos },
    {
      titulo: 'Mano de obra',
      lista: d.manoDeObra,
      subtotal: d.subtotalManoDeObra,
    },
    {
      titulo: 'Servicios',
      lista: d.sinClasificar,
      subtotal: d.subtotalSinClasificar,
    },
  ].filter((g) => g.lista.length > 0)
  const conSubtotal = d.hayPrecios && grupos.length > 1
  const bloques = grupos.map((g) => {
    const lineas = g.lista.map(linea).join('\n')
    const subtotal = conSubtotal
      ? `\nSubtotal: $${formatoNumero.format(g.subtotal)}`
      : ''
    return `${g.titulo}:\n${lineas}${subtotal}`
  })
  const total = d.hayPrecios
    ? `\n\nTotal: $${formatoNumero.format(d.total)}`
    : ''
  return `\n\n${bloques.join('\n\n')}${total}`
}

// Detalle del trabajo para mandarle al cliente cuando se quiera (sin importar
// el estado del servicio).
export function mensajeDetalle(d: Datos, items: Renglon[]) {
  // Sin vehículo (presupuesto desde la calculadora) no se nombra el auto.
  const auto = d.patente ? ` de tu ${d.marca} ${d.modelo} (${d.patente})` : ''
  return `Hola ${primerNombre(d.nombre)}, te paso el detalle del trabajo${auto} en ${d.taller}.${resumen(items)}`
}

// Mensaje según cómo va el trabajo.
export function mensajeServicio(
  d: Datos,
  estado: string,
  items: Renglon[] = [],
) {
  const n = primerNombre(d.nombre)
  const auto = `${d.marca} ${d.modelo} (${d.patente})`
  if (estado === 'listo') {
    return `Hola ${n}, tu ${auto} ya está listo para retirar en ${d.taller}.${resumen(items)}`
  }
  if (estado === 'entregado') {
    return `Hola ${n}, gracias por confiar en ${d.taller}. Te dejamos el detalle del servicio de tu ${auto}.${resumen(items)}`
  }
  return `Hola ${n}, recibimos tu ${auto} en ${d.taller}. Te avisamos cuando esté listo.`
}

// Saludo simple (ficha del cliente, sin un vehículo puntual).
export function mensajeCliente(nombre: string, taller: string) {
  return `Hola ${primerNombre(nombre)}, te escribimos de ${taller}.`
}

// Aviso de un próximo servicio pendiente (recordatorio).
export function mensajeRecordatorio(
  d: Datos,
  r: { nota: string; fechaEstimada: string; targetKm: number | null },
) {
  const [anio, mes, dia] = r.fechaEstimada.split('-')
  const cuando =
    r.targetKm != null
      ? `a los ${formatoNumero.format(r.targetKm)} km o hacia el ${dia}/${mes}/${anio}`
      : `hacia el ${dia}/${mes}/${anio}`
  return `Hola ${primerNombre(d.nombre)}, te recordamos que tu ${d.marca} ${d.modelo} (${d.patente}) tiene pendiente: ${r.nota} (${cuando}). Escribinos para coordinar. ${d.taller}`
}
