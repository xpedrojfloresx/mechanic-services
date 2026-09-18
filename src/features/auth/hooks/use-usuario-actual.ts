import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/auth-context'

export function useUsuarioActual() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['usuario-actual', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      return data
    },
  })
}
