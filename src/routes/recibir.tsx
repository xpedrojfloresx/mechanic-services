import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Patente } from '@/components/patente'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientePicker } from '@/features/clientes/components/cliente-picker'
import { ClienteNuevoForm } from '@/features/clientes/components/cliente-nuevo-form'
import {
  useCerrarServicios,
  useItems,
  useServiciosDeVehiculo,
} from '@/features/servicios/api'
import { IngresoForm } from '@/features/servicios/components/ingreso-form'
import { useVehiculoPorPatente } from '@/features/vehiculos/api'
import { VehiculoForm } from '@/features/vehiculos/components/vehiculo-form'
import {
  esPatenteValida,
  normalizarPatente,
} from '@/features/vehiculos/patente'
import type { Tables } from '@/lib/database.types'
import { diasDesde, formatearFecha } from '@/lib/formato'

// Flujo principal del taller: llega un auto -> se escribe la patente.
// - Si el vehículo ya existe: solo se piden km y motivo.
// - Si es nuevo: se elige/carga el cliente y los datos del auto en la misma
//   pantalla. Al guardar se cae en el servicio para cargar repuestos.
export function RecibirPage() {
  const [params] = useSearchParams()
  const inicial = params.get('patente')
  const [entrada, setEntrada] = useState(inicial ?? '')
  const [patente, setPatente] = useState<string | null>(
    inicial && esPatenteValida(inicial) ? normalizarPatente(inicial) : null,
  )
  const [errorPatente, setErrorPatente] = useState(false)

  function continuar(e: React.FormEvent) {
    e.preventDefault()
    if (esPatenteValida(entrada)) {
      setErrorPatente(false)
      setPatente(normalizarPatente(entrada))
    } else {
      setErrorPatente(true)
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">Recibir vehículo</h1>

      {!patente ? (
        <form onSubmit={continuar} className="flex flex-col gap-3" noValidate>
          <label htmlFor="patente" className="text-sm font-medium">
            ¿Cuál es la patente?
          </label>
          <Input
            id="patente"
            autoFocus
            autoComplete="off"
            placeholder="AB123CD"
            className="h-14 text-center font-mono text-2xl uppercase"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
          />
          {errorPatente && (
            <p className="text-destructive text-sm">
              Patente inválida. Formatos: ABC123 o AB123CD
            </p>
          )}
          <Button type="submit" size="lg">
            Continuar
          </Button>
        </form>
      ) : (
        <Recepcion
          patente={patente}
          onCambiar={() => {
            setPatente(null)
            setEntrada('')
          }}
        />
      )}
    </div>
  )
}

function Recepcion(props: { patente: string; onCambiar: () => void }) {
  const {
    data: vehiculo,
    isLoading,
    isError,
  } = useVehiculoPorPatente(props.patente)
  const { data: servicios } = useServiciosDeVehiculo(vehiculo?.id)
  const ultimo = servicios?.[0]
  const { data: itemsUltimo } = useItems(ultimo?.id)
  // Qué se le hizo la última vez: los servicios realizados o, si no hay, el motivo.
  const ultimoTrabajo =
    itemsUltimo && itemsUltimo.length > 0
      ? itemsUltimo.map((i) => i.descripcion).join(', ')
      : ultimo?.motivo_ingreso

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Patente size="lg">{props.patente}</Patente>
        <Button variant="ghost" size="sm" onClick={props.onCambiar}>
          Cambiar patente
        </Button>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && vehiculo === undefined && (
        <p className="text-destructive text-sm">
          No pudimos buscar la patente. Probá de nuevo.
        </p>
      )}

      {vehiculo && (
        <>
          <Card>
            <CardContent className="text-sm">
              <p className="font-medium">
                {vehiculo.marca} {vehiculo.modelo}
              </p>
              <p className="text-muted-foreground">
                {vehiculo.clientes?.nombre}
                {ultimo &&
                  ` · Último ingreso: ${ultimo.km_al_ingreso.toLocaleString('es-AR')} km (${formatearFecha(ultimo.fecha_ingreso)})`}
              </p>
              {ultimoTrabajo && (
                <p className="line-clamp-2">
                  <span className="text-muted-foreground">
                    Último trabajo:{' '}
                  </span>
                  {ultimoTrabajo}
                </p>
              )}
            </CardContent>
          </Card>
          {servicios ? (
            <IngresoConControl vehiculoId={vehiculo.id} servicios={servicios} />
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </>
      )}

      {vehiculo === null && <VehiculoNuevo patente={props.patente} />}
    </div>
  )
}

// Un auto no puede estar dos veces en el taller: si todavía figura abierto
// (el mecánico se olvidó de marcar la entrega), se pregunta antes de abrir un
// ingreso nuevo.
function IngresoConControl(props: {
  vehiculoId: string
  servicios: Tables<'servicios'>[]
}) {
  const cerrar = useCerrarServicios()
  const [resuelto, setResuelto] = useState(false)
  const [error, setError] = useState(false)
  const abiertos = props.servicios.filter((s) => s.estado !== 'entregado')

  if (abiertos.length === 0 || resuelto) {
    return <IngresoForm vehiculoId={props.vehiculoId} />
  }

  // Los servicios vienen del más nuevo al más viejo.
  const masNuevo = abiertos[0]
  const masViejo = abiertos[abiertos.length - 1]

  async function yaSeEntrego() {
    setError(false)
    try {
      await cerrar.mutateAsync(abiertos.map((s) => s.id))
      setResuelto(true)
    } catch (e) {
      console.error('Error al cerrar los ingresos anteriores:', e)
      setError(true)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="font-medium">
          Este vehículo todavía figura en el taller desde hace{' '}
          {diasDesde(masViejo.fecha_ingreso)} días
          {masNuevo.motivo_ingreso && ` (${masNuevo.motivo_ingreso})`}.
        </p>
        <p className="text-muted-foreground">¿Ya se entregó?</p>
        {error && (
          <p className="text-destructive">
            No pudimos actualizarlo. Probá de nuevo.
          </p>
        )}
        <Button disabled={cerrar.isPending} onClick={yaSeEntrego}>
          Sí, ya se entregó: recibirlo de nuevo
        </Button>
        <Button asChild variant="outline">
          <Link to={`/servicios/${masNuevo.id}`}>
            Todavía está acá: ver ese ingreso
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function VehiculoNuevo({ patente }: { patente: string }) {
  const [modo, setModo] = useState<'nuevo' | 'existente'>('nuevo')

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Es la primera vez que viene con este vehículo.
      </p>
      <Tabs value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
        <TabsList>
          <TabsTrigger value="nuevo">Cliente nuevo</TabsTrigger>
          <TabsTrigger value="existente">Cliente que ya tengo</TabsTrigger>
        </TabsList>
      </Tabs>

      {modo === 'nuevo' ? (
        <ClienteNuevoForm patenteInicial={patente} />
      ) : (
        <ClienteExistente patente={patente} />
      )}
    </div>
  )
}

function ClienteExistente({ patente }: { patente: string }) {
  const [elegido, setElegido] = useState<Tables<'clientes'> | null>(null)

  if (elegido) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex items-center justify-between gap-2 text-sm">
            <div>
              <p className="font-medium">{elegido.nombre}</p>
              <p className="text-muted-foreground">{elegido.telefono}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setElegido(null)}>
              Cambiar
            </Button>
          </CardContent>
        </Card>
        <VehiculoForm clienteId={elegido.id} patenteInicial={patente} />
      </div>
    )
  }

  return <ClientePicker onElegir={setElegido} />
}
