import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from 'recharts'
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
import {
  facturacionPorMes,
  formatoPesos,
  ingresosPorDiaSemana,
  marcasMasComunes,
  trabajosMasComunes,
  type ServicioInsights,
} from '@/features/resumen/insights-datos'
import type { Rango } from '@/features/resumen/rangos'

function TarjetaGrafico(props: {
  titulo: string
  descripcion?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{props.titulo}</CardTitle>
        {props.descripcion && (
          <p className="text-muted-foreground text-sm">{props.descripcion}</p>
        )}
      </CardHeader>
      <CardContent>{props.children}</CardContent>
    </Card>
  )
}

function SinDatos({ texto }: { texto: string }) {
  return (
    <p className="text-muted-foreground py-10 text-center text-sm">{texto}</p>
  )
}

const recortar = (texto: string, largo: number) =>
  texto.length > largo ? texto.slice(0, largo - 1) + '…' : texto

// Barras horizontales: ranking de los trabajos que más se hacen.
export function TrabajosComunes({
  servicios,
}: {
  servicios: ServicioInsights[]
}) {
  const datos = trabajosMasComunes(servicios)
  const config = {
    total: { label: 'Veces', color: 'var(--chart-2)' },
  } satisfies ChartConfig

  return (
    <TarjetaGrafico
      titulo="Trabajos más comunes"
      descripcion="Según los servicios realizados que cargás en cada ingreso"
    >
      {datos.length === 0 ? (
        <SinDatos texto="Todavía no hay trabajos cargados en este período." />
      ) : (
        <ChartContainer
          config={config}
          className="w-full"
          style={{ height: 40 + datos.length * 36 }}
        >
          <BarChart
            data={datos}
            layout="vertical"
            margin={{ left: 0, right: 12 }}
          >
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="nombre"
              tickLine={false}
              axisLine={false}
              width={110}
              tickFormatter={(v: string) => recortar(v, 16)}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar
              isAnimationActive={false}
              dataKey="total"
              fill="var(--color-total)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      )}
    </TarjetaGrafico>
  )
}

// Área: lo facturado en los últimos 12 meses.
export function FacturacionMensual({
  servicios,
}: {
  servicios: ServicioInsights[]
}) {
  const datos = facturacionPorMes(servicios)
  const config = {
    total: { label: 'Facturado', color: 'var(--chart-2)' },
  } satisfies ChartConfig

  return (
    <TarjetaGrafico
      titulo="Facturación por mes"
      descripcion="Suma de los precios cargados, por mes de ingreso"
    >
      <ChartContainer config={config} className="h-52 w-full">
        <AreaChart data={datos} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(valor) => formatoPesos.format(Number(valor))}
              />
            }
          />
          <Area
            isAnimationActive={false}
            dataKey="total"
            type="monotone"
            stroke="var(--color-total)"
            fill="var(--color-total)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </TarjetaGrafico>
  )
}

// Dona: qué marcas pasan más por el taller.
export function MarcasDona({ servicios }: { servicios: ServicioInsights[] }) {
  const datos = marcasMasComunes(servicios)
  const total = datos.reduce((a, m) => a + m.total, 0)
  const colores = [
    'var(--chart-2)',
    'var(--chart-4)',
    'var(--chart-1)',
    'var(--chart-3)',
    'var(--chart-5)',
    'var(--muted-foreground)',
  ]
  const config = { total: { label: 'Ingresos' } } satisfies ChartConfig

  return (
    <TarjetaGrafico titulo="Marcas que más ingresan">
      {datos.length === 0 ? (
        <SinDatos texto="Todavía no hay ingresos en este período." />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <ChartContainer config={config} className="h-44 w-44 shrink-0">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="nombre" hideLabel />}
              />
              <Pie
                isAnimationActive={false}
                data={datos}
                dataKey="total"
                nameKey="nombre"
                innerRadius={45}
                outerRadius={78}
                strokeWidth={2}
              >
                {datos.map((_, i) => (
                  <Cell key={i} fill={colores[i % colores.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="flex w-full flex-col gap-1.5 text-sm">
            {datos.map((m, i) => (
              <li key={m.nombre} className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-sm"
                  style={{ background: colores[i % colores.length] }}
                />
                <span className="flex-1 truncate">{m.nombre}</span>
                <span className="text-muted-foreground">
                  {m.total} ({Math.round((m.total / total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </TarjetaGrafico>
  )
}

// Radar: qué días de la semana entran más autos.
export function DiasSemanaRadar({
  servicios,
}: {
  servicios: ServicioInsights[]
}) {
  const datos = ingresosPorDiaSemana(servicios)
  const hayDatos = datos.some((d) => d.total > 0)
  const config = {
    total: { label: 'Ingresos', color: 'var(--chart-2)' },
  } satisfies ChartConfig

  return (
    <TarjetaGrafico
      titulo="Días de más movimiento"
      descripcion="Ingresos por día de la semana"
    >
      {!hayDatos ? (
        <SinDatos texto="Todavía no hay ingresos en este período." />
      ) : (
        <ChartContainer
          config={config}
          className="mx-auto h-56 w-full max-w-xs"
        >
          <RadarChart data={datos}>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <PolarGrid />
            <PolarAngleAxis dataKey="dia" />
            <Radar
              isAnimationActive={false}
              dataKey="total"
              stroke="var(--color-total)"
              fill="var(--color-total)"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ChartContainer>
      )}
    </TarjetaGrafico>
  )
}

const descripcionRango: Record<Rango, string> = {
  semana: 'Últimos 7 días',
  mes: 'Últimos 30 días',
  anio: 'Últimos 12 meses',
}

// Líneas: clientes y vehículos nuevos en el tiempo.
export function AltasLineas() {
  const [rango, setRango] = useState<Rango>('mes')
  const clientes = useSerieAltas('clientes', rango)
  const vehiculos = useSerieAltas('vehiculos', rango)
  const config = {
    clientes: { label: 'Clientes', color: 'var(--chart-2)' },
    vehiculos: { label: 'Vehículos', color: 'var(--chart-4)' },
  } satisfies ChartConfig

  const datos = clientes.data?.map((b, i) => ({
    etiqueta: b.etiqueta,
    clientes: b.total,
    vehiculos: vehiculos.data?.[i]?.total ?? 0,
  }))

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">
            Clientes y vehículos nuevos
          </CardTitle>
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
      </CardHeader>
      <CardContent>
        {!datos && <Skeleton className="h-48 w-full" />}
        {datos && (
          <ChartContainer config={config} className="h-48 w-full">
            <LineChart data={datos} margin={{ left: -20, right: 8, top: 8 }}>
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
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                isAnimationActive={false}
                dataKey="clientes"
                type="monotone"
                stroke="var(--color-clientes)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                isAnimationActive={false}
                dataKey="vehiculos"
                type="monotone"
                stroke="var(--color-vehiculos)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
        {datos && (
          <div className="text-muted-foreground mt-2 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-chart-2 h-0.5 w-4" /> Clientes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="border-chart-4 h-0 w-4 border-t-2 border-dashed" />{' '}
              Vehículos
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
