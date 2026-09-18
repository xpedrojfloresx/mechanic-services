import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
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
import { normalizarPatente } from '@/features/vehiculos/patente'
import { vehiculoSchema } from '@/features/vehiculos/schema'

const schema = z
  .object({
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
    agregarVehiculo: z.boolean(),
    registrarIngreso: z.boolean(),
    // Sin reglas acá: solo se validan si su sección está activada (superRefine).
    vehiculo: z.object({
      patente: z.string(),
      marca: z.string(),
      modelo: z.string(),
      anio: z.string(),
      color: z.string(),
    }),
    ingreso: z.object({
      fecha_ingreso: z.string(),
      km: z.string(),
      motivo: z.string(),
      estado: z.string(),
      observaciones: z.string(),
    }),
  })
  .superRefine((datos, ctx) => {
    const validar = (
      resultado: { success: boolean; error?: z.ZodError },
      raiz: 'vehiculo' | 'ingreso',
    ) => {
      if (resultado.success || !resultado.error) return
      for (const issue of resultado.error.issues) {
        ctx.addIssue({
          code: 'custom',
          message: issue.message,
          path: [raiz, ...issue.path],
        })
      }
    }
    if (datos.agregarVehiculo) {
      validar(vehiculoSchema.safeParse(datos.vehiculo), 'vehiculo')
      if (datos.registrarIngreso) {
        validar(ingresoSchema.safeParse(datos.ingreso), 'ingreso')
      }
    }
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
      agregarVehiculo: false,
      registrarIngreso: false,
      vehiculo: { patente: '', marca: '', modelo: '', anio: '', color: '' },
      ingreso: ingresoVacio(),
    },
  })
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = methods
  const agregarVehiculo = useWatch({ control, name: 'agregarVehiculo' })
  const registrarIngreso = useWatch({ control, name: 'registrarIngreso' })

  async function onSubmit(v: FormValues) {
    setErrorGeneral(null)
    try {
      const id = await crear.mutateAsync({
        cliente: {
          nombre: v.nombre,
          telefono: normalizarTelefono(v.telefono),
          email: v.email,
        },
        vehiculo: v.agregarVehiculo
          ? { ...v.vehiculo, patente: normalizarPatente(v.vehiculo.patente) }
          : null,
        // Ya validado por el superRefine: acá solo se convierte al tipo final.
        ingreso:
          v.agregarVehiculo && v.registrarIngreso
            ? ingresoAInput(ingresoSchema.parse(v.ingreso))
            : null,
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

  const ev = errors.vehiculo

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex max-w-md flex-col gap-4"
        noValidate
      >
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

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" {...register('agregarVehiculo')} />
          Agregar el vehículo del cliente
        </label>

        {agregarVehiculo && (
          <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
            <FormField
              id="v-patente"
              label="Patente"
              error={ev?.patente?.message}
            >
              <Input
                id="v-patente"
                autoComplete="off"
                className="uppercase"
                {...register('vehiculo.patente')}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField id="v-marca" label="Marca" error={ev?.marca?.message}>
                <Input
                  id="v-marca"
                  autoComplete="off"
                  {...register('vehiculo.marca')}
                />
              </FormField>
              <FormField
                id="v-modelo"
                label="Modelo"
                error={ev?.modelo?.message}
              >
                <Input
                  id="v-modelo"
                  autoComplete="off"
                  {...register('vehiculo.modelo')}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="v-anio"
                label="Año (opcional)"
                error={ev?.anio?.message}
              >
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
                error={ev?.color?.message}
              >
                <Input
                  id="v-color"
                  autoComplete="off"
                  {...register('vehiculo.color')}
                />
              </FormField>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" {...register('registrarIngreso')} />
              Registrar el ingreso (cómo llegó el vehículo)
            </label>

            {registrarIngreso && <IngresoFields />}
          </fieldset>
        )}

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
