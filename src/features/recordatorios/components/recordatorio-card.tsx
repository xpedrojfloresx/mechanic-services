import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTallerActual } from '@/features/auth/hooks/use-taller-actual'
import {
  useEliminarRecordatorio,
  useMarcarRecordatorio,
  type useRecordatorios,
} from '@/features/recordatorios/api'
import { BotonWhatsApp } from '@/features/whatsapp/components/boton-whatsapp'
import { mensajeRecordatorio } from '@/features/whatsapp/whatsapp'
import { formatearFecha, formatoNumero } from '@/lib/formato'

type Recordatorio = NonNullable<
  ReturnType<typeof useRecordatorios>['data']
>[number]

// Un recordatorio pendiente: qué es, de quién, para cuándo, con un toque para
// marcarlo como hecho o avisarle al cliente por WhatsApp.
export function RecordatorioCard({
  recordatorio: r,
  mostrarVehiculo = true,
}: {
  recordatorio: Recordatorio
  mostrarVehiculo?: boolean
}) {
  const marcar = useMarcarRecordatorio()
  const eliminar = useEliminarRecordatorio()
  const { data: taller } = useTallerActual()
  const [error, setError] = useState(false)
  const v = r.vehiculos

  async function hacer(accion: () => Promise<unknown>) {
    setError(false)
    try {
      await accion()
    } catch (e) {
      console.error('Error en el recordatorio:', e)
      setError(true)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{r.nota ?? 'Próximo servicio'}</p>
            {mostrarVehiculo && v && (
              <Link
                to={`/vehiculos/${v.id}`}
                className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm"
              >
                <span>{v.clientes?.nombre}</span>
                <Badge variant="secondary" className="font-mono">
                  {v.patente}
                </Badge>
                {v.marca} {v.modelo}
              </Link>
            )}
            <p className="text-muted-foreground text-xs">
              {formatearFecha(r.fecha_estimada)}
              {r.target_km != null &&
                ` · a los ${formatoNumero.format(r.target_km)} km`}
            </p>
          </div>
          <BotonWhatsApp
            soloIcono
            variant="ghost"
            telefono={v?.clientes?.telefono}
            mensaje={mensajeRecordatorio(
              {
                nombre: v?.clientes?.nombre ?? '',
                marca: v?.marca ?? '',
                modelo: v?.modelo ?? '',
                patente: v?.patente ?? '',
                taller: taller?.nombre ?? 'el taller',
              },
              {
                nota: r.nota ?? 'un servicio',
                fechaEstimada: r.fecha_estimada,
                targetKm: r.target_km,
              },
            )}
          />
        </div>
        {error && (
          <p className="text-destructive text-xs">
            No pudimos guardar el cambio. Probá de nuevo.
          </p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={marcar.isPending}
            onClick={() =>
              hacer(() => marcar.mutateAsync({ id: r.id, estado: 'hecho' }))
            }
          >
            Hecho
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            disabled={eliminar.isPending}
            onClick={() => hacer(() => eliminar.mutateAsync(r.id))}
          >
            Quitar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
