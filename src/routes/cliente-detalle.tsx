import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Patente } from '@/components/patente'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCliente, useEliminarCliente } from '@/features/clientes/api'
import { useTallerActual } from '@/features/auth/hooks/use-taller-actual'
import { BotonWhatsApp } from '@/features/whatsapp/components/boton-whatsapp'
import { mensajeCliente } from '@/features/whatsapp/whatsapp'
import { useVehiculosDeCliente } from '@/features/vehiculos/api'

export function ClienteDetallePage() {
  const { id } = useParams()
  const { data: cliente, isLoading } = useCliente(id)
  const { data: vehiculos } = useVehiculosDeCliente(id)
  const eliminar = useEliminarCliente()
  const { data: taller } = useTallerActual()
  const navigate = useNavigate()
  const [errorEliminar, setErrorEliminar] = useState(false)

  async function confirmarEliminar() {
    setErrorEliminar(false)
    try {
      await eliminar.mutateAsync(id!)
      navigate('/clientes', { replace: true })
    } catch (error) {
      console.error('Error al eliminar el cliente:', error)
      setErrorEliminar(true)
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!cliente) {
    return (
      <p className="text-destructive text-sm">No encontramos el cliente.</p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-xl">{cliente.nombre}</CardTitle>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/clientes/${cliente.id}/editar`}>Editar</Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                >
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    ¿Eliminar a {cliente.nombre}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {vehiculos && vehiculos.length > 0
                      ? `Se van a eliminar también sus ${vehiculos.length} vehículo(s) y todo su historial de servicios.`
                      : 'Se elimina el cliente.'}{' '}
                    Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={confirmarEliminar}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          {errorEliminar && (
            <p className="text-destructive">
              No pudimos eliminar el cliente. Probá de nuevo.
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Teléfono: </span>
            {cliente.telefono || 'Sin teléfono'}
          </p>
          <div className="mt-1">
            <BotonWhatsApp
              telefono={cliente.telefono}
              mensaje={mensajeCliente(
                cliente.nombre,
                taller?.nombre ?? 'el taller',
              )}
              texto="WhatsApp"
            />
          </div>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {cliente.email || 'Sin email'}
          </p>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Vehículos</h2>
          <Button asChild size="sm">
            <Link to={`/vehiculos/nuevo?cliente=${cliente.id}`}>
              Agregar vehículo
            </Link>
          </Button>
        </div>
        {vehiculos?.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Este cliente todavía no tiene vehículos.
          </p>
        )}
        {vehiculos?.map((v) => (
          <Link key={v.id} to={`/vehiculos/${v.id}`}>
            <Card className="hover:bg-muted/50">
              <CardContent className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {v.marca} {v.modelo}
                </p>
                <Patente size="sm">{v.patente}</Patente>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
