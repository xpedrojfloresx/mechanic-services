import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import {
  useCrearIngreso,
  useCrearVehiculoConIngreso,
} from '@/features/servicios/api'
import { IngresoFields } from '@/features/servicios/components/ingreso-fields'
import {
  ingresoAInput,
  ingresoOpcionalSchema,
  ingresoSchema,
  ingresoTieneDatos,
  ingresoVacio,
} from '@/features/servicios/schema'
import { useGuardarVehiculo } from '@/features/vehiculos/api'
import { VehiculoFields } from '@/features/vehiculos/components/vehiculo-fields'
import { normalizarPatente } from '@/features/vehiculos/patente'
import { vehiculoSchema } from '@/features/vehiculos/schema'
import type { Tables } from '@/lib/database.types'

// Al crear, el ingreso es obligatorio (salvo el estado). Al editar es
// opcional: sirve para cargarlo si se olvidó al dar de alta el vehículo.
const schemaCreacion = z.object({
  vehiculo: vehiculoSchema,
  ingreso: ingresoSchema,
})
const schemaEdicion = z.object({
  vehiculo: vehiculoSchema,
  ingreso: ingresoOpcionalSchema,
})

type FormValues = z.infer<typeof schemaCreacion>

type VehiculoFormProps = {
  clienteId: string
  vehiculo?: Tables<'vehiculos'>
}

export function VehiculoForm({ clienteId, vehiculo }: VehiculoFormProps) {
  const navigate = useNavigate()
  const { data: usuario } = useUsuarioActual()
  const guardar = useGuardarVehiculo(usuario?.taller_id)
  const crearConIngreso = useCrearVehiculoConIngreso()
  const crearIngreso = useCrearIngreso(usuario?.taller_id)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const editando = !!vehiculo

  const methods = useForm<FormValues>({
    resolver: zodResolver(editando ? schemaEdicion : schemaCreacion),
    defaultValues: {
      vehiculo: {
        patente: vehiculo?.patente ?? '',
        marca: vehiculo?.marca ?? '',
        modelo: vehiculo?.modelo ?? '',
        anio: vehiculo?.anio?.toString() ?? '',
        color: vehiculo?.color ?? '',
      },
      ingreso: ingresoVacio(),
    },
  })

  async function onSubmit(v: FormValues) {
    setErrorGeneral(null)
    const datosVehiculo = {
      cliente_id: clienteId,
      patente: normalizarPatente(v.vehiculo.patente),
      marca: v.vehiculo.marca,
      modelo: v.vehiculo.modelo,
      anio: v.vehiculo.anio ? Number(v.vehiculo.anio) : null,
      color: v.vehiculo.color || null,
    }

    try {
      let vehiculoId: string
      if (vehiculo) {
        await guardar.mutateAsync({ id: vehiculo.id, values: datosVehiculo })
        vehiculoId = vehiculo.id
        if (ingresoTieneDatos(v.ingreso)) {
          await crearIngreso.mutateAsync({
            vehiculoId,
            values: ingresoAInput(v.ingreso),
          })
        }
      } else {
        vehiculoId = await crearConIngreso.mutateAsync({
          clienteId,
          vehiculo: { ...v.vehiculo, patente: datosVehiculo.patente },
          ingreso: ingresoAInput(v.ingreso),
        })
      }
      navigate(`/vehiculos/${vehiculoId}`, { replace: true })
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

  const guardando =
    guardar.isPending || crearConIngreso.isPending || crearIngreso.isPending

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="flex max-w-md flex-col gap-6"
        noValidate
      >
        <section className="flex flex-col gap-4">
          <h2 className="font-semibold">Vehículo</h2>
          <VehiculoFields />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold">Ingreso del vehículo</h2>
            {editando && (
              <p className="text-muted-foreground text-sm">
                Completalo si te olvidaste de registrarlo. Si lo dejás vacío no
                se agrega nada.
              </p>
            )}
          </div>
          <IngresoFields />
        </section>

        {errorGeneral && (
          <p className="text-destructive text-sm">{errorGeneral}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
