import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'

export type IngresoInput = {
  fecha_ingreso: string
  km_al_ingreso: number
  motivo_ingreso: string | null
  estado_al_ingreso: string | null
  observaciones: string | null
}

export function useServiciosDeVehiculo(vehiculoId: string | undefined) {
  return useQuery({
    queryKey: ['servicios', 'vehiculo', vehiculoId],
    enabled: !!vehiculoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('vehiculo_id', vehiculoId!)
        .order('fecha_ingreso', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCrearIngreso(tallerId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      vehiculoId,
      values,
    }: {
      vehiculoId: string
      values: IngresoInput
    }) => {
      if (!tallerId) throw new Error('Falta el taller del usuario')
      const { data, error } = await supabase
        .from('servicios')
        .insert({ ...values, vehiculo_id: vehiculoId, taller_id: tallerId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] })
    },
  })
}

// Cliente + vehículo + ingreso opcionales en una sola transacción (función SQL).
export function useCrearClienteCompleto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: {
      cliente: Json
      vehiculo: Json | null
      ingreso: Json | null
    }) => {
      const { data, error } = await supabase.rpc('crear_cliente_completo', {
        p_cliente: args.cliente,
        p_vehiculo: args.vehiculo ?? undefined,
        p_ingreso: args.ingreso ?? undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      for (const key of [
        'clientes',
        'vehiculos',
        'servicios',
        'busqueda',
        'conteos',
        'serie-altas',
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}
