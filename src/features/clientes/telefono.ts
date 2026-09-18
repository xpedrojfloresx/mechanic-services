// Teléfonos de Argentina y Chile, solo números. Se aceptan separadores
// (espacios, guiones, paréntesis, puntos) y un "+" inicial, que se descartan.
//
// Argentina: 10 dígitos (área + número), o con 0 adelante (11), o con código
//            de país 54 (12) / 549 para celulares (13).
// Chile:     9 dígitos, o con código de país 56 (11).

const CARACTERES_PERMITIDOS = /^\+?[\d\s\-().]+$/

const FORMATOS = [
  /^\d{10}$/, // AR
  /^0\d{10}$/, // AR con 0
  /^54\d{10}$/, // AR con país
  /^549\d{10}$/, // AR celular con país
  /^\d{9}$/, // CL
  /^56\d{9}$/, // CL con país
]

export function normalizarTelefono(valor: string) {
  return valor.replace(/[\s\-().+]/g, '')
}

export function esTelefonoValido(valor: string) {
  const v = valor.trim()
  if (v === '') return true // el teléfono es opcional
  if (!CARACTERES_PERMITIDOS.test(v)) return false
  const digitos = normalizarTelefono(v)
  return FORMATOS.some((formato) => formato.test(digitos))
}
