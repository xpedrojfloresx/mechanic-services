import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useServicios } from '@/features/servicios/api'
import {
  ESTADOS,
  etiquetaEstado,
  type Estado,
} from '@/features/servicios/estados'
import { formatearFecha } from '@/lib/formato'

export function ServiciosPage() {
  const [filtro, setFiltro] = useState<Estado | 'todos'>('en_taller')
  const { data: servicios, isLoading, isError } = useServicios(filtro)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Servicios</h1>

      <Tabs
        value={filtro}
        onValueChange={(v) => setFiltro(v as Estado | 'todos')}
      >
        <TabsList>
          {ESTADOS.map((e) => (
            <TabsTrigger key={e.value} value={e.value}>
              {e.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <Skeleton className="h-16 w-full" />}
      {isError && (
        <p className="text-destructive text-sm">
          No pudimos cargar los servicios. Probá de nuevo.
        </p>
      )}
      {servicios?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No hay servicios en este estado.
        </p>
      )}
      {servicios?.map((s) => (
        <Link key={s.id} to={`/servicios/${s.id}`}>
          <Card className="hover:bg-muted/50">
            <CardContent className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {s.vehiculos?.marca} {s.vehiculos?.modelo}
                  <Badge variant="secondary" className="ml-2 font-mono">
                    {s.vehiculos?.patente}
                  </Badge>
                </p>
                <p className="text-muted-foreground text-sm">
                  {s.vehiculos?.clientes?.nombre} ·{' '}
                  {formatearFecha(s.fecha_ingreso)}
                  {s.motivo_ingreso && ` · ${s.motivo_ingreso}`}
                </p>
              </div>
              <Badge variant="outline">{etiquetaEstado(s.estado)}</Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
