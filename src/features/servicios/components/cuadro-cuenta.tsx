import { Card, CardContent } from '@/components/ui/card'
import type { desgloseItems } from '@/features/servicios/items'
import { formatoNumero } from '@/lib/formato'

// Cuadro con el subtotal de repuestos, el de mano de obra, lo que no tiene
// tipo (solo si hay) y el total. Se usa en la ficha del servicio y en la
// calculadora.
export function CuadroCuenta({
  desglose,
}: {
  desglose: ReturnType<typeof desgloseItems>
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 text-sm">
        <Fila
          texto="Repuestos"
          valor={desglose.subtotalRepuestos}
          mostrar={desglose.repuestos.length > 0}
        />
        <Fila
          texto="Mano de obra"
          valor={desglose.subtotalManoDeObra}
          mostrar={desglose.manoDeObra.length > 0}
        />
        <Fila
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
  )
}

function Fila(props: { texto: string; valor: number; mostrar: boolean }) {
  if (!props.mostrar) return null
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{props.texto}</span>
      <span>$ {formatoNumero.format(props.valor)}</span>
    </div>
  )
}
