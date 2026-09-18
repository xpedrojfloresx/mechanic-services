import { useFormContext } from 'react-hook-form'
import { FormField } from '@/components/form-field'
import { Input } from '@/components/ui/input'
import type { VehiculoValues } from '@/features/vehiculos/schema'

// Campos del vehículo. Se usa dentro de un formulario cuyo esquema tiene
// una clave `vehiculo`.
export function VehiculoFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<{ vehiculo: VehiculoValues }>()
  const e = errors.vehiculo

  return (
    <div className="flex flex-col gap-4">
      <FormField id="v-patente" label="Patente" error={e?.patente?.message}>
        <Input
          id="v-patente"
          autoComplete="off"
          className="uppercase"
          {...register('vehiculo.patente')}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="v-marca" label="Marca" error={e?.marca?.message}>
          <Input
            id="v-marca"
            autoComplete="off"
            {...register('vehiculo.marca')}
          />
        </FormField>
        <FormField id="v-modelo" label="Modelo" error={e?.modelo?.message}>
          <Input
            id="v-modelo"
            autoComplete="off"
            {...register('vehiculo.modelo')}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="v-anio" label="Año (opcional)" error={e?.anio?.message}>
          <Input
            id="v-anio"
            inputMode="numeric"
            autoComplete="off"
            {...register('vehiculo.anio')}
          />
        </FormField>
        <FormField
          id="v-color"
          label="Color (opcional)"
          error={e?.color?.message}
        >
          <Input
            id="v-color"
            autoComplete="off"
            {...register('vehiculo.color')}
          />
        </FormField>
      </div>
    </div>
  )
}
