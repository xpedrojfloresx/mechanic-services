import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { armarBarras, type Rango } from './rangos'

export function useConteos() {
  return useQuery({
    queryKey: ['conteos'],
    queryFn: async () => {
      const [clientes, vehiculos, enTaller] = await Promise.all([
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('vehiculos').select('*', { count: 'exact', head: true }),
        supabase
          .from('servicios')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'en_taller'),
      ])
      if (clientes.error) throw clientes.error
      if (vehiculos.error) throw vehiculos.error
      if (enTaller.error) throw enTaller.error
      return {
        clientes: clientes.count ?? 0,
        vehiculos: vehiculos.count ?? 0,
        enTaller: enTaller.count ?? 0,
      }
    },
  })
}

// Cantidad de registros creados por período. Se traen solo las fechas y se
// agrupan en el navegador. Ojo: PostgREST devuelve como máximo 1000 filas por
// consulta; si un taller supera eso en un año, conviene pasar esto a una
// función SQL que agrupe en la base.
export function useSerieAltas(tabla: 'clientes' | 'vehiculos', rango: Rango) {
  return useQuery({
    queryKey: ['serie-altas', tabla, rango],
    queryFn: async () => {
      const { barras, desde, claveDe } = armarBarras(rango)
      const { data, error } = await supabase
        .from(tabla)
        .select('created_at')
        .gte('created_at', desde.toISOString())
      if (error) throw error

      const porClave = new Map(barras.map((b) => [b.clave, b]))
      for (const fila of data) {
        const barra = porClave.get(claveDe(new Date(fila.created_at)))
        if (barra) barra.total++
      }
      return barras
    },
  })
}
