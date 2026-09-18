import { Link, useParams } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { IngresoForm } from '@/features/servicios/components/ingreso-form'
import { useVehiculo } from '@/features/vehiculos/api'

export function IngresoPage() {
  const { id } = useParams()
  const { data: vehiculo, isLoading, isError } = useVehiculo(id)

  if (isLoading) return <Skeleton className="h-64 w-full max-w-md" />
  if (isError || !vehiculo) {
    return (
      <p className="text-destructive text-sm">No encontramos el vehículo.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Nuevo ingreso</h1>
        <p className="text-muted-foreground text-sm">
          <Link
            to={`/vehiculos/${vehiculo.id}`}
            className="underline underline-offset-4"
          >
            {vehiculo.patente}
          </Link>{' '}
          · {vehiculo.marca} {vehiculo.modelo}
        </p>
      </div>
      <IngresoForm vehiculoId={vehiculo.id} />
    </div>
  )
}
