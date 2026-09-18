import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import {
  useEliminarItem,
  useGuardarItem,
  useItems,
} from '@/features/servicios/api'
import { ItemForm } from '@/features/servicios/components/item-form'
import { formatoNumero } from '@/lib/formato'

export function ItemsSection({ servicioId }: { servicioId: string }) {
  const { data: usuario } = useUsuarioActual()
  const { data: items, isLoading } = useItems(servicioId)
  const guardar = useGuardarItem(usuario?.taller_id)
  const eliminar = useEliminarItem()
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const total = (items ?? []).reduce(
    (suma, i) => suma + i.cantidad * (i.precio ?? 0),
    0,
  )
  const hayPrecios = (items ?? []).some((i) => i.precio != null)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Repuestos y mano de obra</h2>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      )}
      {items?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Todavía no cargaste ítems en este servicio.
        </p>
      )}

      {items?.map((i) =>
        editandoId === i.id ? (
          <Card key={i.id}>
            <CardContent>
              <ItemForm
                item={i}
                onCancelar={() => setEditandoId(null)}
                onGuardar={async (values) => {
                  await guardar.mutateAsync({
                    servicioId,
                    itemId: i.id,
                    values,
                  })
                  setEditandoId(null)
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <Card key={i.id}>
            <CardContent className="flex items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">{i.descripcion}</p>
                <p className="text-muted-foreground">
                  {formatoNumero.format(i.cantidad)}
                  {i.precio != null &&
                    ` × ${formatoNumero.format(i.precio)} = ${formatoNumero.format(i.cantidad * i.precio)}`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditandoId(i.id)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={eliminar.isPending}
                  onClick={() => eliminar.mutate(i.id)}
                >
                  Quitar
                </Button>
              </div>
            </CardContent>
          </Card>
        ),
      )}

      {hayPrecios && (
        <p className="text-right font-semibold">
          Total: {formatoNumero.format(total)}
        </p>
      )}

      <Card>
        <CardContent>
          <ItemForm
            onGuardar={(values) => guardar.mutateAsync({ servicioId, values })}
          />
        </CardContent>
      </Card>
    </section>
  )
}
