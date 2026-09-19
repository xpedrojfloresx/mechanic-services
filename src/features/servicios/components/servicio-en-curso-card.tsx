import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Patente } from '@/components/patente'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  useActualizarServicio,
  useCerrarServicios,
  type useServicios,
} from '@/features/servicios/api'
import {
  estaDemorado,
  etiquetaEstado,
  siguienteEstado,
  valoresCambioEstado,
} from '@/features/servicios/estados'
import { useTallerActual } from '@/features/auth/hooks/use-taller-actual'
import { proponerProximoServicio } from '@/features/recordatorios/proponer-proximo'
import { BotonWhatsApp } from '@/features/whatsapp/components/boton-whatsapp'
import { enlaceWhatsApp, mensajeServicio } from '@/features/whatsapp/whatsapp'
import { diasDesde, haceCuanto } from '@/lib/formato'
import { cn } from '@/lib/utils'

type Servicio = NonNullable<ReturnType<typeof useServicios>['data']>[number]

// Recordar en este celular a quién ya se le avisó que el auto está listo (no se
// guarda en la base: es solo un recordatorio para no ofrecer el aviso dos veces).
const claveAvisado = (id: string) => `avisado-listo:${id}`

function yaSeAvisoListo(id: string) {
  try {
    return localStorage.getItem(claveAvisado(id)) === '1'
  } catch {
    return false
  }
}

// Tarjeta de un auto que está en el taller: toca para ver el detalle, o
// avanza el estado con un solo botón (En taller -> Listo -> Entregado).
// Si lleva muchos días, pregunta si ya se entregó (es fácil olvidarse de
// marcarlo).
export function ServicioEnCursoCard({ servicio }: { servicio: Servicio }) {
  const actualizar = useActualizarServicio()
  const cerrar = useCerrarServicios()
  const { data: taller } = useTallerActual()
  const [error, setError] = useState(false)
  const [sigueAca, setSigueAca] = useState(false)
  const [avisado, setAvisado] = useState(() => yaSeAvisoListo(servicio.id))
  const siguiente = siguienteEstado(servicio.estado)
  const v = servicio.vehiculos
  const dias = diasDesde(servicio.fecha_ingreso)
  const preguntar = !sigueAca && estaDemorado(servicio.estado, dias)
  const mensaje = mensajeServicio(
    {
      nombre: v?.clientes?.nombre ?? '',
      marca: v?.marca ?? '',
      modelo: v?.modelo ?? '',
      patente: v?.patente ?? '',
      taller: taller?.nombre ?? 'el taller',
    },
    servicio.estado,
  )
  // Cuando queda listo y todavía no se avisó, el aviso pasa a ser el botón grande.
  const ofrecerAviso =
    servicio.estado === 'listo' &&
    !avisado &&
    enlaceWhatsApp(v?.clientes?.telefono ?? null, mensaje) !== null

  function marcarAvisado() {
    setAvisado(true)
    try {
      localStorage.setItem(claveAvisado(servicio.id), '1')
    } catch {
      // Sin almacenamiento: el botón vuelve a aparecer, no pasa nada grave.
    }
  }

  function ofrecerProximo() {
    if (!servicio.vehiculo_id) return
    proponerProximoServicio({
      servicioId: servicio.id,
      vehiculoId: servicio.vehiculo_id,
      auto: `${v?.marca ?? ''} ${v?.modelo ?? ''} ${v?.patente ?? ''}`.trim(),
      km: servicio.km_al_ingreso,
    })
  }

  async function avanzar() {
    if (!siguiente) return
    setError(false)
    try {
      await actualizar.mutateAsync({
        id: servicio.id,
        values: valoresCambioEstado(siguiente.valor, servicio.fecha_entrega),
      })
      if (siguiente.valor === 'entregado') ofrecerProximo()
    } catch (e) {
      console.error('Error al avanzar el estado:', e)
      setError(true)
    }
  }

  async function yaSeEntrego() {
    setError(false)
    try {
      await cerrar.mutateAsync([servicio.id])
      ofrecerProximo()
    } catch (e) {
      console.error('Error al marcar como entregado:', e)
      setError(true)
    }
  }

  return (
    <Card className={preguntar ? 'gap-0 overflow-hidden pb-0' : undefined}>
      <CardContent
        className={cn(
          'flex items-center justify-between gap-3',
          preguntar && 'pb-4',
        )}
      >
        <Link to={`/servicios/${servicio.id}`} className="min-w-0 flex-1">
          <p className="truncate font-medium">{v?.clientes?.nombre}</p>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <Patente size="sm">{v?.patente}</Patente>
            {v?.marca} {v?.modelo}
          </p>
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {haceCuanto(servicio.fecha_ingreso)}
            {servicio.motivo_ingreso && ` · ${servicio.motivo_ingreso}`} ·{' '}
            <Badge variant="outline">{etiquetaEstado(servicio.estado)}</Badge>
          </p>
          {error && (
            <p className="text-destructive text-xs">
              No pudimos guardar el cambio. Probá de nuevo.
            </p>
          )}
        </Link>
        {!ofrecerAviso && (
          <BotonWhatsApp
            soloIcono
            variant="ghost"
            telefono={v?.clientes?.telefono}
            mensaje={mensaje}
          />
        )}
        {siguiente && (
          <Button
            size="sm"
            disabled={actualizar.isPending || cerrar.isPending}
            onClick={avanzar}
          >
            {siguiente.boton}
          </Button>
        )}
      </CardContent>

      {ofrecerAviso && (
        <div className={cn('px-4', preguntar && 'pb-4')}>
          <BotonWhatsApp
            variant="default"
            className="h-11 w-full text-base"
            telefono={v?.clientes?.telefono}
            mensaje={mensaje}
            texto="Avisar que está listo"
            onClick={marcarAvisado}
          />
        </div>
      )}

      {preguntar && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-amber-500/10 px-4 py-3 text-sm">
          <p className="text-amber-700 dark:text-amber-400">
            Hace {dias} días que está acá. ¿Ya se entregó?
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={cerrar.isPending} onClick={yaSeEntrego}>
              Ya se entregó
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSigueAca(true)}
            >
              Sigue acá
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
