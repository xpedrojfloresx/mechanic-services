import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSerieAltas } from '@/features/resumen/api'
import type { Rango } from '@/features/resumen/rangos'

const descripcionRango: Record<Rango, string> = {
  semana: 'Últimos 7 días',
  mes: 'Últimos 30 días',
  anio: 'Últimos 12 meses',
}

export function Insights() {
  const [rango, setRango] = useState<Rango>('semana')

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Insights</h2>
          <p className="text-muted-foreground text-sm">
            {descripcionRango[rango]}
          </p>
        </div>
        <Tabs value={rango} onValueChange={(v) => setRango(v as Rango)}>
          <TabsList>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mes</TabsTrigger>
            <TabsTrigger value="anio">Año</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GraficoAltas titulo="Clientes nuevos" tabla="clientes" rango={rango} />
        <GraficoAltas
          titulo="Vehículos nuevos"
          tabla="vehiculos"
          rango={rango}
        />
      </div>
    </section>
  )
}

function GraficoAltas(props: {
  titulo: string
  tabla: 'clientes' | 'vehiculos'
  rango: Rango
}) {
  const { data, isLoading, isError } = useSerieAltas(props.tabla, props.rango)
  const total = data?.reduce((suma, b) => suma + b.total, 0) ?? 0
  const config = {
    total: { label: props.titulo, color: 'var(--chart-2)' },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {props.titulo}
        </CardTitle>
        <p className="text-3xl font-semibold">{isLoading ? '—' : total}</p>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && (
          <p className="text-destructive text-sm">
            No pudimos cargar el gráfico.
          </p>
        )}
        {data && (
          <ChartContainer config={config} className="h-40 w-full">
            <BarChart data={data} margin={{ left: -20, right: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="etiqueta"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={3} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
