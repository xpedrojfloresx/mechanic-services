import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useActualizarServicio,
  useEliminarServicio,
  useServicio,
} from '@/features/servicios/api'
import { ESTADOS, valoresCambioEstado } from '@/features/servicios/estados'
import { ItemsSection } from '@/features/servicios/components/items-section'
import { formatearFecha } from '@/lib/formato'

export function ServicioDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: servicio, isLoading, isError } = useServicio(id)
  const actualizar = useActualizarServicio()
  const eliminar = useEliminarServicio()
  const [error, setError] = useState<string | null>(null)

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError || !servicio) {
    return (
      <p className="text-destructive text-sm">No encontramos el servicio.</p>
    )
  }

  const vehiculo = servicio.vehiculos
  const cliente = vehiculo?.clientes

  async function cambiarEstado(estado: string) {
    if (!servicio || estado === servicio.estado) return
    setError(null)
    try {
      await actualizar.mutateAsync({
        id: servicio.id,
        values: valoresCambioEstado(estado, servicio.fecha_entrega),
      })
    } catch (e) {
      console.error('Error al cambiar el estado:', e)
      setError('No pudimos cambiar el estado. Probá de nuevo.')
    }
  }

  async function confirmarEliminar() {
    if (!servicio) return
    setError(null)
    try {
      await eliminar.mutateAsync(servicio.id)
      navigate(vehiculo ? `/vehiculos/${vehiculo.id}` : '/servicios', {
        replace: true,
      })
    } catch (e) {
      console.error('Error al eliminar el servicio:', e)
      setError('No pudimos eliminar el servicio. Probá de nuevo.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            {/* El cliente va primero y bien visible: es lo que se recuerda. */}
            {cliente && (
              <CardTitle className="text-xl">
                <Link
                  to={`/clientes/${cliente.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {cliente.nombre}
                </Link>
              </CardTitle>
            )}
            {cliente?.telefono && (
              <a
                href={`tel:${cliente.telefono}`}
                className="text-muted-foreground text-sm underline underline-offset-4"
              >
                {cliente.telefono}
              </a>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              {vehiculo && (
                <Link to={`/vehiculos/${vehiculo.id}`}>
                  <Badge className="font-mono">{vehiculo.patente}</Badge>
                </Link>
              )}
              {vehiculo?.marca} {vehiculo?.modelo}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/servicios/${servicio.id}/editar`}>Editar</Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                >
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este servicio?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminan también sus repuestos y mano de obra. Esta
                    acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={confirmarEliminar}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground">Estado del trabajo</p>
            <div className="flex flex-wrap gap-2">
              {ESTADOS.map((e) => (
                <Button
                  key={e.value}
                  size="sm"
                  variant={servicio.estado === e.value ? 'default' : 'outline'}
                  disabled={actualizar.isPending}
                  onClick={() => cambiarEstado(e.value)}
                >
                  {e.label}
                </Button>
              ))}
            </div>
          </div>
          {error && <p className="text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <ItemsSection servicioId={servicio.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del ingreso</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex flex-col gap-1">
            <p>
              <span className="text-muted-foreground">Ingreso: </span>
              {formatearFecha(servicio.fecha_ingreso)} ·{' '}
              {servicio.km_al_ingreso.toLocaleString('es-AR')} km
            </p>
            {servicio.fecha_entrega && (
              <p>
                <span className="text-muted-foreground">Entrega: </span>
                {formatearFecha(servicio.fecha_entrega)}
              </p>
            )}
            {servicio.motivo_ingreso && (
              <p>
                <span className="text-muted-foreground">Motivo: </span>
                {servicio.motivo_ingreso}
              </p>
            )}
            {servicio.estado_al_ingreso && (
              <p>
                <span className="text-muted-foreground">Llegó: </span>
                {servicio.estado_al_ingreso}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
