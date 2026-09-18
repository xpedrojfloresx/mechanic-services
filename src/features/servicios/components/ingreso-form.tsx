import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import {
  useActualizarServicio,
  useCrearIngreso,
} from '@/features/servicios/api'
import { IngresoFields } from '@/features/servicios/components/ingreso-fields'
import {
  ingresoAInput,
  ingresoSchema,
  ingresoVacio,
  type IngresoValues,
} from '@/features/servicios/schema'
import type { Tables } from '@/lib/database.types'

const schema = z.object({ ingreso: ingresoSchema })

type IngresoFormProps = {
  vehiculoId: string
  // Si viene un servicio, se edita su ingreso en lugar de crear uno nuevo.
  servicio?: Tables<'servicios'>
}

export function IngresoForm({ vehiculoId, servicio }: IngresoFormProps) {
  const navigate = useNavigate()
  const { data: usuario } = useUsuarioActual()
  const crear = useCrearIngreso(usuario?.taller_id)
  const actualizar = useActualizarServicio()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const methods = useForm<{ ingreso: IngresoValues }>({
    resolver: zodResolver(schema),
    defaultValues: {
      ingreso: servicio
        ? {
            fecha_ingreso: servicio.fecha_ingreso,
            km: String(servicio.km_al_ingreso),
            motivo: servicio.motivo_ingreso ?? '',
            estado: servicio.estado_al_ingreso ?? '',
          }
        : ingresoVacio(),
    },
  })

  async function onSubmit(values: { ingreso: IngresoValues }) {
    setErrorGeneral(null)
    try {
      const datos = ingresoAInput(values.ingreso)
      if (servicio) {
        await actualizar.mutateAsync({ id: servicio.id, values: datos })
        navigate(`/servicios/${servicio.id}`, { replace: true })
      } else {
        const nuevo = await crear.mutateAsync({ vehiculoId, values: datos })
        navigate(`/servicios/${nuevo.id}`, { replace: true })
      }
    } catch (error) {
      console.error('Error al guardar el ingreso:', error)
      setErrorGeneral('No pudimos guardar el ingreso. Probá de nuevo.')
    }
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="flex max-w-md flex-col gap-4"
        noValidate
      >
        <IngresoFields />
        {errorGeneral && (
          <p className="text-destructive text-sm">{errorGeneral}</p>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={crear.isPending || actualizar.isPending}
          >
            {crear.isPending ? 'Guardando...' : 'Guardar ingreso'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
