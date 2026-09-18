import { Link } from 'react-router'
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
          <Link to="/clientes/nuevo">Nuevo cliente</Link>
        </Button>
      </div>

      {isLoading && <Skeleton className="h-16 w-full" />}
      {isError && (
        <p className="text-destructive text-sm">
          No pudimos cargar los clientes. Probá de nuevo.
        </p>
      )}
      {clientes?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Todavía no cargaste ningún cliente.
        </p>
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
