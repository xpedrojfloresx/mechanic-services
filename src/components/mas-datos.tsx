import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type MasDatosProps = {
  titulo?: string
  // Abierto desde el principio (ej. al editar algo que ya tiene datos).
  abiertoInicial?: boolean
  // Si algún campo de adentro tiene un error, se abre solo para que se vea.
  conError?: boolean
  children: React.ReactNode
}

// Modo ágil: los campos avanzados van plegados y no estorban al cargar rápido.
// Los campos siguen montados aunque estén ocultos, así se guardan igual.
export function MasDatos({
  titulo = 'Más datos (opcional)',
  abiertoInicial = false,
  conError = false,
  children,
}: MasDatosProps) {
  const [abierto, setAbierto] = useState(abiertoInicial)
  const visible = abierto || conError

  return (
    <div>
      <button
        type="button"
        aria-expanded={visible}
        onClick={() => setAbierto(!abierto)}
        className="text-muted-foreground flex items-center gap-1 text-sm"
      >
        <ChevronDown
          className={cn('size-4 transition-transform', visible && 'rotate-180')}
        />
        {titulo}
      </button>
      <div className={cn('mt-3 flex flex-col gap-4', !visible && 'hidden')}>
        {children}
      </div>
    </div>
  )
}
