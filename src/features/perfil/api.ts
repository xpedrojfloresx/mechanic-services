import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// logo: undefined = sin cambios, '' = quitarlo, otro valor = imagen nueva (data URL).
export type PerfilInput = {
  nombreMecanico: string
  nombreTaller: string
  logo?: string
}

// El nombre del mecánico se lee con useUsuarioActual y el taller (nombre y
// logo) con useTallerActual; esta mutación guarda ambos.
export function useGuardarPerfil() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: PerfilInput) => {
      const { error } = await supabase.rpc('guardar_perfil', {
        p_nombre_mecanico: values.nombreMecanico,
        p_nombre_taller: values.nombreTaller,
        p_logo: values.logo,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuario-actual'] })
      queryClient.invalidateQueries({ queryKey: ['taller-actual'] })
    },
  })
}
