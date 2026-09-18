import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Patente } from '@/components/patente'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MIN_CARACTERES_BUSQUEDA, useBusqueda } from '@/features/busqueda/api'
import { useVehiculosDeCliente } from '@/features/vehiculos/api'
import { useDebouncedValue } from '@/lib/use-debounced-value'

export type VehiculoElegido = {
  id: string
  patente: string
  marca: string
  modelo: string
  cliente: string | null
  telefono: string | null
}

// Busca un auto por patente o nombre del cliente y lo devuelve al tocarlo.
export function ElegirVehiculo({
  onElegir,
  pregunta = '¿A qué auto le hiciste el servicio?',
}: {
  onElegir: (v: VehiculoElegido) => void
  pregunta?: string
}) {
  const [texto, setTexto] = useState('')
  const termino = useDebouncedValue(texto)
  const busca = termino.trim().length >= MIN_CARACTERES_BUSQUEDA
  const { data, isFetching } = useBusqueda(termino)

  const hayResultados =
    !!data && (data.vehiculos.length > 0 || data.clientes.length > 0)

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="buscar-auto" className="text-sm font-medium">
        {pregunta}
      </label>
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id="buscar-auto"
          autoFocus
          autoComplete="off"
          placeholder="Patente o nombre del cliente"
          className="h-12 pl-9 text-base"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      {busca && isFetching && !data && <Skeleton className="h-16 w-full" />}
      {busca && data && !hayResultados && (
        <p className="text-muted-foreground text-sm">
          No encontramos ese auto.{' '}
          <Link to="/recibir" className="underline underline-offset-4">
            Recibir un vehículo nuevo
          </Link>
        </p>
      )}

      {data?.vehiculos.map((v) => (
        <FilaVehiculo
          key={v.id}
          patente={v.patente}
          detalle={`${v.marca} ${v.modelo}`}
          cliente={v.clientes?.nombre ?? null}
          onClick={() =>
            onElegir({
              id: v.id,
              patente: v.patente,
              marca: v.marca,
              modelo: v.modelo,
              cliente: v.clientes?.nombre ?? null,
              telefono: v.clientes?.telefono ?? null,
            })
          }
        />
      ))}

      {data?.clientes.slice(0, 5).map((c) => (
        <VehiculosDeUnCliente
          key={c.id}
          clienteId={c.id}
          nombre={c.nombre}
          telefono={c.telefono}
          onElegir={onElegir}
        />
      ))}
    </div>
  )
}

function VehiculosDeUnCliente(props: {
  clienteId: string
  nombre: string
  telefono: string | null
  onElegir: (v: VehiculoElegido) => void
}) {
  const { data: vehiculos } = useVehiculosDeCliente(props.clienteId)
  return (
    <>
      {vehiculos?.map((v) => (
        <FilaVehiculo
          key={v.id}
          patente={v.patente}
          detalle={`${v.marca} ${v.modelo}`}
          cliente={props.nombre}
          onClick={() =>
            props.onElegir({
              id: v.id,
              patente: v.patente,
              marca: v.marca,
              modelo: v.modelo,
              cliente: props.nombre,
              telefono: props.telefono,
            })
          }
        />
      ))}
    </>
  )
}

function FilaVehiculo(props: {
  patente: string
  detalle: string
  cliente: string | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="hover:bg-muted flex items-center justify-between gap-2 rounded-lg border p-3 text-left"
    >
      <span>
        <span className="block font-medium">{props.cliente}</span>
        <span className="text-muted-foreground block text-sm">
          {props.detalle}
        </span>
      </span>
      <Patente size="sm">{props.patente}</Patente>
    </button>
  )
}
