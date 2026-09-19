import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, RotateCcw, X } from 'lucide-react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DestinoCalculo } from '@/features/calculadora/components/destino-calculo'
import { CuadroCuenta } from '@/features/servicios/components/cuadro-cuenta'
import { TipoItemSelector } from '@/features/servicios/components/tipo-item-selector'
import { desgloseItems } from '@/features/servicios/items'
import {
  aNumero,
  itemAInput,
  itemSchema,
  itemVacio,
} from '@/features/servicios/schema'

const schema = z.object({ servicios: z.array(itemSchema).min(1) })
type FormValues = z.infer<typeof schema>

// Calculadora de gastos: se arman los repuestos y la mano de obra con su
// precio, se ve el total en vivo y al final se elige el cliente para mandarle
// el detalle por WhatsApp y/o guardarlo como servicio de su auto. No guarda
// nada por sí sola.
export function CalculadoraPage() {
  const {
    register,
    control,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { servicios: [itemVacio()] },
  })
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'servicios',
  })
  const valores = useWatch({ control, name: 'servicios' })

  // Cuenta en vivo: tolera renglones a medio completar (lo inválido suma 0).
  const parciales = (valores ?? []).map((v) => {
    const cantidad = aNumero(v.cantidad ?? '')
    const precio = aNumero(v.precio ?? '')
    return {
      tipo: v.tipo,
      descripcion: v.descripcion ?? '',
      cantidad: cantidad > 0 ? cantidad : 0,
      precio: (v.precio ?? '').trim() === '' || !(precio >= 0) ? null : precio,
    }
  })
  const desglose = desgloseItems(parciales)

  // Renglones completos y válidos: los que se pueden enviar o guardar.
  const validos = schema.safeParse({ servicios: valores })
  const items = validos.success ? validos.data.servicios.map(itemAInput) : null

  function otroRenglon() {
    append(itemVacio())
    // Deja el cursor listo en el renglón nuevo.
    setTimeout(() => setFocus(`servicios.${fields.length}.descripcion`), 0)
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Calculadora de gastos</h1>
        <p className="text-muted-foreground text-sm">
          Sumá repuestos y mano de obra, mirá el total y al final elegí el
          cliente.
        </p>
      </div>

      <form className="flex flex-col gap-3" noValidate>
        {fields.map((campo, i) => {
          const e = errors.servicios?.[i]
          return (
            <Card key={campo.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm font-medium">
                    Renglón {i + 1}
                  </p>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Quitar renglón ${i + 1}`}
                      onClick={() => remove(i)}
                    >
                      <X />
                    </Button>
                  )}
                </div>
                <Controller
                  control={control}
                  name={`servicios.${i}.tipo`}
                  render={({ field }) => (
                    <TipoItemSelector
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FormField
                  id={`calc-${i}-descripcion`}
                  label="¿Qué es?"
                  error={e?.descripcion?.message}
                >
                  <Input
                    id={`calc-${i}-descripcion`}
                    autoComplete="off"
                    placeholder="Ej: Pastillas de freno"
                    {...register(`servicios.${i}.descripcion`)}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    id={`calc-${i}-cantidad`}
                    label="Cantidad"
                    error={e?.cantidad?.message}
                  >
                    <Input
                      id={`calc-${i}-cantidad`}
                      inputMode="decimal"
                      autoComplete="off"
                      {...register(`servicios.${i}.cantidad`)}
                    />
                  </FormField>
                  <FormField
                    id={`calc-${i}-precio`}
                    label="Precio"
                    error={e?.precio?.message}
                  >
                    <Input
                      id={`calc-${i}-precio`}
                      inputMode="decimal"
                      autoComplete="off"
                      {...register(`servicios.${i}.precio`)}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>
          )
        })}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={otroRenglon}
          >
            <Plus /> Añadir renglón
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => reset({ servicios: [itemVacio()] })}
          >
            <RotateCcw /> Limpiar
          </Button>
        </div>
      </form>

      <CuadroCuenta desglose={desglose} />

      <DestinoCalculo items={items} />
    </div>
  )
}
