import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.email('Ingresá un email válido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const magicLinkSchema = z.object({
  email: z.email('Ingresá un email válido'),
})

type MagicLinkFormValues = z.infer<typeof magicLinkSchema>

export function LoginForm() {
  const [mostrarOtrasFormas, setMostrarOtrasFormas] = useState(false)
  const [magicLinkEnviado, setMagicLinkEnviado] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const {
    register: registerMagicLink,
    handleSubmit: handleSubmitMagicLink,
    formState: { errors: errorsMagicLink, isSubmitting: isSubmittingMagicLink },
  } = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
  })

  async function onSubmit(values: LoginFormValues) {
    setErrorGeneral(null)
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      console.error('Error al iniciar sesión:', error)
      setErrorGeneral('Email o contraseña incorrectos.')
    }
  }

  async function onSubmitMagicLink(values: MagicLinkFormValues) {
    setErrorGeneral(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      console.error('Error al enviar el magic link:', error)
      setErrorGeneral('No pudimos enviar el link. Probá de nuevo.')
      return
    }
    setMagicLinkEnviado(true)
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <p className="text-muted-foreground text-sm">Gestión de Talleres</p>
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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <Link
              to="/olvide-mi-contrasena"
              className="text-muted-foreground text-sm underline underline-offset-4"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="border-input rounded-md border px-3 py-2 text-sm"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-destructive text-sm">
              {errors.password.message}
            </p>
          )}
        </div>

        {errorGeneral && (
          <p className="text-destructive text-sm">{errorGeneral}</p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setMostrarOtrasFormas((v) => !v)}
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          Otras formas de iniciar sesión
        </button>

        {mostrarOtrasFormas &&
          (magicLinkEnviado ? (
            <p className="text-sm">
              Te mandamos un link a tu email para entrar sin contraseña. Revisá
              tu bandeja de entrada.
            </p>
          ) : (
            <form
              onSubmit={handleSubmitMagicLink(onSubmitMagicLink)}
              className="flex flex-col gap-2"
              noValidate
            >
              <label htmlFor="magic-email" className="text-sm font-medium">
                Recibir link mágico por email
              </label>
              <input
                id="magic-email"
                type="email"
                autoComplete="email"
                className="border-input rounded-md border px-3 py-2 text-sm"
                {...registerMagicLink('email')}
              />
              {errorsMagicLink.email && (
                <p className="text-destructive text-sm">
                  {errorsMagicLink.email.message}
                </p>
              )}
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmittingMagicLink}
              >
                {isSubmittingMagicLink ? 'Enviando...' : 'Enviarme el link'}
              </Button>
            </form>
          ))}
      </div>
    </div>
  )
}
