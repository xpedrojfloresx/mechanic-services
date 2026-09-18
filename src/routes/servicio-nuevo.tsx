import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MIN_CARACTERES_BUSQUEDA, useBusqueda } from '@/features/busqueda/api'
import { AgregarServiciosForm } from '@/features/servicios/components/agregar-servicios-form'
import { etiquetaEstado } from '@/features/servicios/estados'
import { useServiciosDeVehiculo } from '@/features/servicios/api'
import { useVehiculosDeCliente } from '@/features/vehiculos/api'
import { formatearFecha, haceCuanto } from '@/lib/formato'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'

type VehiculoElegido = {
  id: string
  patente: string
  marca: string
  modelo: string
  cliente: string | null
  telefono: string | null
}

// "Añadir servicio" desde la pestaña Servicios: 1) elegir el auto,
// 2) elegir su ingreso abierto, 3) cargar todos los servicios hechos.
export function ServicioNuevoPage() {
  const [vehiculo, setVehiculo] = useState<VehiculoElegido | null>(null)

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">Añadir servicio</h1>
      {vehiculo ? (
        <ServiciosDelVehiculo
          vehiculo={vehiculo}
          onCambiar={() => setVehiculo(null)}
        />
      ) : (
        <ElegirVehiculo onElegir={setVehiculo} />
      )}
    </div>
  )
}

function ElegirVehiculo({
  onElegir,
}: {
  onElegir: (v: VehiculoElegido) => void
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
        ¿A qué auto le hiciste el servicio?
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
      <Badge variant="secondary" className="font-mono">
        {props.patente}
      </Badge>
    </button>
  )
}

function ServiciosDelVehiculo(props: {
  vehiculo: VehiculoElegido
  onCambiar: () => void
}) {
  const navigate = useNavigate()
  const { vehiculo } = props
  const { data: servicios, isLoading } = useServiciosDeVehiculo(vehiculo.id)
  const [elegidoId, setElegidoId] = useState<string | null>(null)

  // Solo los ingresos que siguen abiertos (no entregados); el más nuevo primero.
  const abiertos = (servicios ?? []).filter((s) => s.estado !== 'entregado')
  const ingreso = abiertos.find((s) => s.id === elegidoId) ?? abiertos[0]

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-2">
          <div>
            <p className="font-medium">{vehiculo.cliente}</p>
            <p className="text-muted-foreground text-sm">
              {vehiculo.marca} {vehiculo.modelo}
              {vehiculo.telefono && ` · ${vehiculo.telefono}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className="font-mono">{vehiculo.patente}</Badge>
            <Button variant="ghost" size="sm" onClick={props.onCambiar}>
              Cambiar auto
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {servicios && abiertos.length === 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Este auto no tiene un ingreso abierto en el taller. Para cargarle
            servicios primero hay que recibirlo.
          </p>
          <Button asChild>
            <Link to={`/recibir?patente=${vehiculo.patente}`}>
              Recibir vehículo
            </Link>
          </Button>
        </div>
      )}

      {ingreso && (
        <>
          {abiertos.length > 1 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Tiene {abiertos.length} ingresos abiertos. ¿A cuál?
              </p>
              {abiertos.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setElegidoId(s.id)}
                  className={cn(
                    'rounded-lg border p-3 text-left text-sm',
                    s.id === ingreso.id && 'border-primary bg-muted',
                  )}
                >
                  <span className="font-medium">
                    {formatearFecha(s.fecha_ingreso)} ·{' '}
                    {haceCuanto(s.fecha_ingreso)}
                  </span>
                  <span className="text-muted-foreground block">
                    {s.motivo_ingreso} · {etiquetaEstado(s.estado)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {abiertos.length === 1 && (
            <p className="text-muted-foreground text-sm">
              Ingreso del {formatearFecha(ingreso.fecha_ingreso)}
              {ingreso.motivo_ingreso && ` · ${ingreso.motivo_ingreso}`}
            </p>
          )}

          {/* key: al cambiar de ingreso el formulario arranca limpio */}
          <AgregarServiciosForm
            key={ingreso.id}
            servicioId={ingreso.id}
            onGuardado={() => navigate(`/servicios/${ingreso.id}`)}
          />
        </>
      )}
    </div>
  )
}
