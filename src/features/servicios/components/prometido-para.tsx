import { CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useActualizarServicio } from '@/features/servicios/api'
import {
  atajosPrometido,
  etiquetaPrometido,
  prometidoVencido,
} from '@/features/servicios/prometido'
import { cn } from '@/lib/utils'

// "¿Para cuándo?": la fecha que se le prometió al cliente. Un toque en el botón
// abre los atajos (Hoy, Mañana, En 2 días), una fecha a elección o quitarla.
export function PrometidoPara({
  servicioId,
  fecha,
  estado,
}: {
  servicioId: string
  fecha: string | null
  estado: string
}) {
  const actualizar = useActualizarServicio()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState(false)
  const vencido = prometidoVencido(fecha, estado)

  async function guardar(nueva: string | null) {
    setError(false)
    try {
      await actualizar.mutateAsync({
        id: servicioId,
        values: { fecha_prometida: nueva },
      })
      setAbierto(false)
    } catch (e) {
      console.error('Error al guardar la fecha prometida:', e)
      setError(true)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          '-ml-2 h-8 w-fit px-2 text-xs',
          vencido && 'text-amber-700 dark:text-amber-400',
        )}
        onClick={() => setAbierto((a) => !a)}
      >
        <CalendarClock />
        {fecha
          ? `Prometido: ${etiquetaPrometido(fecha)}${vencido ? ' (vencido)' : ''}`
          : '¿Para cuándo?'}
      </Button>

      {abierto && (
        <div className="flex flex-wrap items-center gap-2">
          {atajosPrometido.map((a) => (
            <Button
              key={a.texto}
              size="sm"
              variant="outline"
              disabled={actualizar.isPending}
              onClick={() => guardar(a.fecha())}
            >
              {a.texto}
            </Button>
          ))}
          <Input
            type="date"
            aria-label="Elegir otra fecha"
            className="h-8 w-auto"
            value={fecha ?? ''}
            disabled={actualizar.isPending}
            onChange={(e) => e.target.value && guardar(e.target.value)}
          />
          {fecha && (
            <Button
              size="sm"
              variant="ghost"
              disabled={actualizar.isPending}
              onClick={() => guardar(null)}
            >
              Quitar
            </Button>
          )}
        </div>
      )}
      {error && (
        <p className="text-destructive text-xs">
          No pudimos guardar la fecha. Probá de nuevo.
        </p>
      )}
    </div>
  )
}
