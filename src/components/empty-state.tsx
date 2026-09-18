import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  titulo: string
  texto?: string
  children?: React.ReactNode
}

// Estado vacío: en vez de un texto gris suelto, dice qué falta y qué hacer.
export function EmptyState({
  icon: Icono,
  titulo,
  texto,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
        <Icono className="size-6" />
      </div>
      <p className="font-medium">{titulo}</p>
      {texto && (
        <p className="text-muted-foreground max-w-xs text-sm">{texto}</p>
      )}
      {children}
    </div>
  )
}
