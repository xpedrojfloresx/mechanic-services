import {
  Bell,
  CarFront,
  CircleCheck,
  Clock,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { useRecordatorios } from '@/features/recordatorios/api'
import { RecordatorioCard } from '@/features/recordatorios/components/recordatorio-card'
import { useServicios } from '@/features/servicios/api'
import { hoyLocal } from '@/features/servicios/schema'
import { ServicioEnCursoCard } from '@/features/servicios/components/servicio-en-curso-card'
import { cn } from '@/lib/utils'

function saludoSegunHora(hora: number) {
  if (hora >= 6 && hora < 13) return 'Buenos días'
  if (hora >= 13 && hora < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

// Inicio pensado para el mecánico: saludo, accesos de un toque con lo que hay
// que atender hoy, y la lista de lo que está en el taller. Los números y
// gráficos van en Insights.
export function HomePage() {
  const { data: usuario } = useUsuarioActual()
  const enCurso = useServicios('en_curso')
  const recordatorios = useRecordatorios('pendiente')
  const hoy = hoyLocal()
  // Para avisar: los vencidos y los que caen dentro de este mes.
  const finDeMes = hoy.slice(0, 7) + '-31'
  const paraAvisar = (recordatorios.data ?? []).filter(
    (r) => r.fecha_estimada <= finDeMes,
  )
  const servicios = enCurso.data
  const enTaller = servicios?.filter((s) => s.estado === 'en_taller').length
  const listos = servicios?.filter((s) => s.estado === 'listo').length
  // Prometidos para hoy o para un día que ya pasó, y que siguen en el taller.
  const paraHoy = servicios?.filter(
    (s) => s.fecha_prometida !== null && s.fecha_prometida <= hoy,
  ).length
  const nombre = usuario?.nombre

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {saludoSegunHora(new Date().getHours())}
          {nombre ? `, ${nombre}` : ''}
        </h1>
        {usuario && !nombre && (
          <Link
            to="/perfil"
            className="text-muted-foreground text-sm underline underline-offset-4"
          >
            Agregá tu nombre
          </Link>
        )}
      </div>

      <section className="flex flex-col gap-3" aria-label="Accesos rápidos">
        <Button asChild size="lg" className="h-14 text-base">
          <Link to="/recibir">
            <CarFront className="size-5" /> Recibir vehículo
          </Link>
        </Button>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Acceso
            to="/servicios"
            icono={Wrench}
            valor={enTaller}
            texto="En taller"
          />
          <Acceso
            to="/servicios"
            icono={CircleCheck}
            valor={listos}
            texto="Listos para entregar"
          />
          <Acceso
            to="/servicios"
            icono={Clock}
            valor={paraHoy}
            texto="Prometidos para hoy"
            alerta={!!paraHoy}
          />
          <Acceso
            to="/recordatorios"
            icono={Bell}
            valor={recordatorios.data ? paraAvisar.length : undefined}
            texto="Para avisar"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/clientes/nuevo">
              <UserPlus /> Nuevo cliente
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/recordatorios/nuevo">
              <Bell /> Nuevo recordatorio
            </Link>
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">
          En el taller ahora
          {servicios && (
            <span className="text-muted-foreground font-normal">
              {' '}
              ({servicios.length})
            </span>
          )}
        </h2>
        {enCurso.isLoading && <Skeleton className="h-20 w-full" />}
        {enCurso.isError && !servicios && (
          <p className="text-destructive text-sm">
            No pudimos cargar los vehículos. Probá de nuevo.
          </p>
        )}
        {servicios?.length === 0 && (
          <EmptyState
            icon={CarFront}
            titulo="No hay vehículos en el taller"
            texto="Cuando llegue uno, tocá Recibir vehículo y aparece acá."
          />
        )}
        {servicios?.map((s) => (
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
    </div>
  )
}

// Acceso de un toque: un número grande y qué es. En ámbar si hay algo urgente.
function Acceso(props: {
  to: string
  icono: LucideIcon
  valor: number | undefined
  texto: string
  alerta?: boolean
}) {
  const Icono = props.icono
  return (
    <Link
      to={props.to}
      className={cn(
        'bg-card hover:bg-muted/50 flex min-h-20 flex-col justify-between gap-2 rounded-xl border p-3',
        props.alerta && 'border-amber-500/50 bg-amber-500/10',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl leading-none font-semibold">
          {props.valor ?? '-'}
        </span>
        <Icono
          aria-hidden
          className={cn(
            'text-muted-foreground size-5',
            props.alerta && 'text-amber-700 dark:text-amber-400',
          )}
        />
      </div>
      <span className="text-muted-foreground text-sm">{props.texto}</span>
    </Link>
  )
}
