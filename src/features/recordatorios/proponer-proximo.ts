import { useSyncExternalStore } from 'react'

// Datos del servicio que se acaba de entregar, para ofrecer programar el
// próximo. Vive fuera de los componentes porque la tarjeta que dispara el
// aviso desaparece de la lista apenas el servicio pasa a Entregado.
export type PropuestaProximo = {
  servicioId: string
  vehiculoId: string
  auto: string
}

let propuesta: PropuestaProximo | null = null
const oyentes = new Set<() => void>()

function avisar() {
  oyentes.forEach((f) => f())
}

export function proponerProximoServicio(p: PropuestaProximo) {
  propuesta = p
  avisar()
}

export function cerrarPropuestaProximo() {
  propuesta = null
  avisar()
}

export function usePropuestaProximo() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    () => propuesta,
  )
}
