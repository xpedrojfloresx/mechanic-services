import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'

// RLS solo deja ver el taller propio, por eso alcanza con .single()
export function useTallerActual() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['taller-actual', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('talleres')
        .select('*')
        .single()
      if (error) throw error
      return data
    },
  })
}
