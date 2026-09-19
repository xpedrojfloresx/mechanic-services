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

type EntregaHoy = {
  patente: string
  marca: string
  modelo: string
  cliente: string | null
  telefono: string | null
  estado: string
  fecha_prometida: string
  vencido: boolean
}

export function textoEntregasDeHoy(filas: EntregaHoy[], soloVencidos: boolean) {
  const lista = soloVencidos ? filas.filter((f) => f.vencido) : filas
  if (lista.length === 0) {
    return soloVencidos
      ? 'No tenés entregas atrasadas. 👍'
      : 'No tenés nada prometido para hoy ni atrasado. 👍'
  }
  const titulo = soloVencidos
    ? `Entregas atrasadas (${lista.length}):`
    : `Para entregar hoy o atrasados (${lista.length}):`
  const lineas = lista.slice(0, MAXIMO_FILAS).map((f) => {
    let linea = `• ${f.patente} ${f.marca} ${f.modelo}`
    if (f.cliente) linea += ` · ${f.cliente}`
    if (f.telefono) linea += ` · ${f.telefono}`
    linea += ` · ${estados[f.estado] ?? f.estado}`
    linea += f.vencido
      ? ` · ⚠️ prometido el ${fecha(f.fecha_prometida)}`
      : ' · prometido para hoy'
    return linea
  })
  if (lista.length > MAXIMO_FILAS) {
    lineas.push(`... y ${lista.length - MAXIMO_FILAS} más`)
  }
  return `${titulo}\n${lineas.join('\n')}`
}

export type ParaAvisar = {
  total: number
  recordatorios: {
    nota: string
    fecha: string
    vencido: boolean
    patente: string
    marca: string
    modelo: string
    cliente: string | null
    telefono: string | null
  }[]
}

export function textoParaAvisar(datos: ParaAvisar, soloVencidos: boolean) {
  const lista = soloVencidos
    ? datos.recordatorios.filter((r) => r.vencido)
    : datos.recordatorios
  if (lista.length === 0) {
    return soloVencidos
      ? 'No tenés recordatorios vencidos. 👍'
      : 'No tenés a nadie para avisar por ahora. 👍'
  }
  const titulo = soloVencidos
    ? `Recordatorios vencidos (${lista.length}):`
    : `Para avisar (${datos.total}):`
  const lineas = lista.map((r) => {
    let linea = `• ${r.cliente ?? 'Sin cliente'}`
    if (r.telefono) linea += ` · ${r.telefono}`
    linea += ` · ${r.patente} ${r.marca} ${r.modelo} · ${r.nota}`
    linea += r.vencido
      ? ` · ⚠️ vencido el ${fecha(r.fecha)}`
      : ` · ${fecha(r.fecha)}`
    return linea
  })
  if (!soloVencidos && datos.total > lista.length) {
    lineas.push(`... y ${datos.total - lista.length} más`)
  }
  return `${titulo}\n${lineas.join('\n')}`
}

export type Historial = {
  patente: string
  marca: string
  modelo: string
  cliente: string | null
  ingresos: {
    fecha: string
    km: number
    estado: string
    motivo: string | null
    total: number
    trabajos: {
      descripcion: string
      cantidad: number
      precio: number | null
      tipo: string | null
    }[]
  }[]
}

export function textoHistorial(h: Historial) {
  const lineas = [
    `🧾 Historial de ${h.marca} ${h.modelo} · ${h.patente}${h.cliente ? ` (${h.cliente})` : ''}`,
  ]
  if (h.ingresos.length === 0) {
    lineas.push('Todavía no tiene ingresos cargados.')
    return lineas.join('\n')
  }
  for (const i of h.ingresos) {
    lineas.push(
      '',
      `📅 ${fecha(i.fecha)} · ${numero.format(i.km)} km · ${estados[i.estado] ?? i.estado}`,
    )
    if (i.trabajos.length === 0) {
      lineas.push(`   ${i.motivo ?? 'Sin trabajos cargados'}`)
    } else {
      for (const t of i.trabajos) {
        const cant =
          Number(t.cantidad) !== 1
            ? ` x${numero.format(Number(t.cantidad))}`
            : ''
        const precio =
          t.precio != null
            ? ` · ${pesos(Number(t.cantidad) * Number(t.precio))}`
            : ''
        const tipo =
          t.tipo === 'repuesto'
            ? ' (repuesto)'
            : t.tipo === 'mano_de_obra'
              ? ' (mano de obra)'
              : ''
        lineas.push(`   • ${t.descripcion}${cant}${tipo}${precio}`)
      }
      if (Number(i.total) > 0)
        lineas.push(`   Total: ${pesos(Number(i.total))}`)
    }
  }
  return lineas.join('\n')
}

export type ListaClientes = {
  total: number
  clientes: { nombre: string; telefono: string | null; vehiculos: number }[]
}

export function textoListaClientes(datos: ListaClientes, prefijo: string) {
  if (datos.total === 0) {
    return prefijo
      ? `No hay clientes que empiecen con "${prefijo}".`
      : 'Todavía no hay clientes cargados.'
  }
  const titulo = prefijo
    ? `Clientes que empiezan con "${prefijo}" (${datos.total}):`
    : `Clientes cargados (${datos.total}):`
  const lineas = datos.clientes.map((c) => {
    const autos = c.vehiculos === 1 ? '1 auto' : `${c.vehiculos} autos`
    return `• ${c.nombre}${c.telefono ? ` · ${c.telefono}` : ''} · ${autos}`
  })
  if (datos.total > datos.clientes.length) {
    lineas.push(
      `... y ${datos.total - datos.clientes.length} más. Decime una letra (por ejemplo "clientes con G") o el nombre de uno para ver su información.`,
    )
  }
  return `${titulo}\n${lineas.join('\n')}`
}

export type Preparacion = {
  accion_id: string
  patente: string
  marca: string
  modelo: string
  cliente: string | null
  estado_actual?: string
  estado_nuevo?: string
  items?: {
    tipo: string
    descripcion: string
    cantidad: number
    precio: number | null
  }[]
  total?: number
}

const tiposItem: Record<string, string> = {
  repuesto: 'repuesto',
  mano_de_obra: 'mano de obra',
}

// Texto que se muestra ANTES de ejecutar, armado con lo que encontró la base.
export function textoConfirmarEstado(p: Preparacion) {
  const auto = `${p.marca} ${p.modelo} ${p.patente}${p.cliente ? ` de ${p.cliente}` : ''}`
  return [
    `¿Marcar como ${(estados[p.estado_nuevo ?? ''] ?? '').toUpperCase()} el ${auto}?`,
    `Ahora figura: ${estados[p.estado_actual ?? ''] ?? p.estado_actual}.`,
    '(Vence en 10 minutos)',
  ].join('\n')
}

export function textoConfirmarServicios(p: Preparacion) {
  const auto = `${p.marca} ${p.modelo} ${p.patente}${p.cliente ? ` (de ${p.cliente})` : ''}`
  const lineas = [`¿Cargar esto al ${auto}?`]
  for (const i of p.items ?? []) {
    const cant =
      Number(i.cantidad) !== 1 ? ` x${numero.format(Number(i.cantidad))}` : ''
    const precio =
      i.precio != null
        ? ` · ${pesos(Number(i.cantidad) * Number(i.precio))}`
        : ' · sin precio'
    lineas.push(
      `• ${i.descripcion}${cant} (${tiposItem[i.tipo] ?? i.tipo})${precio}`,
    )
  }
  if (Number(p.total) > 0) lineas.push(`Total: ${pesos(Number(p.total))}`)
  lineas.push('(Vence en 10 minutos)')
  return lineas.join('\n')
}

export type Confirmacion = {
  ok?: boolean
  error?: string
  tipo?: string
  patente?: string
  marca?: string
  modelo?: string
  estado_nuevo?: string
  cantidad?: number
  total?: number
}

const erroresAccion: Record<string, string> = {
  vencida: 'Pasaron más de 10 minutos. Pedímelo de nuevo.',
  ya_procesada: 'Esa acción ya se procesó.',
  no_existe: 'No encontré esa acción.',
  ya_no_esta_abierto:
    'Ese ingreso ya no está abierto (cambió mientras tanto). No hice nada.',
}

export function textoResultado(r: Confirmacion) {
  if (!r.ok)
    return erroresAccion[r.error ?? ''] ?? 'No pude hacerlo. Probá de nuevo.'
  const auto = `${r.marca} ${r.modelo} ${r.patente}`
  if (r.tipo === 'cambiar_estado') {
    return `✅ Listo: el ${auto} quedó como ${(estados[r.estado_nuevo ?? ''] ?? '').toUpperCase()}.`
  }
  const renglones = r.cantidad === 1 ? '1 renglón' : `${r.cantidad} renglones`
  const total = Number(r.total) > 0 ? ` (total ${pesos(Number(r.total))})` : ''
  return `✅ Cargué ${renglones} al ${auto}${total}.`
}

// Errores al PREPARAR (antes de pedir confirmación).
export function textoErrorPreparar(
  error: string,
  patente: string,
  estado?: string,
) {
  switch (error) {
    case 'no_existe':
      return `No encontré la patente ${patente} en el taller.`
    case 'no_esta_en_taller':
      return `La patente ${patente} no tiene un ingreso abierto en el taller. Para cargarle cosas primero hay que recibirlo en la app.`
    case 'ya_esta':
      return `Ya figura como ${(estados[estado ?? ''] ?? estado ?? '').toUpperCase()}. No hice nada.`
    case 'items_invalidos':
      return 'No entendí bien los datos (tipo, descripción o precio). Decímelo de nuevo, por favor.'
    default:
      return 'No pude prepararlo. Probá de nuevo.'
  }
}
