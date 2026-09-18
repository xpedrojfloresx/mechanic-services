import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.email('Ingresá un email válido'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [enviado, setEnviado] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setErrorGeneral(null)
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/restablecer-contrasena`,
    })
    if (error) {
      console.error('Error al pedir el reset de contraseña:', error)
      setErrorGeneral('No pudimos enviar el mail. Probá de nuevo.')
      return
    }
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4 text-center">
        <h1 className="text-2xl font-semibold">Revisá tu email</h1>
        <p className="text-muted-foreground text-sm">
          Te mandamos un link para elegir una nueva contraseña.
        </p>
        <Link to="/login" className="text-sm underline underline-offset-4">
          Volver a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">¿Olvidaste tu contraseña?</h1>
        <p className="text-muted-foreground text-sm">
          Te mandamos un link para elegir una nueva.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="border-input rounded-md border px-3 py-2 text-sm"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-destructive text-sm">{errors.email.message}</p>
          )}
        </div>

        {errorGeneral && (
          <p className="text-destructive text-sm">{errorGeneral}</p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviarme el link'}
        </Button>

        <Link
          to="/login"
          className="text-muted-foreground text-center text-sm underline underline-offset-4"
        >
          Volver a iniciar sesión
        </Link>
      </form>
    </div>
  )
}
