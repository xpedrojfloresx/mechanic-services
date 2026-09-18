import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { useGuardarItems } from '@/features/servicios/api'
import { itemAInput, itemSchema, itemVacio } from '@/features/servicios/schema'

const schema = z.object({ servicios: z.array(itemSchema).min(1) })
type FormValues = z.infer<typeof schema>

type Props = {
  servicioId: string
  onGuardado: () => void
  onCancelar?: () => void
}

// Carga varios servicios realizados en un mismo ingreso de una sola vez:
// se completa un renglón por servicio y se guarda todo con un solo botón.
export function AgregarServiciosForm({
  servicioId,
  onGuardado,
  onCancelar,
}: Props) {
  const { data: usuario } = useUsuarioActual()
  const guardar = useGuardarItems(usuario?.taller_id)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { servicios: [itemVacio()] },
  })
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'servicios',
  })

  async function onSubmit(v: FormValues) {
    setError(null)
    try {
      await guardar.mutateAsync({
        servicioId,
        items: v.servicios.map(itemAInput),
      })
      onGuardado()
    } catch (e) {
      console.error('Error al guardar los servicios:', e)
      setError('No pudimos guardar los servicios. Probá de nuevo.')
    }
  }

  function otroServicio() {
    append(itemVacio())
    // Deja el cursor listo en el renglón nuevo.
    setTimeout(() => setFocus(`servicios.${fields.length}.descripcion`), 0)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3"
      noValidate
    >
      {fields.map((campo, i) => {
        const e = errors.servicios?.[i]
        return (
          <Card key={campo.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm font-medium">
                  Servicio {i + 1}
                </p>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Quitar servicio ${i + 1}`}
                    onClick={() => remove(i)}
                  >
                    <X />
                  </Button>
                )}
              </div>
              <FormField
                id={`servicio-${i}-descripcion`}
                label="¿Qué se hizo?"
                error={e?.descripcion?.message}
              >
                <Input
                  id={`servicio-${i}-descripcion`}
                  autoComplete="off"
                  placeholder="Ej: Cambio de aceite y filtro"
                  {...register(`servicios.${i}.descripcion`)}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id={`servicio-${i}-cantidad`}
                  label="Cantidad"
                  error={e?.cantidad?.message}
                >
                  <Input
                    id={`servicio-${i}-cantidad`}
                    inputMode="decimal"
                    autoComplete="off"
                    {...register(`servicios.${i}.cantidad`)}
                  />
                </FormField>
                <FormField
                  id={`servicio-${i}-precio`}
                  label="Precio (opcional)"
                  error={e?.precio?.message}
                >
                  <Input
                    id={`servicio-${i}-precio`}
                    inputMode="decimal"
                    autoComplete="off"
                    {...register(`servicios.${i}.precio`)}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Button type="button" variant="outline" onClick={otroServicio}>
        <Plus /> Añadir otro servicio
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending
            ? 'Guardando...'
            : fields.length > 1
              ? `Guardar ${fields.length} servicios`
              : 'Guardar servicio'}
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
