import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { FormField } from '@/components/form-field'
import { LogoTaller } from '@/components/logo-taller'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useTallerActual } from '@/features/auth/hooks/use-taller-actual'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { useGuardarPerfil } from '@/features/perfil/api'
import { redimensionarLogo } from '@/features/perfil/logo'
import { perfilSchema, type PerfilValues } from '@/features/perfil/schema'

// Perfil: nombre del taller, nombre del mecánico (sale en el saludo de Inicio)
// y logo del taller.
export function PerfilPage() {
  const { data: usuario, isLoading: cargandoUsuario } = useUsuarioActual()
  const { data: taller, isLoading: cargandoTaller } = useTallerActual()

  if (cargandoUsuario || cargandoTaller) {
    return <Skeleton className="h-64 w-full max-w-md" />
  }
  if (!usuario || !taller) {
    return (
      <p className="text-destructive text-sm">
        No pudimos cargar tu perfil. Probá de nuevo.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Mi perfil</h1>
      <PerfilForm
        nombreMecanico={usuario.nombre ?? ''}
        nombreTaller={taller.nombre}
        logoActual={taller.logo}
        esDueno={usuario.rol === 'owner'}
      />
    </div>
  )
}

function PerfilForm(props: {
  nombreMecanico: string
  nombreTaller: string
  logoActual: string | null
  esDueno: boolean
}) {
  const navigate = useNavigate()
  const guardar = useGuardarPerfil()
  const inputArchivo = useRef<HTMLInputElement>(null)
  // undefined = sin cambios, '' = quitar, otro valor = imagen nueva.
  const [logo, setLogo] = useState<string | undefined>(undefined)
  const [errorLogo, setErrorLogo] = useState<string | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PerfilValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nombreMecanico: props.nombreMecanico,
      nombreTaller: props.nombreTaller,
    },
  })

  const logoMostrado = logo === undefined ? props.logoActual : logo || null

  async function elegirLogo(archivo: File | undefined) {
    if (!archivo) return
    setErrorLogo(null)
    try {
      setLogo(await redimensionarLogo(archivo))
    } catch (e) {
      console.error('Error al procesar el logo:', e)
      setErrorLogo('No pudimos usar esa imagen. Probá con otra (PNG o JPG).')
    }
  }

  async function onSubmit(values: PerfilValues) {
    setErrorGeneral(null)
    try {
      await guardar.mutateAsync({ ...values, logo })
      navigate(-1)
    } catch (e) {
      console.error('Error al guardar el perfil:', e)
      setErrorGeneral('No pudimos guardar los cambios. Probá de nuevo.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex max-w-md flex-col gap-4"
      noValidate
    >
      {props.esDueno && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Logo del taller</p>
          <div className="flex items-center gap-3">
            <LogoTaller logo={logoMostrado} className="size-16" />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => inputArchivo.current?.click()}
              >
                <ImagePlus /> {logoMostrado ? 'Cambiar logo' : 'Agregar logo'}
              </Button>
              {logoMostrado && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLogo('')}
                >
                  Quitar
                </Button>
              )}
            </div>
            <input
              ref={inputArchivo}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                elegirLogo(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
          {errorLogo && <p className="text-destructive text-sm">{errorLogo}</p>}
        </div>
      )}

      {props.esDueno && (
        <FormField
          id="nombre-taller"
          label="Nombre del taller"
          error={errors.nombreTaller?.message}
        >
          <Input
            id="nombre-taller"
            autoComplete="off"
            {...register('nombreTaller')}
          />
        </FormField>
      )}

      <FormField
        id="nombre-mecanico"
        label="Tu nombre"
        error={errors.nombreMecanico?.message}
      >
        <Input
          id="nombre-mecanico"
          autoComplete="given-name"
          placeholder="Ej: Pedro"
          {...register('nombreMecanico')}
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
