import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmarPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarPassword'],
  })

type FormValues = z.infer<typeof schema>

export function ResetPasswordForm() {
  const navigate = useNavigate()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setErrorGeneral(null)
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    })
    if (error) {
      setErrorGeneral(
        'No pudimos actualizar la contraseña. El link puede haber vencido, pedí uno nuevo.',
      )
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Elegí una nueva contraseña</h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="border-input rounded-md border px-3 py-2 text-sm"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-destructive text-sm">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmarPassword" className="text-sm font-medium">
            Repetí la contraseña
          </label>
          <input
            id="confirmarPassword"
            type="password"
            autoComplete="new-password"
            className="border-input rounded-md border px-3 py-2 text-sm"
            {...register('confirmarPassword')}
          />
          {errors.confirmarPassword && (
            <p className="text-destructive text-sm">
              {errors.confirmarPassword.message}
            </p>
          )}
        </div>

        {errorGeneral && (
          <p className="text-destructive text-sm">{errorGeneral}</p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
        </Button>
      </form>
    </div>
  )
}
