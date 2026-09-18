// Escapa los comodines de LIKE para que el texto se busque literal.
export function escaparLike(texto: string) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`)
}
