import { CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRecordatoriosDeVehiculo } from '@/features/recordatorios/api'
import { RecordatorioCard } from '@/features/recordatorios/components/recordatorio-card'
import { RecordatorioForm } from '@/features/recordatorios/components/recordatorio-form'

// Recordatorios pendientes de un vehículo + botón para programar uno nuevo
// (típico al terminar un trabajo: "cambio de aceite dentro de 6 meses").
export function ProximosServicios(props: {
  vehiculoId: string
  kmReferencia?: number
}) {
  const { data } = useRecordatoriosDeVehiculo(props.vehiculoId)
  const [abierto, setAbierto] = useState(false)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Próximos servicios</h2>

      {data?.length === 0 && !abierto && (
        <p className="text-muted-foreground text-sm">
          No hay nada programado para este vehículo.
        </p>
      )}
      {data?.map((r) => (
        <RecordatorioCard key={r.id} recordatorio={r} mostrarVehiculo={false} />
      ))}

      {abierto ? (
        <RecordatorioForm
          vehiculoId={props.vehiculoId}
          kmReferencia={props.kmReferencia}
          onGuardado={() => setAbierto(false)}
          onCancelar={() => setAbierto(false)}
        />
      ) : (
        <Button variant="outline" onClick={() => setAbierto(true)}>
          <CalendarClock /> Programar próximo servicio
        </Button>
      )}
    </section>
  )
}
