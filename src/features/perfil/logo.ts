const LADO_MAXIMO = 160
// Un poco menos que el límite de la base (100.000 caracteres).
const LARGO_MAXIMO = 95000

// Achica la imagen elegida a un máximo de 160 px por lado y la devuelve como
// data URL (webp; si el navegador no lo soporta, png). Así el logo pesa unos
// pocos kB y se guarda directo en la base, sin servicio de almacenamiento.
export async function redimensionarLogo(archivo: File): Promise<string> {
  if (!archivo.type.startsWith('image/')) {
    throw new Error('El archivo no es una imagen')
  }
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(
    1,
    LADO_MAXIMO / Math.max(bitmap.width, bitmap.height),
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * escala))
  canvas.height = Math.max(1, Math.round(bitmap.height * escala))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  // webp; si el navegador no lo soporta, png y, si pesa demasiado, jpeg.
  const candidatos = [
    () => canvas.toDataURL('image/webp', 0.85),
    () => canvas.toDataURL('image/png'),
    () => canvas.toDataURL('image/jpeg', 0.85),
  ]
  for (const generar of candidatos) {
    const url = generar()
    const tipo = url.slice(5, url.indexOf(';'))
    if (
      ['image/webp', 'image/png', 'image/jpeg'].includes(tipo) &&
      url.length <= LARGO_MAXIMO
    ) {
      return url
    }
  }
  throw new Error('El logo pesa demasiado')
}
