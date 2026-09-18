import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AgregarServiciosForm } from '@/features/servicios/components/agregar-servicios-form'
import { etiquetaEstado } from '@/features/servicios/estados'
import { useServiciosDeVehiculo } from '@/features/servicios/api'
import {
  ElegirVehiculo,
  type VehiculoElegido,
} from '@/features/vehiculos/components/elegir-vehiculo'
import { formatearFecha, haceCuanto } from '@/lib/formato'
import { cn } from '@/lib/utils'

// "Añadir servicio" desde la pestaña Servicios: 1) elegir el auto,
// 2) elegir su ingreso abierto, 3) cargar todos los servicios hechos.
export function ServicioNuevoPage() {
  const [vehiculo, setVehiculo] = useState<VehiculoElegido | null>(null)

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">Añadir servicio</h1>
      {vehiculo ? (
        <ServiciosDelVehiculo
          vehiculo={vehiculo}
          onCambiar={() => setVehiculo(null)}
        />
      ) : (
        <ElegirVehiculo onElegir={setVehiculo} />
      )}
    </div>
  )
}

function ServiciosDelVehiculo(props: {
  vehiculo: VehiculoElegido
  onCambiar: () => void
}) {
  const navigate = useNavigate()
  const { vehiculo } = props
  const { data: servicios, isLoading } = useServiciosDeVehiculo(vehiculo.id)
  const [elegidoId, setElegidoId] = useState<string | null>(null)

  // Solo los ingresos que siguen abiertos (no entregados); el más nuevo primero.
  const abiertos = (servicios ?? []).filter((s) => s.estado !== 'entregado')
  const ingreso = abiertos.find((s) => s.id === elegidoId) ?? abiertos[0]

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-2">
          <div>
            <p className="font-medium">{vehiculo.cliente}</p>
            <p className="text-muted-foreground text-sm">
              {vehiculo.marca} {vehiculo.modelo}
              {vehiculo.telefono && ` · ${vehiculo.telefono}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className="font-mono">{vehiculo.patente}</Badge>
            <Button variant="ghost" size="sm" onClick={props.onCambiar}>
              Cambiar auto
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {servicios && abiertos.length === 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Este auto no tiene un ingreso abierto en el taller. Para cargarle
            servicios primero hay que recibirlo.
          </p>
          <Button asChild>
            <Link to={`/recibir?patente=${vehiculo.patente}`}>
              Recibir vehículo
            </Link>
          </Button>
        </div>
      )}

      {ingreso && (
        <>
          {abiertos.length > 1 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Tiene {abiertos.length} ingresos abiertos. ¿A cuál?
              </p>
              {abiertos.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setElegidoId(s.id)}
                  className={cn(
                    'rounded-lg border p-3 text-left text-sm',
                    s.id === ingreso.id && 'border-primary bg-muted',
                  )}
                >
                  <span className="font-medium">
                    {formatearFecha(s.fecha_ingreso)} ·{' '}
                    {haceCuanto(s.fecha_ingreso)}
                  </span>
                  <span className="text-muted-foreground block">
                    {s.motivo_ingreso} · {etiquetaEstado(s.estado)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {abiertos.length === 1 && (
            <p className="text-muted-foreground text-sm">
              Ingreso del {formatearFecha(ingreso.fecha_ingreso)}
              {ingreso.motivo_ingreso && ` · ${ingreso.motivo_ingreso}`}
            </p>
          )}

          {/* key: al cambiar de ingreso el formulario arranca limpio */}
          <AgregarServiciosForm
            key={ingreso.id}
            servicioId={ingreso.id}
            onGuardado={() => navigate(`/servicios/${ingreso.id}`)}
          />
        </>
      )}
    </div>
  )
}
