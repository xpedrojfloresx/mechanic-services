import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useVehiculo } from '@/features/vehiculos/api'

export function VehiculoDetallePage() {
  const { id } = useParams()
  const { data: vehiculo, isLoading, isError } = useVehiculo(id)

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
        <h2 className="font-semibold">Historial de servicios</h2>
        <p className="text-muted-foreground text-sm">
          Todavía no hay servicios registrados para este vehículo.
        </p>
      </section>
    </div>
  )
}
