import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import {
  useEliminarItem,
  useGuardarItem,
  useItems,
} from '@/features/servicios/api'
import { AgregarServiciosForm } from '@/features/servicios/components/agregar-servicios-form'
import { ItemForm } from '@/features/servicios/components/item-form'
import { Badge } from '@/components/ui/badge'
import { desgloseItems, etiquetaTipo } from '@/features/servicios/items'
import { BotonWhatsApp } from '@/features/whatsapp/components/boton-whatsapp'
import { mensajeDetalle } from '@/features/whatsapp/whatsapp'
import { formatoNumero } from '@/lib/formato'

type Contacto = {
  telefono: string | null | undefined
  datos: {
    nombre: string
    marca: string
    modelo: string
    patente: string
    taller: string
  }
}

// contacto: a quién y con qué datos se le puede mandar el detalle por WhatsApp.
export function ItemsSection({
  servicioId,
  contacto,
}: {
  servicioId: string
  contacto?: Contacto
}) {
  const { data: usuario } = useUsuarioActual()
  const { data: items, isLoading } = useItems(servicioId)
  const guardar = useGuardarItem(usuario?.taller_id)
  const eliminar = useEliminarItem()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [agregando, setAgregando] = useState(false)
  // Sin servicios cargados el formulario ya viene abierto.
  const mostrarFormulario = agregando || (!isLoading && items?.length === 0)

  const desglose = desgloseItems(items ?? [])

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Servicios realizados</h2>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      )}
      {items?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Todavía no cargaste ningún servicio en este ingreso.
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
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {i.descripcion}
                  <Badge variant="outline">{etiquetaTipo(i.tipo)}</Badge>
                </p>
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

      {desglose.hayPrecios && (
        <Card>
          <CardContent className="flex flex-col gap-1 text-sm">
            <FilaCuenta
              texto="Repuestos"
              valor={desglose.subtotalRepuestos}
              mostrar={desglose.repuestos.length > 0}
            />
            <FilaCuenta
              texto="Mano de obra"
              valor={desglose.subtotalManoDeObra}
              mostrar={desglose.manoDeObra.length > 0}
            />
            <FilaCuenta
              texto="Sin clasificar"
              valor={desglose.subtotalSinClasificar}
              mostrar={desglose.sinClasificar.length > 0}
            />
            <div className="mt-1 flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>$ {formatoNumero.format(desglose.total)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {contacto && items && items.length > 0 && (
        <BotonWhatsApp
          telefono={contacto.telefono}
          mensaje={mensajeDetalle(contacto.datos, items)}
          texto="Enviar detalle al cliente"
        />
      )}

      {mostrarFormulario ? (
        <AgregarServiciosForm
          servicioId={servicioId}
          onGuardado={() => setAgregando(false)}
          onCancelar={items?.length ? () => setAgregando(false) : undefined}
        />
      ) : (
        <Button variant="outline" onClick={() => setAgregando(true)}>
          <Plus /> Añadir servicios
        </Button>
      )}
    </section>
  )
}

function FilaCuenta(props: { texto: string; valor: number; mostrar: boolean }) {
  if (!props.mostrar) return null
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{props.texto}</span>
      <span>$ {formatoNumero.format(props.valor)}</span>
    </div>
  )
}
