import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecordatorios } from '@/features/recordatorios/api'
import { RecordatorioCard } from '@/features/recordatorios/components/recordatorio-card'
import { hoyLocal } from '@/features/servicios/schema'

// Próximos servicios pendientes, agrupados por urgencia. Las fechas AAAA-MM-DD
// se comparan como texto (el orden alfabético coincide con el cronológico).
export function RecordatoriosPage() {
  const { data, isLoading, isError } = useRecordatorios('pendiente')
  const hoy = hoyLocal()
  const mes = hoy.slice(0, 7)

  const vencidos = data?.filter((r) => r.fecha_estimada < hoy) ?? []
  const esteMes =
    data?.filter(
      (r) => r.fecha_estimada >= hoy && r.fecha_estimada.slice(0, 7) === mes,
    ) ?? []
  const despues =
    data?.filter(
      (r) => r.fecha_estimada >= hoy && r.fecha_estimada.slice(0, 7) !== mes,
    ) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Recordatorios</h1>
        <Button asChild>
          <Link to="/recordatorios/nuevo">
            <Plus /> Nuevo recordatorio
          </Link>
        </Button>
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}
      {isError && (
        <p className="text-destructive text-sm">
          No pudimos cargar los recordatorios. Probá de nuevo.
        </p>
      )}
      {data?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No hay recordatorios pendientes. Se cargan desde un servicio
          (&quot;Programar próximo servicio&quot;), desde la ficha del vehículo
          o con el botón de arriba.
        </p>
      )}

      <Grupo titulo="Vencidos" urgente items={vencidos} />
      <Grupo titulo="Este mes" items={esteMes} />
      <Grupo titulo="Más adelante" items={despues} />
    </div>
  )
}

function Grupo(props: {
  titulo: string
  items: NonNullable<ReturnType<typeof useRecordatorios>['data']>
  urgente?: boolean
}) {
  if (props.items.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2
        className={
          props.urgente
            ? 'font-semibold text-amber-600'
            : 'text-muted-foreground text-sm font-medium'
        }
      >
        {props.titulo} ({props.items.length})
      </h2>
      {props.items.map((r) => (
        <RecordatorioCard key={r.id} recordatorio={r} />
      ))}
    </section>
  )
}
