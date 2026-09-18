import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useServiciosDeVehiculo } from '@/features/servicios/api'
import { etiquetaEstado } from '@/features/servicios/estados'
import { useVehiculo } from '@/features/vehiculos/api'
import { formatearFecha } from '@/lib/formato'

export function VehiculoDetallePage() {
  const { id } = useParams()
  const { data: vehiculo, isLoading, isError } = useVehiculo(id)
  const { data: servicios } = useServiciosDeVehiculo(id)

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError || !vehiculo) {
    return (
      <p className="text-destructive text-sm">No encontramos el vehículo.</p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Badge className="font-mono text-base">{vehiculo.patente}</Badge>
            {vehiculo.marca} {vehiculo.modelo}
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to={`/vehiculos/${vehiculo.id}/editar`}>Editar</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Año: </span>
            {vehiculo.anio ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Color: </span>
            {vehiculo.color || '—'}
          </p>
          {vehiculo.clientes && (
            <p>
              <span className="text-muted-foreground">Cliente: </span>
              <Link
                to={`/clientes/${vehiculo.clientes.id}`}
                className="underline underline-offset-4"
              >
                {vehiculo.clientes.nombre}
              </Link>
              {vehiculo.clientes.telefono && ` · ${vehiculo.clientes.telefono}`}
            </p>
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Historial de servicios</h2>
          <Button asChild size="sm">
            <Link to={`/vehiculos/${vehiculo.id}/ingreso`}>Nuevo ingreso</Link>
          </Button>
        </div>
        {servicios?.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Todavía no hay servicios registrados para este vehículo.
          </p>
        )}
        {servicios?.map((s) => (
          <Link key={s.id} to={`/servicios/${s.id}`}>
            <Card className="hover:bg-muted/50">
              <CardContent className="flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {formatearFecha(s.fecha_ingreso)}{' '}
                    <Badge variant="outline">{etiquetaEstado(s.estado)}</Badge>
                  </p>
                  <p className="text-muted-foreground">
                    {s.km_al_ingreso.toLocaleString('es-AR')} km
                  </p>
                </div>
                {s.motivo_ingreso && (
                  <p>
                    <span className="text-muted-foreground">Motivo: </span>
                    {s.motivo_ingreso}
                  </p>
                )}
                {s.estado_al_ingreso && (
                  <p>
                    <span className="text-muted-foreground">Llegó: </span>
                    {s.estado_al_ingreso}
                  </p>
                )}
                {s.observaciones && (
                  <p>
                    <span className="text-muted-foreground">Obs.: </span>
                    {s.observaciones}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
