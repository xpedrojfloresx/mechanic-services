import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/lib/database.types'

export type VehiculoInput = Omit<TablesInsert<'vehiculos'>, 'taller_id'>

export function useVehiculosDeCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['vehiculos', 'cliente', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('cliente_id', clienteId!)
        .order('patente')
      if (error) throw error
      return data
    },
  })
}

export function useVehiculo(id: string | undefined) {
  return useQuery({
    queryKey: ['vehiculos', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*, clientes(id, nombre, telefono)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useGuardarVehiculo(tallerId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string
      values: VehiculoInput
    }) => {
      if (id) {
        const { data, error } = await supabase
          .from('vehiculos')
          .update(values)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return data
      }
      if (!tallerId) throw new Error('Falta el taller del usuario')
      const { data, error } = await supabase
        .from('vehiculos')
        .insert({ ...values, taller_id: tallerId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehiculos'] })
      queryClient.invalidateQueries({ queryKey: ['busqueda'] })
    },
  })
}
