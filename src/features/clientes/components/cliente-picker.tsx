import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useClientesPorNombre } from '@/features/clientes/api'
import type { Tables } from '@/lib/database.types'

type ClientePickerProps = {
  onElegir: (cliente: Tables<'clientes'>) => void
  // Cliente que no se ofrece (ej. el dueño actual al cambiar de dueño).
  excluirId?: string
}

// Busca un cliente que ya existe por nombre y lo devuelve al tocarlo.
export function ClientePicker({ onElegir, excluirId }: ClientePickerProps) {
  const [texto, setTexto] = useState('')
  const { data } = useClientesPorNombre(texto)
  const clientes = data?.filter((c) => c.id !== excluirId)

  return (
    <div className="flex flex-col gap-2">
      <Input
        autoFocus
        autoComplete="off"
        placeholder="Buscar cliente por nombre"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      {clientes?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No encontramos ese cliente.
        </p>
      )}
      {clientes?.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onElegir(c)}
          className="hover:bg-muted flex items-center justify-between gap-2 rounded-md border p-3 text-left text-sm"
        >
          <span className="font-medium">{c.nombre}</span>
          <span className="text-muted-foreground">{c.telefono}</span>
        </button>
      ))}
    </div>
  )
}
