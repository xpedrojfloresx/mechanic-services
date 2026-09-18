import { Link, useParams, useSearchParams } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useVehiculo } from '@/features/vehiculos/api'
import { VehiculoForm } from '@/features/vehiculos/components/vehiculo-form'

export function VehiculoFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { data: vehiculo, isLoading, isError } = useVehiculo(id)

  if (id && isLoading) return <Skeleton className="h-64 w-full max-w-md" />
  if (id && (isError || !vehiculo)) {
    return (
      <p className="text-destructive text-sm">No encontramos el vehículo.</p>
    )
  }

  // El vehículo siempre pertenece a un cliente: al editar viene del registro,
  // al crear viene del parámetro ?cliente=
  const clienteId = vehiculo?.cliente_id ?? searchParams.get('cliente')

  if (!clienteId) {
    return (
      <p className="text-sm">
        Para agregar un vehículo primero elegí un cliente desde{' '}
        <Link to="/clientes" className="underline underline-offset-4">
          la lista de clientes
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        {id ? 'Editar vehículo' : 'Nuevo vehículo'}
      </h1>
      <VehiculoForm
        key={id ?? 'nuevo'}
        clienteId={clienteId}
        vehiculo={vehiculo}
      />
    </div>
  )
}
