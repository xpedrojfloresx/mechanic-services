const pad = (n: number) => String(n).padStart(2, '0')

// Suma meses a una fecha AAAA-MM-DD (si el día no existe en el mes destino,
// usa el último día: 31/01 + 1 mes = 28/02).
export function sumarMeses(fecha: string, meses: number) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const destino = new Date(anio, mes - 1 + meses, 1)
  const ultimoDia = new Date(
    destino.getFullYear(),
    destino.getMonth() + 1,
    0,
  ).getDate()
  return `${destino.getFullYear()}-${pad(destino.getMonth() + 1)}-${pad(Math.min(dia, ultimoDia))}`
}
