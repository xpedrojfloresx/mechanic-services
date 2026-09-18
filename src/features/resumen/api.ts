import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useConteos() {
  return useQuery({
    queryKey: ['conteos'],
    queryFn: async () => {
      const [clientes, vehiculos] = await Promise.all([
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('vehiculos').select('*', { count: 'exact', head: true }),
      ])
      if (clientes.error) throw clientes.error
      if (vehiculos.error) throw vehiculos.error
      return { clientes: clientes.count ?? 0, vehiculos: vehiculos.count ?? 0 }
    },
  })
}
