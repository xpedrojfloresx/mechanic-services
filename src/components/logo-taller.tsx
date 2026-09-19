import { Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

// Logo del taller; si todavía no cargaron uno, un ícono de llave en el acento.
export function LogoTaller({
  logo,
  className,
}: {
  logo: string | null | undefined
  className?: string
}) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className={cn('size-10 shrink-0 rounded-lg object-contain', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg',
        className,
      )}
    >
      <Wrench className="size-5" />
    </span>
  )
}
