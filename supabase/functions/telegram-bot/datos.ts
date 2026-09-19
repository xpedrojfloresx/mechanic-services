// Acceso a la base de la app desde el bot. Usa la clave de servidor de
// Supabase (la provee el entorno de las Edge Functions; nunca va en el repo):
// se salta el RLS, por eso SOLO se llama a las funciones bot_* de la base, que
// filtran por el taller del usuario de Telegram. Nada de consultas sueltas.
import { createClient } from 'npm:@supabase/supabase-js@2'

export function entorno(nombre: string) {
  const valor = Deno.env.get(nombre)
  if (!valor) throw new Error(`Falta el secreto ${nombre}`)
  return valor
}

const db = createClient(
  entorno('SUPABASE_URL'),
  entorno('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
)

export async function rpc<T = unknown>(
  funcion: string,
  argumentos: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await db.rpc(funcion, argumentos)
  if (error) throw error
  return data as T
}
