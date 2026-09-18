import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCliente } from '@/features/clientes/api'
import { useVehiculosDeCliente } from '@/features/vehiculos/api'

export function ClienteDetallePage() {
  const { id } = useParams()
  const { data: cliente, isLoading, isError } = useCliente(id)
  const { data: vehiculos } = useVehiculosDeCliente(id)

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError || !cliente) {
    return (
      <p className="text-destructive text-sm">No encontramos el cliente.</p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-xl">{cliente.nombre}</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to={`/clientes/${cliente.id}/editar`}>Editar</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Teléfono: </span>
            {cliente.telefono || '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {cliente.email || '—'}
          </p>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Vehículos</h2>
          <Button asChild size="sm">
            <Link to={`/vehiculos/nuevo?cliente=${cliente.id}`}>
              Agregar vehículo
            </Link>
          </Button>
        </div>
        {vehiculos?.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Este cliente todavía no tiene vehículos.
          </p>
        )}
        {vehiculos?.map((v) => (
          <Link key={v.id} to={`/vehiculos/${v.id}`}>
            <Card className="hover:bg-muted/50">
              <CardContent className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {v.marca} {v.modelo}
                </p>
                <Badge variant="secondary" className="font-mono">
                  {v.patente}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
