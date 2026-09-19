export const TIPOS_ITEM = [
  { value: 'repuesto', label: 'Repuesto' },
  { value: 'mano_de_obra', label: 'Mano de obra' },
] as const

export type TipoItem = (typeof TIPOS_ITEM)[number]['value']

export function etiquetaTipo(tipo: string | null | undefined) {
  return TIPOS_ITEM.find((t) => t.value === tipo)?.label ?? 'Sin clasificar'
}

type Renglon = {
  descripcion: string
  cantidad: number
  precio: number | null
  tipo?: string | null
}

const subtotalDe = (items: Renglon[]) =>
  items.reduce((suma, i) => suma + i.cantidad * (i.precio ?? 0), 0)

// Cuentas de un servicio: subtotal de repuestos, de mano de obra, de lo que no
// se clasificó (renglones cargados antes de que existiera el tipo) y el total.
// Los renglones sin precio no suman.
export function desgloseItems(items: Renglon[]) {
  const repuestos = items.filter((i) => i.tipo === 'repuesto')
  const manoDeObra = items.filter((i) => i.tipo === 'mano_de_obra')
  const sinClasificar = items.filter(
    (i) => i.tipo !== 'repuesto' && i.tipo !== 'mano_de_obra',
  )
  return {
    repuestos,
    manoDeObra,
    sinClasificar,
    subtotalRepuestos: subtotalDe(repuestos),
    subtotalManoDeObra: subtotalDe(manoDeObra),
    subtotalSinClasificar: subtotalDe(sinClasificar),
    total: subtotalDe(items),
    hayPrecios: items.some((i) => i.precio != null),
  }
}
