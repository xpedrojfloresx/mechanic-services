import { useParams } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useServicio } from '@/features/servicios/api'
import { IngresoForm } from '@/features/servicios/components/ingreso-form'

export function ServicioEditarPage() {
  const { id } = useParams()
  const { data: servicio, isLoading } = useServicio(id)

  if (isLoading) return <Skeleton className="h-64 w-full max-w-md" />
  if (!servicio) {
    return (
      <p className="text-destructive text-sm">No encontramos el servicio.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Editar ingreso</h1>
      <IngresoForm vehiculoId={servicio.vehiculo_id} servicio={servicio} />
    </div>
  )
}
