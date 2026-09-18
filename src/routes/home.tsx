import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { supabase } from '@/lib/supabase'

export function HomePage() {
  const { user } = useAuth()
  const { data: usuario, isLoading } = useUsuarioActual()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Gestión de Talleres</h1>
      <p className="text-muted-foreground">
        Sesión iniciada como {user?.email}
      </p>
      {isLoading && (
        <p className="text-muted-foreground text-sm">Cargando perfil...</p>
      )}
      {usuario && (
        <p className="text-sm">
          Taller: <span className="font-mono">{usuario.taller_id}</span>
        </p>
      )}
      <Button variant="outline" onClick={() => supabase.auth.signOut()}>
        Cerrar sesión
      </Button>
    </div>
  )
}
