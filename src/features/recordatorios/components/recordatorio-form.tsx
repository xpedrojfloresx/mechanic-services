import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FormField } from '@/components/form-field'
import { MasDatos } from '@/components/mas-datos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { useCrearRecordatorio } from '@/features/recordatorios/api'
import { sumarMeses } from '@/features/recordatorios/fechas'
import {
  recordatorioSchema,
  type RecordatorioValues,
} from '@/features/recordatorios/schema'
import { hoyLocal } from '@/features/servicios/schema'
import { formatearFecha, formatoNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'

const ATAJOS = [
  { meses: 3, texto: '3 meses' },
  { meses: 6, texto: '6 meses' },
  { meses: 12, texto: '1 año' },
]

type Props = {
  vehiculoId: string
  // Km del ingreso, solo como referencia visual para pensar el km objetivo.
  kmReferencia?: number
  onGuardado: () => void
  onCancelar?: () => void
}

// Recordatorio de próximo servicio: qué hay que hacer, en cuánto tiempo (con
// atajos) y, si se quiere, a qué kilometraje. Como el km depende del uso, la
// fecha estimada la elige siempre el mecánico.
export function RecordatorioForm({
  vehiculoId,
  kmReferencia,
  onGuardado,
  onCancelar,
}: Props) {
  const { data: usuario } = useUsuarioActual()
  const crear = useCrearRecordatorio(usuario?.taller_id)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<RecordatorioValues>({
    resolver: zodResolver(recordatorioSchema),
    defaultValues: { nota: '', fecha: sumarMeses(hoyLocal(), 6), km: '' },
  })
  const fecha = useWatch({ control, name: 'fecha' })

  async function onSubmit(v: RecordatorioValues) {
    setError(null)
    try {
      await crear.mutateAsync({
        vehiculoId,
        values: {
          nota: v.nota,
          fechaEstimada: v.fecha,
          targetKm: v.km === '' ? null : Number(v.km),
        },
      })
      onGuardado()
    } catch (e) {
      console.error('Error al guardar el recordatorio:', e)
      setError('No pudimos guardar el recordatorio. Probá de nuevo.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <FormField
        id="rec-nota"
        label="¿Qué hay que hacer?"
        error={errors.nota?.message}
      >
        <Input
          id="rec-nota"
          autoComplete="off"
          placeholder="Ej: Cambio de aceite y filtro"
          {...register('nota')}
        />
      </FormField>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">¿Cuándo avisarle?</p>
        <div className="flex flex-wrap gap-2">
          {ATAJOS.map((a) => {
            const valor = sumarMeses(hoyLocal(), a.meses)
            return (
              <Button
                key={a.meses}
                type="button"
                size="sm"
                variant={fecha === valor ? 'default' : 'outline'}
                onClick={() =>
                  setValue('fecha', valor, { shouldValidate: true })
                }
              >
                En {a.texto}
              </Button>
            )
          })}
        </div>
        <p
          className={cn(
            'text-sm',
            errors.fecha ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {errors.fecha?.message ??
            (fecha ? `Fecha estimada: ${formatearFecha(fecha)}` : '')}
        </p>
      </div>

      <FormField
        id="rec-km"
        label="A los cuántos km (opcional)"
        error={errors.km?.message}
      >
        <Input
          id="rec-km"
          inputMode="numeric"
          autoComplete="off"
          placeholder={
            kmReferencia
              ? `Ej: ${formatoNumero.format(kmReferencia + 10000)} (hoy ${formatoNumero.format(kmReferencia)})`
              : 'Ej: 95000'
          }
          {...register('km')}
        />
      </FormField>

      <MasDatos titulo="Otra fecha" conError={!!errors.fecha}>
        <FormField id="rec-fecha" label="Fecha estimada">
          <Input id="rec-fecha" type="date" {...register('fecha')} />
        </FormField>
      </MasDatos>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando...' : 'Guardar recordatorio'}
        </Button>
        {onCancelar && (
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
