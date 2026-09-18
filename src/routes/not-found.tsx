import { SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

// Cualquier dirección que no existe cae acá, con una salida clara.
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md items-center px-4">
      <EmptyState
        icon={SearchX}
        titulo="No encontramos esa página"
        texto="Puede que el link esté mal o que ya no exista."
      >
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </EmptyState>
    </div>
  )
}
