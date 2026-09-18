import { useFormContext } from 'react-hook-form'
import { FormField } from '@/components/form-field'
import { MasDatos } from '@/components/mas-datos'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { IngresoValues } from '@/features/servicios/schema'

// Campos del ingreso del vehículo. Se usa dentro de un formulario cuyo
// esquema tiene una clave `ingreso`. Lo único opcional es el estado; la fecha va plegada (modo ágil).
export function IngresoFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<{ ingreso: IngresoValues }>()
  const e = errors.ingreso

  return (
    <div className="flex flex-col gap-4">
      <FormField id="ingreso-km" label="Kilometraje" error={e?.km?.message}>
        <Input
          id="ingreso-km"
          inputMode="numeric"
          autoComplete="off"
          {...register('ingreso.km')}
        />
      </FormField>
      <FormField
        id="ingreso-motivo"
        label="Motivo de ingreso"
        error={e?.motivo?.message}
      >
        <Input
          id="ingreso-motivo"
          autoComplete="off"
          placeholder="Ej: cambio de aceite, ruido en frenos"
          {...register('ingreso.motivo')}
        />
      </FormField>
      <FormField
        id="ingreso-estado"
        label="Estado en que llegó el vehículo (opcional)"
        error={e?.estado?.message}
      >
        <Textarea
          id="ingreso-estado"
          rows={3}
          placeholder="Ej: rayón en puerta derecha, luz de check engine encendida"
          {...register('ingreso.estado')}
        />
      </FormField>
      <MasDatos conError={!!e?.fecha_ingreso}>
        <FormField
          id="ingreso-fecha"
          label="Fecha de ingreso (por defecto, hoy)"
          error={e?.fecha_ingreso?.message}
        >
          <Input
            id="ingreso-fecha"
            type="date"
            {...register('ingreso.fecha_ingreso')}
          />
        </FormField>
      </MasDatos>
    </div>
  )
}
