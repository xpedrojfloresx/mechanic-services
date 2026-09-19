import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Patente } from '@/components/patente'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useServiciosDeVehiculo } from '@/features/servicios/api'
import { etiquetaEstado } from '@/features/servicios/estados'
import { useVehiculo } from '@/features/vehiculos/api'
import { MarcaLogo } from '@/features/vehiculos/components/marca-logo'
import { ProximosServicios } from '@/features/recordatorios/components/proximos-servicios'
import { useTallerActual } from '@/features/auth/hooks/use-taller-actual'
import { BotonWhatsApp } from '@/features/whatsapp/components/boton-whatsapp'
import { mensajeGeneral } from '@/features/whatsapp/whatsapp'
import { formatearFecha } from '@/lib/formato'

export function VehiculoDetallePage() {
  const { id } = useParams()
  const { data: vehiculo, isLoading } = useVehiculo(id)
  const { data: servicios } = useServiciosDeVehiculo(id)
  const { data: taller } = useTallerActual()

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!vehiculo) {
    return (
      <p className="text-destructive text-sm">No encontramos el vehículo.</p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Patente size="md">{vehiculo.patente}</Patente>
            {vehiculo.marca} {vehiculo.modelo}
            <MarcaLogo marca={vehiculo.marca} />
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to={`/vehiculos/${vehiculo.id}/editar`}>Editar</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Año: </span>
            {vehiculo.anio ?? 'Sin dato'}
          </p>
          <p>
            <span className="text-muted-foreground">Color: </span>
            {vehiculo.color || 'Sin dato'}
          </p>
          {vehiculo.clientes && (
            <>
              <p>
                <span className="text-muted-foreground">Cliente: </span>
                <Link
                  to={`/clientes/${vehiculo.clientes.id}`}
                  className="underline underline-offset-4"
                >
                  {vehiculo.clientes.nombre}
                </Link>
                {vehiculo.clientes.telefono &&
                  ` · ${vehiculo.clientes.telefono}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <BotonWhatsApp
                  telefono={vehiculo.clientes.telefono}
                  texto="WhatsApp"
                  mensaje={mensajeGeneral({
                    nombre: vehiculo.clientes.nombre,
                    marca: vehiculo.marca,
                    modelo: vehiculo.modelo,
                    patente: vehiculo.patente,
                    taller: taller?.nombre ?? 'el taller',
                  })}
                />
                <Button asChild variant="outline" size="sm">
                  <Link to={`/vehiculos/${vehiculo.id}/cambiar-cliente`}>
                    Cambiar de dueño
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ProximosServicios
        vehiculoId={vehiculo.id}
        kmReferencia={servicios?.[0]?.km_al_ingreso}
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Historial de servicios</h2>
          <Button asChild size="sm">
            <Link to={`/recibir?patente=${vehiculo.patente}`}>
              Recibir vehículo
            </Link>
          </Button>
        </div>
        {servicios?.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Todavía no hay servicios registrados para este vehículo.
          </p>
        )}
        {servicios?.map((s) => (
          <Link key={s.id} to={`/servicios/${s.id}`}>
            <Card className="hover:bg-muted/50">
              <CardContent className="flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {formatearFecha(s.fecha_ingreso)}{' '}
                    <Badge variant="outline">{etiquetaEstado(s.estado)}</Badge>
                  </p>
                  <p className="text-muted-foreground">
                    {s.km_al_ingreso.toLocaleString('es-AR')} km
                  </p>
                </div>
                {s.motivo_ingreso && (
                  <p>
                    <span className="text-muted-foreground">Motivo: </span>
                    {s.motivo_ingreso}
                  </p>
                )}
                {s.estado_al_ingreso && (
                  <p>
                    <span className="text-muted-foreground">Llegó: </span>
                    {s.estado_al_ingreso}
                  </p>
                )}
                {s.observaciones && (
                  <p>
                    <span className="text-muted-foreground">Obs.: </span>
                    {s.observaciones}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
