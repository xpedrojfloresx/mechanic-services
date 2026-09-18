import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Json, TablesUpdate } from '@/lib/database.types'
import type { Estado } from './estados'

export type IngresoInput = {
  fecha_ingreso: string
  km_al_ingreso: number
  motivo_ingreso: string | null
  estado_al_ingreso: string | null
  observaciones?: string | null
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

// Vehículo + ingreso en una sola transacción (función SQL).
export function useCrearVehiculoConIngreso() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: {
      clienteId: string
      vehiculo: Json
      ingreso: Json
    }) => {
      const { data, error } = await supabase.rpc('crear_vehiculo_con_ingreso', {
        p_cliente_id: args.clienteId,
        p_vehiculo: args.vehiculo,
        p_ingreso: args.ingreso,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      for (const key of [
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

const SELECT_CON_VEHICULO =
  '*, vehiculos(id, patente, marca, modelo, clientes(id, nombre, telefono))'

export function useServicios(estado: Estado | 'todos') {
  return useQuery({
    queryKey: ['servicios', 'lista', estado],
    queryFn: async () => {
      let consulta = supabase
        .from('servicios')
        .select(SELECT_CON_VEHICULO)
        .order('fecha_ingreso', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200)
      if (estado !== 'todos') consulta = consulta.eq('estado', estado)
      const { data, error } = await consulta
      if (error) throw error
      return data
    },
  })
}

export function useServicio(id: string | undefined) {
  return useQuery({
    queryKey: ['servicios', 'detalle', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicios')
        .select(SELECT_CON_VEHICULO)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
  })
}

function invalidarServicios(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of ['servicios', 'items', 'conteos']) {
    queryClient.invalidateQueries({ queryKey: [key] })
  }
}

export function useActualizarServicio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: TablesUpdate<'servicios'>
    }) => {
      const { data, error } = await supabase
        .from('servicios')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidarServicios(queryClient),
  })
}

export function useEliminarServicio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('servicios').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidarServicios(queryClient),
  })
}

export type ItemInput = {
  descripcion: string
  cantidad: number
  precio: number | null
}

export function useItems(servicioId: string | undefined) {
  return useQuery({
    queryKey: ['items', servicioId],
    enabled: !!servicioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicio_items')
        .select('*')
        .eq('servicio_id', servicioId!)
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useGuardarItem(tallerId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      servicioId,
      itemId,
      values,
    }: {
      servicioId: string
      itemId?: string
      values: ItemInput
    }) => {
      if (itemId) {
        const { error } = await supabase
          .from('servicio_items')
          .update(values)
          .eq('id', itemId)
        if (error) throw error
        return
      }
      if (!tallerId) throw new Error('Falta el taller del usuario')
      const { error } = await supabase
        .from('servicio_items')
        .insert({ ...values, servicio_id: servicioId, taller_id: tallerId })
      if (error) throw error
    },
    onSuccess: () => invalidarServicios(queryClient),
  })
}

export function useEliminarItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('servicio_items')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidarServicios(queryClient),
  })
}
