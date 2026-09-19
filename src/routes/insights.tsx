import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AltasLineas,
  DiasSemanaRadar,
  FacturacionMensual,
  MarcasDona,
  TrabajosComunes,
} from '@/features/resumen/components/graficos-insights'
import { useServiciosInsights } from '@/features/resumen/api'
import {
  desdePeriodo,
  diasPromedioEnTaller,
  etiquetaPeriodo,
  filtrarDesde,
  formatoPesos,
  totalFacturado,
  vehiculosDistintos,
  type Periodo,
} from '@/features/resumen/insights-datos'

const CLAVE_MONTOS = 'insights-mostrar-montos'

// Los montos se pueden ocultar (por si hay clientes mirando la pantalla); se
// recuerda la elección en este celular/navegador.
function leerMostrarMontos() {
  try {
    return localStorage.getItem(CLAVE_MONTOS) !== '0'
  } catch {
    return true
  }
}

// Insights: la parte más "técnica" de la app (por eso solo está en el menú
// lateral). Todo se calcula con los servicios de los últimos 12 meses.
export function InsightsPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [mostrarMontos, setMostrarMontos] = useState(leerMostrarMontos)
  const { data, isLoading, isError } = useServiciosInsights()

  function alternarMontos() {
    const nuevo = !mostrarMontos
    setMostrarMontos(nuevo)
    try {
      localStorage.setItem(CLAVE_MONTOS, nuevo ? '1' : '0')
    } catch {
      // Sin almacenamiento: la elección vale solo mientras la pantalla está abierta.
    }
  }

  const delPeriodo = data ? filtrarDesde(data, desdePeriodo(periodo)) : []
  const diasEnTaller = data ? diasPromedioEnTaller(delPeriodo) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Insights</h1>
          <p className="text-muted-foreground text-sm">
            {etiquetaPeriodo[periodo]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={alternarMontos}
            aria-pressed={mostrarMontos}
          >
            {mostrarMontos ? <EyeOff /> : <Eye />}
            {mostrarMontos ? 'Ocultar montos' : 'Mostrar montos'}
          </Button>
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <TabsList>
              <TabsTrigger value="mes">Mes</TabsTrigger>
              <TabsTrigger value="trimestre">3 meses</TabsTrigger>
              <TabsTrigger value="anio">Año</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isError && !data && (
        <p className="text-destructive text-sm">
          No pudimos cargar los datos. Probá de nuevo.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          titulo="Servicios"
          valor={isLoading ? undefined : String(delPeriodo.length)}
        />
        <Kpi
          titulo="Vehículos distintos"
          valor={isLoading ? undefined : String(vehiculosDistintos(delPeriodo))}
        />
        <Kpi
          titulo="Días promedio en taller"
          valor={
            isLoading
              ? undefined
              : diasEnTaller === null
                ? 'Sin entregas'
                : diasEnTaller.toLocaleString('es-AR', {
                    maximumFractionDigits: 1,
                  })
          }
        />
        <Kpi
          titulo="Facturado"
          valor={
            isLoading
              ? undefined
              : mostrarMontos
                ? formatoPesos.format(totalFacturado(delPeriodo))
                : '••••••'
          }
        />
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <TrabajosComunes servicios={delPeriodo} />
          <MarcasDona servicios={delPeriodo} />
          {mostrarMontos && <FacturacionMensual servicios={data} />}
          <DiasSemanaRadar servicios={delPeriodo} />
          <div className="md:col-span-2">
            <AltasLineas />
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi(props: { titulo: string; valor: string | undefined }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-xl font-semibold sm:text-2xl">
          {props.valor ?? '-'}
        </p>
        <p className="text-muted-foreground text-sm">{props.titulo}</p>
      </CardContent>
    </Card>
  )
}
