import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { useCrearIngreso } from '@/features/servicios/api'
import { IngresoFields } from '@/features/servicios/components/ingreso-fields'
import {
  ingresoAInput,
  ingresoSchema,
  ingresoVacio,
  type IngresoValues,
} from '@/features/servicios/schema'

const schema = z.object({ ingreso: ingresoSchema })

export function IngresoForm({ vehiculoId }: { vehiculoId: string }) {
  const navigate = useNavigate()
  const { data: usuario } = useUsuarioActual()
  const crear = useCrearIngreso(usuario?.taller_id)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const methods = useForm<{ ingreso: IngresoValues }>({
    resolver: zodResolver(schema),
    defaultValues: { ingreso: ingresoVacio() },
  })

  async function onSubmit(values: { ingreso: IngresoValues }) {
    setErrorGeneral(null)
    try {
      await crear.mutateAsync({
        vehiculoId,
        values: ingresoAInput(values.ingreso),
      })
      navigate(`/vehiculos/${vehiculoId}`, { replace: true })
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
          <Button type="submit" disabled={crear.isPending}>
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
