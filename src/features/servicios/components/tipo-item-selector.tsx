import { Button } from '@/components/ui/button'
import { TIPOS_ITEM, type TipoItem } from '@/features/servicios/items'

// Dos botones grandes para elegir si el renglón es un repuesto o mano de obra.
export function TipoItemSelector({
  value,
  onChange,
  size = 'default',
}: {
  value: TipoItem
  onChange: (tipo: TipoItem) => void
  size?: 'default' | 'sm'
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
      {TIPOS_ITEM.map((t) => (
        <Button
          key={t.value}
          type="button"
          size={size}
          variant={value === t.value ? 'default' : 'outline'}
          aria-pressed={value === t.value}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}
