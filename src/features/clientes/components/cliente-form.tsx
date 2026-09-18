import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { useGuardarCliente } from '@/features/clientes/api'
import {
  esTelefonoValido,
  normalizarTelefono,
} from '@/features/clientes/telefono'
import type { Tables } from '@/lib/database.types'

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
})

type FormValues = z.infer<typeof schema>

export function ClienteForm({ cliente }: { cliente?: Tables<'clientes'> }) {
  const navigate = useNavigate()
  const { data: usuario } = useUsuarioActual()
  const guardar = useGuardarCliente(usuario?.taller_id)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: cliente?.nombre ?? '',
      telefono: cliente?.telefono ?? '',
      email: cliente?.email ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    setErrorGeneral(null)
    try {
      const guardado = await guardar.mutateAsync({
        id: cliente?.id,
        values: {
          nombre: values.nombre,
          telefono: normalizarTelefono(values.telefono) || null,
          email: values.email || null,
        },
      })
      navigate(`/clientes/${guardado.id}`, { replace: true })
    } catch (error) {
      console.error('Error al guardar el cliente:', error)
      setErrorGeneral('No pudimos guardar el cliente. Probá de nuevo.')
    }
  }

  return (
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
