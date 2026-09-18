export const ESTADOS = [
  { value: 'en_taller', label: 'En taller' },
  { value: 'listo', label: 'Listo' },
  { value: 'entregado', label: 'Entregado' },
] as const

export type Estado = (typeof ESTADOS)[number]['value']

export function etiquetaEstado(estado: string) {
  return ESTADOS.find((e) => e.value === estado)?.label ?? estado
}
