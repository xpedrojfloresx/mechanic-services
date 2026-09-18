import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const SELECT_CON_VEHICULO =
  '*, vehiculos(id, patente, marca, modelo, clientes(id, nombre, telefono))'

export type RecordatorioInput = {
  nota: string
  fechaEstimada: string
  targetKm: number | null
}

// Los pendientes ordenados por fecha estimada (lo más urgente primero).
export function useRecordatorios(estado: 'pendiente' | 'hecho') {
  return useQuery({
    queryKey: ['recordatorios', 'lista', estado],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordatorios')
        .select(SELECT_CON_VEHICULO)
        .eq('estado', estado)
        .order('fecha_estimada', { ascending: estado === 'pendiente' })
        .limit(200)
      if (error) throw error
      return data
    },
  })
}

export function useRecordatoriosDeVehiculo(vehiculoId: string | undefined) {
  return useQuery({
    queryKey: ['recordatorios', 'vehiculo', vehiculoId],
    enabled: !!vehiculoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordatorios')
        .select(SELECT_CON_VEHICULO)
        .eq('vehiculo_id', vehiculoId!)
        .eq('estado', 'pendiente')
        .order('fecha_estimada')
      if (error) throw error
      return data
    },
  })
}

function invalidar(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recordatorios'] })
}

export function useCrearRecordatorio(tallerId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      vehiculoId,
      values,
    }: {
      vehiculoId: string
      values: RecordatorioInput
    }) => {
      if (!tallerId) throw new Error('Falta el taller del usuario')
      const { error } = await supabase.from('recordatorios').insert({
        vehiculo_id: vehiculoId,
        taller_id: tallerId,
        nota: values.nota,
        fecha_estimada: values.fechaEstimada,
        target_km: values.targetKm,
        // Con km objetivo es "por km" (igual guarda una fecha estimada);
        // sin km es solo "por fecha".
        tipo: values.targetKm != null ? 'km' : 'fecha',
      })
      if (error) throw error
    },
    onSuccess: () => invalidar(queryClient),
  })
}

export function useMarcarRecordatorio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      estado,
    }: {
      id: string
      estado: 'pendiente' | 'hecho'
    }) => {
      const { error } = await supabase
        .from('recordatorios')
        .update({ estado })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidar(queryClient),
  })
}

export function useEliminarRecordatorio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recordatorios')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidar(queryClient),
  })
}
