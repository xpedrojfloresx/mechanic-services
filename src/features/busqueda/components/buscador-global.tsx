import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Patente } from '@/components/patente'
import { Input } from '@/components/ui/input'
import { MIN_CARACTERES_BUSQUEDA, useBusqueda } from '@/features/busqueda/api'
import {
  esPatenteValida,
  normalizarPatente,
} from '@/features/vehiculos/patente'
import { useDebouncedValue } from '@/lib/use-debounced-value'

// Buscador de la barra superior: siempre disponible, encuentra por patente o
// nombre de cliente y lleva directo a la ficha. Si no hay resultados, ofrece
// recibir el vehículo con esa patente. El layout lo monta con `key` según la
// ruta, así se limpia solo al cambiar de pantalla.
export function BuscadorGlobal() {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const termino = useDebouncedValue(texto)
  const busca = termino.trim().length >= MIN_CARACTERES_BUSQUEDA
  const { data, isFetching } = useBusqueda(termino)

  // Click fuera cierra la lista.
  useEffect(() => {
    function alClickear(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClickear)
    return () => document.removeEventListener('mousedown', alClickear)
  }, [])

  const hayResultados =
    !!data && (data.vehiculos.length > 0 || data.clientes.length > 0)
  const patenteEscrita = esPatenteValida(texto)
    ? normalizarPatente(texto)
    : null

  return (
    <div ref={contenedor} className="relative min-w-0 flex-1">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        autoComplete="off"
        placeholder="Buscar patente o cliente"
        className="pl-9"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
      />

      {abierto && busca && (
        <div className="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border p-1 shadow-md">
          {isFetching && !data && (
            <p className="text-muted-foreground p-3 text-sm">Buscando...</p>
          )}

          {data?.vehiculos.map((v) => (
            <Link
              key={v.id}
              to={`/vehiculos/${v.id}`}
              className="hover:bg-muted flex items-center justify-between gap-2 rounded-md p-2 text-sm"
            >
              <span>
                <span className="font-medium">
                  {v.marca} {v.modelo}
                </span>
                <span className="text-muted-foreground block">
                  {v.clientes?.nombre}
                </span>
              </span>
              <Patente size="sm">{v.patente}</Patente>
            </Link>
          ))}

          {data?.clientes.map((c) => (
            <Link
              key={c.id}
              to={`/clientes/${c.id}`}
              className="hover:bg-muted flex items-center justify-between gap-2 rounded-md p-2 text-sm"
            >
              <span className="font-medium">{c.nombre}</span>
              <span className="text-muted-foreground">{c.telefono}</span>
            </Link>
          ))}

          {data && !hayResultados && (
            <p className="text-muted-foreground p-3 text-sm">
              No encontramos resultados.
            </p>
          )}

          {data && !hayResultados && patenteEscrita && (
            <button
              type="button"
              className="hover:bg-muted w-full rounded-md p-2 text-left text-sm font-medium"
              onClick={() => navigate(`/recibir?patente=${patenteEscrita}`)}
            >
              Recibir vehículo {patenteEscrita}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
