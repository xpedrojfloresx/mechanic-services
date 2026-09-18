import { NavLink, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Buscar', end: true },
  { to: '/clientes', label: 'Clientes', end: false },
]

export function AppLayout() {
  const { user } = useAuth()

  return (
    <div className="min-h-svh">
      <header className="bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <nav className="flex items-center gap-4">
            <span className="font-semibold">Talleres</span>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'text-sm',
                    isActive
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => supabase.auth.signOut()}
            >
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
