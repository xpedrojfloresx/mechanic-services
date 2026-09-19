import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Json, TablesUpdate } from '@/lib/database.types'
import { valoresCambioEstado, type Estado } from './estados'

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

export function useServicios(estado: Estado | 'todos' | 'en_curso') {
  return useQuery({
    queryKey: ['servicios', 'lista', estado],
    queryFn: async () => {
      let consulta = supabase
        .from('servicios')
        .select(SELECT_CON_VEHICULO)
        .order('fecha_ingreso', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200)
      if (estado === 'en_curso') {
        // En el taller ahora: primero lo que vence antes (lo prometido), sin
        // fecha prometida después; en cada grupo, lo más viejo primero.
        consulta = supabase
          .from('servicios')
          .select(SELECT_CON_VEHICULO)
          .in('estado', ['en_taller', 'listo'])
          .order('fecha_prometida', { ascending: true, nullsFirst: false })
          .order('fecha_ingreso', { ascending: true })
          .order('created_at', { ascending: true })
          .limit(200)
      } else if (estado !== 'todos') {
        consulta = consulta.eq('estado', estado)
      }
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
  tipo: 'repuesto' | 'mano_de_obra'
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

// Después de crear cliente/vehículo + ingreso por función SQL, busca el
// servicio recién creado (el más nuevo de esa patente) para ir directo a él.
export async function buscarUltimoServicioIdPorPatente(patente: string) {
  const { data, error } = await supabase
    .from('servicios')
    .select('id, vehiculos!inner(patente)')
    .eq('vehiculos.patente', patente)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data[0]?.id ?? null
}

// Varios servicios (renglones) de una sola vez sobre un ingreso.
export function useGuardarItems(tallerId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      servicioId,
      items,
    }: {
      servicioId: string
      items: ItemInput[]
    }) => {
      if (!tallerId) throw new Error('Falta el taller del usuario')
      const { error } = await supabase.from('servicio_items').insert(
        items.map((i) => ({
          ...i,
          servicio_id: servicioId,
          taller_id: tallerId,
        })),
      )
      if (error) throw error
    },
    onSuccess: () => invalidarServicios(queryClient),
  })
}

// "Ya se entregó": cierra uno o varios ingresos abiertos con fecha de hoy.
export function useCerrarServicios() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('servicios')
        .update(valoresCambioEstado('entregado', null))
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => invalidarServicios(queryClient),
  })
}
