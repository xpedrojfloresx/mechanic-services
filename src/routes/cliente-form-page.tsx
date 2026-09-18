import { useParams } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { ClienteForm } from '@/features/clientes/components/cliente-form'
import { ClienteNuevoForm } from '@/features/clientes/components/cliente-nuevo-form'
import { useCliente } from '@/features/clientes/api'

export function ClienteFormPage() {
  const { id } = useParams()
  const { data: cliente, isLoading } = useCliente(id)

  if (id && isLoading) return <Skeleton className="h-64 w-full max-w-md" />
  if (id && !cliente) {
    return (
      <p className="text-destructive text-sm">No encontramos el cliente.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        {id ? 'Editar cliente' : 'Nuevo cliente'}
      </h1>
      {id ? <ClienteForm key={id} cliente={cliente} /> : <ClienteNuevoForm />}
    </div>
  )
}
