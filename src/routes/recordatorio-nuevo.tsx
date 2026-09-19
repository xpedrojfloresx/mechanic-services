import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Patente } from '@/components/patente'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RecordatorioForm } from '@/features/recordatorios/components/recordatorio-form'
import {
  ElegirVehiculo,
  type VehiculoElegido,
} from '@/features/vehiculos/components/elegir-vehiculo'

// "Nuevo recordatorio" desde la lista: 1) elegir el auto, 2) cargar el aviso.
export function RecordatorioNuevoPage() {
  const navigate = useNavigate()
  const [vehiculo, setVehiculo] = useState<VehiculoElegido | null>(null)

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">Nuevo recordatorio</h1>

      {vehiculo ? (
        <>
          <Card>
            <CardContent className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{vehiculo.cliente}</p>
                <p className="text-muted-foreground text-sm">
                  {vehiculo.marca} {vehiculo.modelo}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Patente size="md">{vehiculo.patente}</Patente>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVehiculo(null)}
                >
                  Cambiar auto
                </Button>
              </div>
            </CardContent>
          </Card>
          <RecordatorioForm
            vehiculoId={vehiculo.id}
            onGuardado={() => navigate('/recordatorios', { replace: true })}
          />
        </>
      ) : (
        <ElegirVehiculo
          onElegir={setVehiculo}
          pregunta="¿Para qué auto es el recordatorio?"
        />
      )}
    </div>
  )
}
