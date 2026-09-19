import { useEffect, useRef } from 'react'

const MARCA = '__cartel'

// Cuántos "atrás" provocamos nosotros mismos (para no confundirlos con los del
// usuario). Un único oyente global los descuenta y marca si el último popstate
// fue propio; se registra al cargar el módulo, así corre antes que los de los
// carteles.
let atrasPropios = 0
let popstatePropio = false
window.addEventListener('popstate', () => {
  popstatePropio = atrasPropios > 0
  if (popstatePropio) atrasPropios--
})

// Sacar la entrada del historial se demora un instante: si el cartel se vuelve
// a abrir enseguida (React en desarrollo abre, cierra y abre los efectos de
// nuevo), se reutiliza la entrada en vez de sacarla y volver a sumarla.
let quitarPendiente: ReturnType<typeof setTimeout> | null = null

// Con un cartel abierto, el "atrás" del celular (o del navegador) lo cierra en
// vez de cambiar de pantalla. Al abrirse suma una entrada al historial con la
// misma URL; si el cartel se cierra de otra forma (botón, confirmar), esa
// entrada se saca.
export function useAtrasCierraCartel(
  abierto: boolean,
  cerrar: (abierto: boolean) => void,
) {
  const cerrarRef = useRef(cerrar)
  useEffect(() => {
    cerrarRef.current = cerrar
  })

  useEffect(() => {
    if (!abierto) return
    let cerradoPorAtras = false

    if (quitarPendiente !== null) {
      clearTimeout(quitarPendiente)
      quitarPendiente = null
    } else {
      window.history.pushState({ ...window.history.state, [MARCA]: true }, '')
    }

    function alAtras() {
      if (popstatePropio) return
      cerradoPorAtras = true
      cerrarRef.current(false)
    }
    window.addEventListener('popstate', alAtras)

    return () => {
      window.removeEventListener('popstate', alAtras)
      if (cerradoPorAtras || !window.history.state?.[MARCA]) return
      quitarPendiente = setTimeout(() => {
        quitarPendiente = null
        if (window.history.state?.[MARCA]) {
          atrasPropios++
          window.history.back()
        }
      }, 0)
    }
  }, [abierto])
}
