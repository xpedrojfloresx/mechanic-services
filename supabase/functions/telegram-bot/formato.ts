// Redacción de las respuestas: las arma el código con lo que devuelve la base
// (no el modelo), así no puede "contar" algo distinto de lo que hay cargado.

const numero = new Intl.NumberFormat('es-AR')
const pesos = (n: number) => `$ ${numero.format(n)}`

// AAAA-MM-DD -> DD/MM/AAAA
function fecha(iso: string | null | undefined) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

const estados: Record<string, string> = {
  en_taller: 'En taller',
  listo: 'Listo para entregar',
  entregado: 'Entregado',
}

type Cliente = { nombre: string; telefono: string | null } | null

export type FichaVehiculo = {
  patente: string
  marca: string
  modelo: string
  anio: number | null
  color: string | null
  cliente: Cliente
  ingresos: number
  abierto: {
    estado: string
    fecha_ingreso: string
    fecha_prometida: string | null
    motivo: string | null
    total: number
  } | null
  ultimo: {
    fecha: string
    km: number
    motivo: string | null
    trabajos: string[]
  } | null
}

export function textoVehiculo(v: FichaVehiculo) {
  const lineas = [`🚗 ${v.marca} ${v.modelo} · ${v.patente}`]
  const detalle = [v.anio, v.color].filter(Boolean).join(' · ')
  if (detalle) lineas.push(detalle)
  lineas.push(
    v.cliente
      ? `👤 Dueño: ${v.cliente.nombre}${v.cliente.telefono ? ` · ${v.cliente.telefono}` : ''}`
      : '👤 Sin dueño cargado',
  )
  if (v.abierto) {
    const a = v.abierto
    let linea = `🔧 ${estados[a.estado] ?? a.estado} desde el ${fecha(a.fecha_ingreso)}`
    if (a.fecha_prometida)
      linea += ` · prometido para el ${fecha(a.fecha_prometida)}`
    lineas.push(linea)
    if (a.motivo) lineas.push(`   Motivo: ${a.motivo}`)
    if (a.total > 0) lineas.push(`   Total cargado: ${pesos(Number(a.total))}`)
  } else {
    lineas.push('🔧 No está en el taller ahora')
  }
  if (v.ultimo) {
    const u = v.ultimo
    const trabajos =
      u.trabajos.length > 0
        ? u.trabajos.join(', ')
        : (u.motivo ?? 'sin detalle')
    lineas.push(
      `🧾 Último ingreso (${fecha(u.fecha)}, ${numero.format(u.km)} km): ${trabajos}`,
    )
  }
  lineas.push(`Ingresos en total: ${v.ingresos}`)
  return lineas.join('\n')
}

type Fila = {
  patente: string
  marca: string
  modelo: string
  cliente: string | null
  estado: string
  fecha_ingreso: string
  fecha_prometida: string | null
}

const MAXIMO_FILAS = 15

export function textoEstadoTaller(filas: Fila[], soloListos: boolean) {
  const lista = soloListos ? filas.filter((f) => f.estado === 'listo') : filas
  if (lista.length === 0) {
    return soloListos
      ? 'No hay vehículos listos para entregar.'
      : 'No hay vehículos en el taller.'
  }
  const titulo = soloListos
    ? `Listos para entregar (${lista.length}):`
    : `En el taller ahora (${lista.length}):`
  const lineas = lista.slice(0, MAXIMO_FILAS).map((f) => {
    let linea = `• ${f.patente} ${f.marca} ${f.modelo}`
    if (f.cliente) linea += ` · ${f.cliente}`
    linea += ` · ${estados[f.estado] ?? f.estado}`
    if (f.fecha_prometida) linea += ` · prometido ${fecha(f.fecha_prometida)}`
    return linea
  })
  if (lista.length > MAXIMO_FILAS) {
    lineas.push(`... y ${lista.length - MAXIMO_FILAS} más`)
  }
  return `${titulo}\n${lineas.join('\n')}`
}

export type FichaCliente = {
  nombre: string
  telefono: string | null
  email: string | null
  vehiculos: {
    patente: string
    marca: string
    modelo: string
    anio: number | null
    color: string | null
  }[]
  servicios: {
    fecha: string
    patente: string
    marca: string
    modelo: string
    estado: string
    motivo: string | null
    total: number
  }[]
  recordatorios: { nota: string; fecha: string; patente: string }[]
}

export function textoCliente(c: FichaCliente) {
  const lineas = [
    `👤 ${c.nombre}`,
    `📞 ${c.telefono || 'Sin teléfono'}`,
    `✉️ ${c.email || 'Sin email'}`,
  ]
  lineas.push('')
  if (c.vehiculos.length === 0) {
    lineas.push('🚗 Sin vehículos cargados')
  } else {
    lineas.push(`🚗 Vehículos (${c.vehiculos.length}):`)
    for (const v of c.vehiculos) {
      const extra = [v.anio, v.color].filter(Boolean).join(' · ')
      lineas.push(
        `• ${v.patente} ${v.marca} ${v.modelo}${extra ? ` (${extra})` : ''}`,
      )
    }
  }
  if (c.servicios.length > 0) {
    lineas.push('', '🧾 Últimos servicios:')
    for (const s of c.servicios) {
      let linea = `• ${fecha(s.fecha)} · ${s.patente} · ${estados[s.estado] ?? s.estado}`
      if (s.motivo) linea += ` · ${s.motivo}`
      if (Number(s.total) > 0) linea += ` · ${pesos(Number(s.total))}`
      lineas.push(linea)
    }
  }
  if (c.recordatorios.length > 0) {
    lineas.push('', '🔔 Recordatorios pendientes:')
    for (const r of c.recordatorios) {
      lineas.push(`• ${fecha(r.fecha)} · ${r.patente} · ${r.nota}`)
    }
  }
  return lineas.join('\n')
}
