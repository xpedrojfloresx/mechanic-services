import { CarFront } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useConteos } from '@/features/resumen/api'
import { useRecordatorios } from '@/features/recordatorios/api'
import { RecordatorioCard } from '@/features/recordatorios/components/recordatorio-card'
import { useServicios } from '@/features/servicios/api'
import { hoyLocal } from '@/features/servicios/schema'
import { ServicioEnCursoCard } from '@/features/servicios/components/servicio-en-curso-card'

// Inicio pensado para el mecánico: primero lo que hace todo el día (recibir un
// auto y ver qué hay en el taller); los números y gráficos van al final.
export function HomePage() {
  const enCurso = useServicios('en_curso')
  const conteos = useConteos()
  const recordatorios = useRecordatorios('pendiente')
  // Para avisar: los vencidos y los que caen dentro de este mes.
  const finDeMes = hoyLocal().slice(0, 7) + '-31'
  const paraAvisar = (recordatorios.data ?? []).filter(
    (r) => r.fecha_estimada <= finDeMes,
  )

  return (
    <div className="flex flex-col gap-8">
      <Button asChild size="lg" className="h-14 text-base">
        <Link to="/recibir">
          <CarFront className="size-5" /> Recibir vehículo
        </Link>
      </Button>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">
          En el taller ahora
          {enCurso.data && (
            <span className="text-muted-foreground font-normal">
              {' '}
              ({enCurso.data.length})
            </span>
          )}
        </h2>
        {enCurso.isLoading && <Skeleton className="h-20 w-full" />}
        {enCurso.isError && !enCurso.data && (
          <p className="text-destructive text-sm">
            No pudimos cargar los vehículos. Probá de nuevo.
          </p>
        )}
        {enCurso.data?.length === 0 && (
          <EmptyState
            icon={CarFront}
            titulo="No hay vehículos en el taller"
            texto="Cuando llegue uno, tocá Recibir vehículo y aparece acá."
          />
        )}
        {enCurso.data?.map((s) => (
          <ServicioEnCursoCard key={s.id} servicio={s} />
        ))}
      </section>

      {paraAvisar.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">
            Para avisar
            <span className="text-muted-foreground font-normal">
              {' '}
              ({paraAvisar.length})
            </span>
          </h2>
          {paraAvisar.slice(0, 3).map((r) => (
            <RecordatorioCard key={r.id} recordatorio={r} />
          ))}
          <Button asChild variant="ghost" size="sm">
            <Link to="/recordatorios">
              {paraAvisar.length > 3
                ? `Ver los ${paraAvisar.length} recordatorios`
                : 'Ver recordatorios'}
            </Link>
          </Button>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Resumen</h2>
        <div className="grid grid-cols-3 gap-3">
          <ResumenCard titulo="Clientes" valor={conteos.data?.clientes} />
          <ResumenCard titulo="Vehículos" valor={conteos.data?.vehiculos} />
          <ResumenCard titulo="En taller" valor={conteos.data?.enTaller} />
        </div>
      </section>
    </div>
  )
}

function ResumenCard(props: { titulo: string; valor: number | undefined }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-3xl font-semibold">{props.valor ?? '-'}</p>
        <p className="text-muted-foreground text-sm">{props.titulo}</p>
      </CardContent>
    </Card>
  )
}
