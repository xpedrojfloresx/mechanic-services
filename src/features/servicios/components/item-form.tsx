import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ItemInput } from '@/features/servicios/api'
import type { Tables } from '@/lib/database.types'

// Acepta coma o punto como separador decimal.
const aNumero = (v: string) => Number(v.trim().replace(',', '.'))

const schema = z.object({
  descripcion: z.string().trim().min(1, 'Ingresá la descripción'),
  cantidad: z
    .string()
    .refine((v) => v.trim() !== '' && aNumero(v) > 0, 'Cantidad inválida'),
  precio: z
    .string()
    .refine((v) => v.trim() === '' || aNumero(v) >= 0, 'Precio inválido'),
})

type FormValues = z.infer<typeof schema>

type ItemFormProps = {
  item?: Tables<'servicio_items'>
  onGuardar: (values: ItemInput) => Promise<void>
  onCancelar?: () => void
}

export function ItemForm({ item, onGuardar, onCancelar }: ItemFormProps) {
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      descripcion: item?.descripcion ?? '',
      cantidad: item ? String(item.cantidad) : '1',
      precio: item?.precio != null ? String(item.precio) : '',
    },
  })

  async function onSubmit(v: FormValues) {
    setError(null)
    try {
      await onGuardar({
        descripcion: v.descripcion,
        cantidad: aNumero(v.cantidad),
        precio: v.precio.trim() === '' ? null : aNumero(v.precio),
      })
      if (!item) reset({ descripcion: '', cantidad: '1', precio: '' })
    } catch (e) {
      console.error('Error al guardar el ítem:', e)
      setError('No pudimos guardar el ítem. Probá de nuevo.')
    }
  }

  const mensaje =
    errors.descripcion?.message ??
    errors.cantidad?.message ??
    errors.precio?.message

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-2"
      noValidate
    >
      <div className="grid grid-cols-[1fr_5rem_7rem] gap-2">
        <Input
          aria-label="Descripción"
          placeholder="Repuesto o mano de obra"
          autoComplete="off"
          {...register('descripcion')}
        />
        <Input
          aria-label="Cantidad"
          placeholder="Cant."
          inputMode="decimal"
          autoComplete="off"
          {...register('cantidad')}
        />
        <Input
          aria-label="Precio unitario"
          placeholder="Precio"
          inputMode="decimal"
          autoComplete="off"
          {...register('precio')}
        />
      </div>
      {(mensaje || error) && (
        <p className="text-destructive text-sm">{mensaje ?? error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {item ? 'Guardar' : 'Agregar ítem'}
        </Button>
        {onCancelar && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancelar}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
