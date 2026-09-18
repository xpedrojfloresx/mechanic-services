import { useQuery } from '@tanstack/react-query'
import { escaparLike } from '@/lib/like'
import { supabase } from '@/lib/supabase'
import { normalizarPatente } from '@/features/vehiculos/patente'

export const MIN_CARACTERES_BUSQUEDA = 2

export function useBusqueda(termino: string) {
  const q = termino.trim()

  return useQuery({
    queryKey: ['busqueda', q],
    enabled: q.length >= MIN_CARACTERES_BUSQUEDA,
    queryFn: async () => {
      const patente = normalizarPatente(q)

      const [vehiculos, clientes] = await Promise.all([
        patente.length >= MIN_CARACTERES_BUSQUEDA
          ? supabase
              .from('vehiculos')
              .select('*, clientes(id, nombre, telefono)')
              .ilike('patente', `%${patente}%`)
              .order('patente')
              .limit(20)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('clientes')
          .select('*')
          .ilike('nombre', `%${escaparLike(q)}%`)
          .order('nombre')
          .limit(20),
      ])

      if (vehiculos.error) throw vehiculos.error
      if (clientes.error) throw clientes.error

      return { vehiculos: vehiculos.data, clientes: clientes.data }
    },
  })
}
