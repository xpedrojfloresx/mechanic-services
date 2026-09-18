import { Link } from 'react-router'
import { Users } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useClientes } from '@/features/clientes/api'

export function ClientesPage() {
  const { data: clientes, isLoading, isError } = useClientes()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Button asChild size="sm">
          <Link to="/recibir">Recibir vehículo</Link>
        </Button>
      </div>

      {isLoading && <Skeleton className="h-16 w-full" />}
      {isError && !clientes && (
        <p className="text-destructive text-sm">
          No pudimos cargar los clientes. Probá de nuevo.
        </p>
      )}
      {clientes?.length === 0 && (
        <EmptyState
          icon={Users}
          titulo="Todavía no cargaste ningún cliente"
          texto="Los clientes se crean al recibir su vehículo."
        >
          <Button asChild size="sm">
            <Link to="/recibir">Recibir vehículo</Link>
          </Button>
        </EmptyState>
      )}
      {clientes?.map((c) => (
        <Link key={c.id} to={`/clientes/${c.id}`}>
          <Card className="hover:bg-muted/50">
            <CardContent className="flex items-center justify-between gap-2">
              <p className="font-medium">{c.nombre}</p>
              <p className="text-muted-foreground text-sm">{c.telefono}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
