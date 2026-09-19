import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TipoItemSelector } from '@/features/servicios/components/tipo-item-selector'
import type { ItemInput } from '@/features/servicios/api'
import {
  itemAInput,
  itemSchema,
  itemVacio,
  type ItemValues,
} from '@/features/servicios/schema'
import type { Tables } from '@/lib/database.types'

type FormValues = ItemValues

type ItemFormProps = {
  item?: Tables<'servicio_items'>
  onGuardar: (values: ItemInput) => Promise<void>
  onCancelar?: () => void
}

export function ItemForm({ item, onGuardar, onCancelar }: ItemFormProps) {
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      tipo: item?.tipo === 'mano_de_obra' ? 'mano_de_obra' : 'repuesto',
      descripcion: item?.descripcion ?? '',
      cantidad: item ? String(item.cantidad) : '1',
      precio: item?.precio != null ? String(item.precio) : '',
    },
  })

  async function onSubmit(v: FormValues) {
    setError(null)
    try {
      await onGuardar(itemAInput(v))
      if (!item) reset(itemVacio())
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
      <Controller
        control={control}
        name="tipo"
        render={({ field }) => (
          <TipoItemSelector
            size="sm"
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <div className="grid grid-cols-[1fr_5rem_7rem] gap-2">
        <Input
          aria-label="Descripción"
          placeholder="¿Qué se hizo o se usó?"
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
