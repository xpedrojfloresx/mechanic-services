import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { useGuardarVehiculo } from '@/features/vehiculos/api'
import {
  esPatenteValida,
  normalizarPatente,
} from '@/features/vehiculos/patente'
import type { Tables } from '@/lib/database.types'

const anioMaximo = new Date().getFullYear() + 1

const schema = z.object({
  patente: z
    .string()
    .trim()
    .refine(esPatenteValida, 'Patente inválida. Formatos: ABC123 o AB123CD'),
  marca: z.string().trim().min(1, 'Ingresá la marca'),
  modelo: z.string().trim().min(1, 'Ingresá el modelo'),
  anio: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (/^\d{4}$/.test(v) && +v >= 1900 && +v <= anioMaximo),
      'Año inválido',
    ),
  color: z.string().trim(),
})

type FormValues = z.infer<typeof schema>

type VehiculoFormProps = {
  clienteId: string
  vehiculo?: Tables<'vehiculos'>
}

export function VehiculoForm({ clienteId, vehiculo }: VehiculoFormProps) {
  const navigate = useNavigate()
  const { data: usuario } = useUsuarioActual()
  const guardar = useGuardarVehiculo(usuario?.taller_id)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patente: vehiculo?.patente ?? '',
      marca: vehiculo?.marca ?? '',
      modelo: vehiculo?.modelo ?? '',
      anio: vehiculo?.anio?.toString() ?? '',
      color: vehiculo?.color ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    setErrorGeneral(null)
    try {
      const guardado = await guardar.mutateAsync({
        id: vehiculo?.id,
        values: {
          cliente_id: clienteId,
          patente: normalizarPatente(values.patente),
          marca: values.marca,
          modelo: values.modelo,
          anio: values.anio ? Number(values.anio) : null,
          color: values.color || null,
        },
      })
      navigate(`/vehiculos/${guardado.id}`, { replace: true })
    } catch (error) {
      console.error('Error al guardar el vehículo:', error)
      // 23505 = violación de unicidad (patente repetida en el taller)
      const esDuplicada =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code === '23505'
          : false
      setErrorGeneral(
        esDuplicada
          ? 'Ya existe un vehículo con esa patente.'
          : 'No pudimos guardar el vehículo. Probá de nuevo.',
      )
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex max-w-md flex-col gap-4"
      noValidate
    >
      <FormField id="patente" label="Patente" error={errors.patente?.message}>
        <Input
          id="patente"
          autoComplete="off"
          className="uppercase"
          {...register('patente')}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField id="marca" label="Marca" error={errors.marca?.message}>
          <Input id="marca" autoComplete="off" {...register('marca')} />
        </FormField>
        <FormField id="modelo" label="Modelo" error={errors.modelo?.message}>
          <Input id="modelo" autoComplete="off" {...register('modelo')} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="anio"
          label="Año (opcional)"
          error={errors.anio?.message}
        >
          <Input
            id="anio"
            inputMode="numeric"
            autoComplete="off"
            {...register('anio')}
          />
        </FormField>
        <FormField
          id="color"
          label="Color (opcional)"
          error={errors.color?.message}
        >
          <Input id="color" autoComplete="off" {...register('color')} />
        </FormField>
      </div>

      {errorGeneral && (
        <p className="text-destructive text-sm">{errorGeneral}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
