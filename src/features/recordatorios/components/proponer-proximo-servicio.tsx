import { useState } from 'react'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTallerActual } from '@/features/auth/hooks/use-taller-actual'
import {
  useCrearRecordatorio,
  useRecordatoriosDeVehiculo,
} from '@/features/recordatorios/api'
import { sumarMeses } from '@/features/recordatorios/fechas'
import {
  cerrarPropuestaProximo,
  usePropuestaProximo,
} from '@/features/recordatorios/proponer-proximo'
import { useItems } from '@/features/servicios/api'
import { hoyLocal } from '@/features/servicios/schema'
import { formatoNumero } from '@/lib/formato'

const PLAZOS = [
  { meses: 3, texto: '3 meses' },
  { meses: 6, texto: '6 meses' },
  { meses: 12, texto: '1 año' },
]

// Al entregar un vehículo se ofrece dejar programado el próximo servicio con
// un toque. Está montado una sola vez en el layout (ver proponer-proximo.ts).
export function ProponerProximoServicio() {
  const propuesta = usePropuestaProximo()
  // key: al cambiar de propuesta se reinicia el error sin efectos.
  return propuesta ? (
    <Cartel key={propuesta.servicioId} propuesta={propuesta} />
  ) : null
}

function Cartel({
  propuesta,
}: {
  propuesta: NonNullable<ReturnType<typeof usePropuestaProximo>>
}) {
  const { data: taller } = useTallerActual()
  const { data: pendientes } = useRecordatoriosDeVehiculo(propuesta.vehiculoId)
  const { data: items } = useItems(propuesta.servicioId)
  const crear = useCrearRecordatorio(taller?.id)
  const [error, setError] = useState(false)
  const [km, setKm] = useState('')
  const [errorKm, setErrorKm] = useState('')

  // Si el auto ya tiene algo programado, no se ofrece otro.
  const abierto = pendientes !== undefined && pendientes.length === 0

  async function programar(meses: number) {
    setError(false)
    // Mismo criterio que el formulario de recordatorios: solo dígitos, hasta 3.000.000.
    const kmLimpio = km.trim()
    if (
      kmLimpio !== '' &&
      !(/^\d+$/.test(kmLimpio) && Number(kmLimpio) <= 3_000_000)
    ) {
      setErrorKm('Kilometraje inválido (solo números)')
      return
    }
    setErrorKm('')
    const nota =
      (items ?? [])
        .map((i) => i.descripcion)
        .join(', ')
        .slice(0, 120) || 'Próximo servicio'
    try {
      await crear.mutateAsync({
        vehiculoId: propuesta.vehiculoId,
        values: {
          nota,
          fechaEstimada: sumarMeses(hoyLocal(), meses),
          targetKm: kmLimpio === '' ? null : Number(kmLimpio),
        },
      })
      cerrarPropuestaProximo()
    } catch (e) {
      console.error('Error al programar el próximo servicio:', e)
      setError(true)
    }
  }

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(o) => !o && cerrarPropuestaProximo()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Programar el próximo servicio?</AlertDialogTitle>
          <AlertDialogDescription>
            {propuesta.auto} se entregó. Elegí en cuánto tiempo avisarle al
            cliente para que vuelva y, si querés, a qué kilometraje.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-destructive text-sm">
            No pudimos programarlo. Probá de nuevo.
          </p>
        )}
        <FormField
          id="prox-km"
          label="A los cuántos km (opcional)"
          error={errorKm}
        >
          <Input
            id="prox-km"
            inputMode="numeric"
            placeholder={`Ej: ${formatoNumero.format(propuesta.km + 10000)} (hoy ${formatoNumero.format(propuesta.km)})`}
            value={km}
            onChange={(e) => setKm(e.target.value)}
          />
        </FormField>
        <div className="grid grid-cols-3 gap-2">
          {PLAZOS.map((p) => (
            <Button
              key={p.meses}
              className="h-12"
              disabled={crear.isPending || !taller}
              onClick={() => programar(p.meses)}
            >
              {p.texto}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          disabled={crear.isPending}
          onClick={cerrarPropuestaProximo}
        >
          No, gracias
        </Button>
      </AlertDialogContent>
    </AlertDialog>
  )
}
