import { Plus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Patente } from '@/components/patente'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useServicios } from '@/features/servicios/api'
import { estaDemorado, etiquetaEstado } from '@/features/servicios/estados'
import { diasDesde, formatearFecha, haceCuanto } from '@/lib/formato'

type Filtro = 'en_curso' | 'entregado' | 'todos'

const textoVacio: Record<Filtro, { titulo: string; texto: string }> = {
  en_curso: {
    titulo: 'No hay vehículos en el taller',
    texto: 'Cuando recibas uno, aparece acá.',
  },
  entregado: {
    titulo: 'Todavía no hay vehículos entregados',
    texto: 'Al entregar un auto queda guardado acá.',
  },
  todos: {
    titulo: 'Todavía no hay servicios',
    texto: 'Recibí un vehículo para cargar el primero.',
  },
}

export function ServiciosPage() {
  // Abre en "En el taller": incluye los Listos, que todavía no se entregaron.
  const [filtro, setFiltro] = useState<Filtro>('en_curso')
  const { data: servicios, isLoading, isError } = useServicios(filtro)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Servicios</h1>
        <Button asChild>
          <Link to="/servicios/nuevo">
            <Plus /> Añadir servicio
          </Link>
        </Button>
      </div>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <TabsList>
          <TabsTrigger value="en_curso">En el taller</TabsTrigger>
          <TabsTrigger value="entregado">Entregados</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <Skeleton className="h-16 w-full" />}
      {isError && !servicios && (
        <p className="text-destructive text-sm">
          No pudimos cargar los servicios. Probá de nuevo.
        </p>
      )}
      {servicios?.length === 0 && (
        <EmptyState
          icon={Wrench}
          titulo={textoVacio[filtro].titulo}
          texto={textoVacio[filtro].texto}
        />
      )}
      {servicios?.map((s) => {
        const demorado =
          s.estado !== 'entregado' &&
          estaDemorado(s.estado, diasDesde(s.fecha_ingreso))
        return (
          <Link key={s.id} to={`/servicios/${s.id}`}>
            <Card className="hover:bg-muted/50">
              <CardContent className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {/* El cliente va primero: es lo que el mecánico recuerda. */}
                  <p className="truncate font-medium">
                    {s.vehiculos?.clientes?.nombre}
                  </p>
                  <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                    <Patente size="sm">{s.vehiculos?.patente}</Patente>
                    {s.vehiculos?.marca} {s.vehiculos?.modelo}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {formatearFecha(s.fecha_ingreso)} ·{' '}
                    {haceCuanto(s.fecha_ingreso)}
                    {s.motivo_ingreso && ` · ${s.motivo_ingreso}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="outline">{etiquetaEstado(s.estado)}</Badge>
                  {demorado && (
                    <span className="text-xs font-medium text-amber-600">
                      ¿Ya se entregó?
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
