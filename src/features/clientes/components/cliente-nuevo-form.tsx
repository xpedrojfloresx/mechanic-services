import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  esTelefonoValido,
  normalizarTelefono,
} from '@/features/clientes/telefono'
import { useCrearClienteCompleto } from '@/features/servicios/api'
import { IngresoFields } from '@/features/servicios/components/ingreso-fields'
import {
  ingresoAInput,
  ingresoSchema,
  ingresoVacio,
} from '@/features/servicios/schema'
import { VehiculoFields } from '@/features/vehiculos/components/vehiculo-fields'
import { normalizarPatente } from '@/features/vehiculos/patente'
import { vehiculoSchema } from '@/features/vehiculos/schema'

const schema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre'),
  telefono: z
    .string()
    .trim()
    .refine(
      esTelefonoValido,
      'Teléfono inválido. Solo números, formato Argentina o Chile',
    ),
  email: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || z.email().safeParse(v).success,
      'Email inválido',
    ),
  vehiculo: vehiculoSchema,
  ingreso: ingresoSchema,
})

type FormValues = z.infer<typeof schema>

export function ClienteNuevoForm() {
  const navigate = useNavigate()
  const crear = useCrearClienteCompleto()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      telefono: '',
      email: '',
      vehiculo: { patente: '', marca: '', modelo: '', anio: '', color: '' },
      ingreso: ingresoVacio(),
    },
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = methods

  async function onSubmit(v: FormValues) {
    setErrorGeneral(null)
    try {
      const id = await crear.mutateAsync({
        cliente: {
          nombre: v.nombre,
          telefono: normalizarTelefono(v.telefono),
          email: v.email,
        },
        vehiculo: {
          ...v.vehiculo,
          patente: normalizarPatente(v.vehiculo.patente),
        },
        ingreso: ingresoAInput(v.ingreso),
      })
      navigate(`/clientes/${id}`, { replace: true })
    } catch (error) {
      console.error('Error al crear el cliente:', error)
      // 23505 = violación de unicidad (patente repetida en el taller)
      const duplicada =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code === '23505'
          : false
      setErrorGeneral(
        duplicada
          ? 'Ya existe un vehículo con esa patente. No se guardó nada.'
          : 'No pudimos guardar. Probá de nuevo.',
      )
    }
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex max-w-md flex-col gap-6"
        noValidate
      >
        <section className="flex flex-col gap-4">
          <h2 className="font-semibold">Cliente</h2>
          <FormField id="nombre" label="Nombre" error={errors.nombre?.message}>
            <Input id="nombre" autoComplete="off" {...register('nombre')} />
          </FormField>
          <FormField
            id="telefono"
            label="Teléfono / WhatsApp"
            error={errors.telefono?.message}
          >
            <Input
              id="telefono"
              type="tel"
              autoComplete="off"
              {...register('telefono')}
            />
          </FormField>
          <FormField
            id="email"
            label="Email (opcional)"
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="off"
              {...register('email')}
            />
          </FormField>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-semibold">Vehículo</h2>
          <VehiculoFields />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-semibold">Ingreso del vehículo</h2>
          <IngresoFields />
        </section>

        {errorGeneral && (
          <p className="text-destructive text-sm">{errorGeneral}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={crear.isPending}>
            {crear.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
