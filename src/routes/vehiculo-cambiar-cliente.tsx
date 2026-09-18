import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { FormField } from '@/components/form-field'
import { Patente } from '@/components/patente'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { useGuardarCliente } from '@/features/clientes/api'
import { ClientePicker } from '@/features/clientes/components/cliente-picker'
import {
  esTelefonoValido,
  normalizarTelefono,
} from '@/features/clientes/telefono'
import { useCambiarCliente, useVehiculo } from '@/features/vehiculos/api'
import type { Tables } from '@/lib/database.types'

// Pasa un vehículo a otro cliente (lo vendió, cambió de dueño, se cargó mal).
// El historial de servicios se queda con el vehículo.
export function VehiculoCambiarClientePage() {
  const { id } = useParams()
  const { data: vehiculo, isLoading } = useVehiculo(id)
  const [modo, setModo] = useState<'existente' | 'nuevo'>('existente')

  if (isLoading) return <Skeleton className="h-40 w-full max-w-md" />
  if (!vehiculo) {
    return (
      <p className="text-destructive text-sm">No encontramos el vehículo.</p>
    )
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Cambiar de dueño</h1>
        <p className="text-muted-foreground text-sm">
          El historial de servicios se mantiene con el vehículo.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-2 text-sm">
          <div>
            <p className="font-medium">
              {vehiculo.marca} {vehiculo.modelo}
            </p>
            <p className="text-muted-foreground">
              Dueño actual: {vehiculo.clientes?.nombre}
            </p>
          </div>
          <Patente size="md">{vehiculo.patente}</Patente>
        </CardContent>
      </Card>

      <Tabs value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
        <TabsList>
          <TabsTrigger value="existente">Cliente que ya tengo</TabsTrigger>
          <TabsTrigger value="nuevo">Cliente nuevo</TabsTrigger>
        </TabsList>
      </Tabs>

      {modo === 'existente' ? (
        <ElegirExistente vehiculo={vehiculo} />
      ) : (
        <NuevoCliente vehiculo={vehiculo} />
      )}
    </div>
  )
}

type Vehiculo = Tables<'vehiculos'>

function ElegirExistente({ vehiculo }: { vehiculo: Vehiculo }) {
  const [destino, setDestino] = useState<Tables<'clientes'> | null>(null)
  const { pasarA, guardando, error } = usePasarVehiculo(vehiculo)

  if (!destino) {
    return (
      <ClientePicker onElegir={setDestino} excluirId={vehiculo.cliente_id} />
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>
          ¿Pasar{' '}
          <span className="font-mono font-medium">{vehiculo.patente}</span> a{' '}
          <span className="font-medium">{destino.nombre}</span>?
        </p>
        {error && (
          <p className="text-destructive">
            No pudimos hacer el cambio. Probá de nuevo.
          </p>
        )}
        <div className="flex gap-2">
          <Button disabled={guardando} onClick={() => pasarA(destino.id)}>
            {guardando ? 'Guardando...' : 'Confirmar cambio'}
          </Button>
          <Button variant="outline" onClick={() => setDestino(null)}>
            Elegir otro
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const schemaNuevo = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre'),
  telefono: z
    .string()
    .trim()
    .refine(
      esTelefonoValido,
      'Teléfono inválido. Solo números, formato Argentina o Chile',
    ),
})
type ValoresNuevo = z.infer<typeof schemaNuevo>

function NuevoCliente({ vehiculo }: { vehiculo: Vehiculo }) {
  const { data: usuario } = useUsuarioActual()
  const crear = useGuardarCliente(usuario?.taller_id)
  const { pasarA, guardando, error } = usePasarVehiculo(vehiculo)
  const [errorCrear, setErrorCrear] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ValoresNuevo>({
    resolver: zodResolver(schemaNuevo),
    defaultValues: { nombre: '', telefono: '' },
  })

  async function onSubmit(v: ValoresNuevo) {
    setErrorCrear(false)
    try {
      const cliente = await crear.mutateAsync({
        values: {
          nombre: v.nombre,
          telefono: normalizarTelefono(v.telefono) || null,
        },
      })
      await pasarA(cliente.id)
    } catch (e) {
      console.error('Error al crear el cliente:', e)
      setErrorCrear(true)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
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
      {(error || errorCrear) && (
        <p className="text-destructive text-sm">
          No pudimos hacer el cambio. Probá de nuevo.
        </p>
      )}
      <Button type="submit" disabled={guardando || crear.isPending}>
        Crear cliente y pasarle el vehículo
      </Button>
    </form>
  )
}

function usePasarVehiculo(vehiculo: Vehiculo) {
  const navigate = useNavigate()
  const cambiar = useCambiarCliente()
  const [error, setError] = useState(false)

  async function pasarA(clienteId: string) {
    setError(false)
    try {
      await cambiar.mutateAsync({ vehiculoId: vehiculo.id, clienteId })
      navigate(`/vehiculos/${vehiculo.id}`, { replace: true })
    } catch (e) {
      console.error('Error al cambiar de dueño:', e)
      setError(true)
    }
  }

  return { pasarA, guardando: cambiar.isPending, error }
}
