import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MIN_CARACTERES_BUSQUEDA, useBusqueda } from '@/features/busqueda/api'
import { useClientesRecientes } from '@/features/clientes/api'
import { useConteos } from '@/features/resumen/api'
import { useDebouncedValue } from '@/lib/use-debounced-value'

export function HomePage() {
  const [termino, setTermino] = useState('')
  const terminoDebounced = useDebouncedValue(termino)
  const busca = terminoDebounced.trim().length >= MIN_CARACTERES_BUSQUEDA

  const busqueda = useBusqueda(terminoDebounced)
  const recientes = useClientesRecientes()
  const conteos = useConteos()

  const hayResultados =
    !!busqueda.data &&
    (busqueda.data.vehiculos.length > 0 || busqueda.data.clientes.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <ResumenCard titulo="Clientes" valor={conteos.data?.clientes} />
        <ResumenCard titulo="Vehículos" valor={conteos.data?.vehiculos} />
      </div>

      <div className="flex flex-col gap-2">
        <Input
          autoFocus
          type="search"
          autoComplete="off"
          placeholder="Buscar por patente o nombre del cliente"
          className="h-12 text-base"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
        />
      </div>

      {busca ? (
        <Resultados
          cargando={busqueda.isFetching && !busqueda.data}
          error={busqueda.isError}
          hayResultados={hayResultados}
        >
          {busqueda.data && (
            <>
              {busqueda.data.vehiculos.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-muted-foreground text-sm font-medium">
                    Vehículos
                  </h2>
                  {busqueda.data.vehiculos.map((v) => (
                    <Link key={v.id} to={`/vehiculos/${v.id}`}>
                      <Card className="hover:bg-muted/50">
                        <CardContent className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {v.marca} {v.modelo}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {v.clientes?.nombre}
                            </p>
                          </div>
                          <Badge variant="secondary" className="font-mono">
                            {v.patente}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </section>
              )}
              {busqueda.data.clientes.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-muted-foreground text-sm font-medium">
                    Clientes
                  </h2>
                  {busqueda.data.clientes.map((c) => (
                    <ClienteCard
                      key={c.id}
                      id={c.id}
                      nombre={c.nombre}
                      telefono={c.telefono}
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </Resultados>
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="text-muted-foreground text-sm font-medium">
            Clientes recientes
          </h2>
          {recientes.isLoading && <Skeleton className="h-16 w-full" />}
          {recientes.data?.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Todavía no cargaste ningún cliente.
            </p>
          )}
          {recientes.data?.map((c) => (
            <ClienteCard
              key={c.id}
              id={c.id}
              nombre={c.nombre}
              telefono={c.telefono}
            />
          ))}
        </section>
      )}
    </div>
  )
}

function ClienteCard(props: {
  id: string
  nombre: string
  telefono: string | null
}) {
  return (
    <Link to={`/clientes/${props.id}`}>
      <Card className="hover:bg-muted/50">
        <CardContent className="flex items-center justify-between gap-2">
          <p className="font-medium">{props.nombre}</p>
          <p className="text-muted-foreground text-sm">{props.telefono}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function Resultados(props: {
  cargando: boolean
  error: boolean
  hayResultados: boolean
  children: React.ReactNode
}) {
  if (props.cargando) return <Skeleton className="h-16 w-full" />
  if (props.error) {
    return (
      <p className="text-destructive text-sm">
        No pudimos hacer la búsqueda. Probá de nuevo.
      </p>
    )
  }
  if (!props.hayResultados) {
    return (
      <p className="text-muted-foreground text-sm">
        No encontramos resultados.
      </p>
    )
  }
  return <div className="flex flex-col gap-6">{props.children}</div>
}

function ResumenCard(props: { titulo: string; valor: number | undefined }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-3xl font-semibold">{props.valor ?? '—'}</p>
        <p className="text-muted-foreground text-sm">{props.titulo}</p>
      </CardContent>
    </Card>
  )
}
