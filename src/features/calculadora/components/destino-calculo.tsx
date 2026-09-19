import { MessageCircle, Save } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Patente } from '@/components/patente'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTallerActual } from '@/features/auth/hooks/use-taller-actual'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { ClientePicker } from '@/features/clientes/components/cliente-picker'
import {
  useGuardarItems,
  useServiciosDeVehiculo,
  type ItemInput,
} from '@/features/servicios/api'
import { etiquetaEstado } from '@/features/servicios/estados'
import { useVehiculosDeCliente } from '@/features/vehiculos/api'
import { BotonWhatsApp } from '@/features/whatsapp/components/boton-whatsapp'
import { mensajeDetalle } from '@/features/whatsapp/whatsapp'
import type { Tables } from '@/lib/database.types'
import { formatearFecha } from '@/lib/formato'
import { cn } from '@/lib/utils'

// Último paso de la calculadora: elegir el cliente y, con el cálculo armado,
// mandarle el detalle por WhatsApp y/o guardarlo como servicios de su auto.
// items es null mientras los renglones no están completos.
export function DestinoCalculo({ items }: { items: ItemInput[] | null }) {
  const navigate = useNavigate()
  const { data: taller } = useTallerActual()
  const { data: usuario } = useUsuarioActual()
  const guardar = useGuardarItems(usuario?.taller_id)
  const [eligiendo, setEligiendo] = useState(false)
  const [cliente, setCliente] = useState<Tables<'clientes'> | null>(null)
  const [vehiculoId, setVehiculoId] = useState<string | null>(null)
  const [ingresoId, setIngresoId] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const { data: vehiculos } = useVehiculosDeCliente(cliente?.id)
  // Con un solo vehículo se elige solo.
  const vehiculo =
    vehiculos?.find((v) => v.id === vehiculoId) ??
    (vehiculos?.length === 1 ? vehiculos[0] : undefined)
  const { data: servicios } = useServiciosDeVehiculo(vehiculo?.id)
  const abiertos = (servicios ?? []).filter((s) => s.estado !== 'entregado')
  const ingreso = abiertos.find((s) => s.id === ingresoId) ?? abiertos[0]

  function elegirCliente(c: Tables<'clientes'>) {
    setCliente(c)
    setVehiculoId(null)
    setIngresoId(null)
    setEligiendo(false)
  }

  async function guardarEnServicio() {
    if (!items || !ingreso) return
    setError(false)
    try {
      await guardar.mutateAsync({ servicioId: ingreso.id, items })
      navigate(`/servicios/${ingreso.id}`, { replace: true })
    } catch (e) {
      console.error('Error al guardar el cálculo como servicio:', e)
      setError(true)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">¿Para quién es?</h2>

      {!cliente && !eligiendo && (
        <Button variant="outline" onClick={() => setEligiendo(true)}>
          Elegir cliente
        </Button>
      )}
      {!cliente && eligiendo && (
        <div className="flex flex-col gap-2">
          <ClientePicker onElegir={elegirCliente} />
          <Button variant="ghost" size="sm" onClick={() => setEligiendo(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {cliente && (
        <>
          <Card>
            <CardContent className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{cliente.nombre}</p>
                <p className="text-muted-foreground text-sm">
                  {cliente.telefono || 'Sin teléfono'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEligiendo(true)}
              >
                Cambiar
              </Button>
            </CardContent>
          </Card>
          {eligiendo && (
            <ClientePicker onElegir={elegirCliente} excluirId={cliente.id} />
          )}

          {vehiculos && vehiculos.length > 1 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">¿De qué auto?</p>
              {vehiculos.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVehiculoId(v.id)
                    setIngresoId(null)
                  }}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm',
                    v.id === vehiculo?.id && 'border-primary bg-muted',
                  )}
                >
                  <span className="font-medium">
                    {v.marca} {v.modelo}
                  </span>
                  <Patente size="sm">{v.patente}</Patente>
                </button>
              ))}
            </div>
          )}
          {vehiculos && vehiculos.length === 1 && vehiculo && (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Patente size="sm">{vehiculo.patente}</Patente>
              {vehiculo.marca} {vehiculo.modelo}
            </p>
          )}

          {!items && (
            <p className="text-muted-foreground text-sm">
              Completá los renglones (qué se hizo, cantidad y precio) para poder
              enviarlo o guardarlo.
            </p>
          )}

          {items ? (
            <BotonWhatsApp
              telefono={cliente.telefono}
              mensaje={mensajeDetalle(
                {
                  nombre: cliente.nombre,
                  marca: vehiculo?.marca ?? '',
                  modelo: vehiculo?.modelo ?? '',
                  patente: vehiculo?.patente ?? '',
                  taller: taller?.nombre ?? 'el taller',
                },
                items,
              )}
              texto="Enviar detalle por WhatsApp"
              variant="default"
              className="h-11 text-base"
            />
          ) : (
            <Button disabled className="h-11">
              <MessageCircle /> Enviar detalle por WhatsApp
            </Button>
          )}

          <GuardarEnServicio
            hayVehiculo={!!vehiculo}
            patente={vehiculo?.patente}
            abiertos={abiertos}
            ingresoId={ingreso?.id}
            onElegirIngreso={setIngresoId}
            puedeGuardar={!!items && !!ingreso && !guardar.isPending}
            guardando={guardar.isPending}
            onGuardar={guardarEnServicio}
          />
          {error && (
            <p className="text-destructive text-sm">
              No pudimos guardar el servicio. Probá de nuevo.
            </p>
          )}
        </>
      )}
    </section>
  )
}

function GuardarEnServicio(props: {
  hayVehiculo: boolean
  patente: string | undefined
  abiertos: Tables<'servicios'>[]
  ingresoId: string | undefined
  onElegirIngreso: (id: string) => void
  puedeGuardar: boolean
  guardando: boolean
  onGuardar: () => void
}) {
  if (!props.hayVehiculo) {
    return (
      <p className="text-muted-foreground text-sm">
        Elegí un auto para poder guardarlo como servicio.
      </p>
    )
  }
  if (props.abiertos.length === 0) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p>
          Este auto no tiene un ingreso abierto en el taller. Para guardarle
          servicios primero hay que recibirlo.
        </p>
        <Button asChild variant="outline">
          <Link to={`/recibir?patente=${props.patente}`}>Recibir vehículo</Link>
        </Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {props.abiertos.length > 1 && (
        <>
          <p className="text-sm font-medium">
            Tiene {props.abiertos.length} ingresos abiertos. ¿A cuál?
          </p>
          {props.abiertos.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => props.onElegirIngreso(s.id)}
              className={cn(
                'rounded-lg border p-3 text-left text-sm',
                s.id === props.ingresoId && 'border-primary bg-muted',
              )}
            >
              <span className="font-medium">
                {formatearFecha(s.fecha_ingreso)}
              </span>
              <span className="text-muted-foreground block">
                {s.motivo_ingreso} · {etiquetaEstado(s.estado)}
              </span>
            </button>
          ))}
        </>
      )}
      <Button
        variant="outline"
        className="h-11"
        disabled={!props.puedeGuardar}
        onClick={props.onGuardar}
      >
        <Save />
        {props.guardando ? 'Guardando...' : 'Guardar como servicio'}
      </Button>
    </div>
  )
}
