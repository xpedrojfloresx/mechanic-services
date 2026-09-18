import { cn } from '@/lib/utils'

const tamanos = {
  sm: 'h-5 px-1.5 text-xs',
  md: 'h-6 px-2 text-sm',
  lg: 'h-8 px-2.5 text-lg',
}

// La patente es lo que más se busca con la vista en el taller: se muestra como
// una chapa (borde grueso, monoespaciada) y no como una etiqueta más.
export function Patente({
  children,
  size = 'md',
  className,
}: {
  children: React.ReactNode
  size?: keyof typeof tamanos
  className?: string
}) {
  return (
    <span
      className={cn(
        'border-foreground/70 bg-card text-foreground inline-flex shrink-0 items-center rounded-md border-2 font-mono font-semibold tracking-wider uppercase',
        tamanos[size],
        className,
      )}
    >
      {children}
    </span>
  )
}
