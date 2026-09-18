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

type Renglon = { descripcion: string; cantidad: number; precio: number | null }

function resumen(items: Renglon[]) {
  if (items.length === 0) return ''
  const lineas = items.map((i) => {
    const cant = i.cantidad !== 1 ? ` x${formatoNumero.format(i.cantidad)}` : ''
    const precio =
      i.precio != null
        ? ` - $${formatoNumero.format(i.cantidad * i.precio)}`
        : ''
    return `- ${i.descripcion}${cant}${precio}`
  })
  const hayPrecios = items.some((i) => i.precio != null)
  const total = items.reduce((s, i) => s + i.cantidad * (i.precio ?? 0), 0)
  return `\n\nServicios:\n${lineas.join('\n')}${hayPrecios ? `\n\nTotal: $${formatoNumero.format(total)}` : ''}`
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
