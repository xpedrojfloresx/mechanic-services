import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/lib/database.types'

export type ClienteInput = Omit<TablesInsert<'clientes'>, 'taller_id'>

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre')
      if (error) throw error
      return data
    },
  })
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ['clientes', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useClientesRecientes() {
  return useQuery({
    queryKey: ['clientes', 'recientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data
    },
  })
}

export function useGuardarCliente(tallerId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string
      values: ClienteInput
    }) => {
      if (id) {
        const { data, error } = await supabase
          .from('clientes')
          .update(values)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return data
      }
      if (!tallerId) throw new Error('Falta el taller del usuario')
      const { data, error } = await supabase
        .from('clientes')
        .insert({ ...values, taller_id: tallerId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['busqueda'] })
    },
  })
}
