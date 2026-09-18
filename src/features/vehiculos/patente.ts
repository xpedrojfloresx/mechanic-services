// Normaliza una patente: mayúsculas, sin espacios, guiones ni otros símbolos.
export function normalizarPatente(valor: string) {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// Formatos argentinos: viejo (ABC123) y Mercosur (AB123CD).
const PATENTE_VIEJA = /^[A-Z]{3}\d{3}$/
const PATENTE_MERCOSUR = /^[A-Z]{2}\d{3}[A-Z]{2}$/

export function esPatenteValida(valor: string) {
  const patente = normalizarPatente(valor)
  return PATENTE_VIEJA.test(patente) || PATENTE_MERCOSUR.test(patente)
}
