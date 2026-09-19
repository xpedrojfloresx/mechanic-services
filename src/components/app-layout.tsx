import {
  Bell,
  CarFront,
  LayoutDashboard,
  LogOut,
  Users,
  Wrench,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/features/auth/auth-context'
import { useTallerActual } from '@/features/auth/hooks/use-taller-actual'
import { BuscadorGlobal } from '@/features/busqueda/components/buscador-global'
import { ProponerProximoServicio } from '@/features/recordatorios/components/proponer-proximo-servicio'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const secciones = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/servicios', label: 'Servicios', icon: Wrench, end: false },
  { to: '/recordatorios', label: 'Recordatorios', icon: Bell, end: false },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
]

function AppSidebar() {
  const { user } = useAuth()
  const { data: taller } = useTallerActual()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 p-4">
        <div>
          <p className="font-semibold">{taller?.nombre ?? 'Talleres'}</p>
          <p className="text-muted-foreground text-xs">Mechanic Services</p>
        </div>
        <Button asChild onClick={() => setOpenMobile(false)}>
          <Link to="/recibir">
            <CarFront /> Recibir vehículo
          </Link>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {secciones.map((s) => (
                <SidebarMenuItem key={s.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={s.to}
                      end={s.end}
                      onClick={() => setOpenMobile(false)}
                      className="aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium"
                    >
                      <s.icon />
                      <span>{s.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 p-4">
        <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut /> Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

// Barra inferior para el celular: lo que más se usa, siempre a un toque.
function BarraInferior() {
  const item = (
    to: string,
    label: string,
    Icono: typeof Users,
    end = false,
  ) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs',
          isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
        )
      }
    >
      <Icono className="size-5" />
      {label}
    </NavLink>
  )

  return (
    <nav className="bg-background fixed inset-x-0 bottom-0 z-20 flex items-center border-t pb-[env(safe-area-inset-bottom)] md:hidden">
      {item('/', 'Inicio', LayoutDashboard, true)}
      {item('/servicios', 'Servicios', Wrench)}
      <Link
        to="/recibir"
        className="bg-primary text-primary-foreground -mt-5 flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-xs font-medium shadow-md"
      >
        <CarFront className="size-6" />
        Recibir
      </Link>
      {item('/clientes', 'Clientes', Users)}
    </nav>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <TooltipProvider>
      <a
        href="#contenido"
        className="bg-background text-foreground sr-only rounded-md border px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Saltar al contenido
      </a>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            {/* key: al cambiar de pantalla el buscador se limpia solo */}
            <BuscadorGlobal key={pathname} />
          </header>
          <div
            id="contenido"
            className="mx-auto w-full max-w-4xl px-4 py-6 pb-28 md:pb-6"
          >
            <Outlet />
          </div>
        </SidebarInset>
        <BarraInferior />
        <ProponerProximoServicio />
      </SidebarProvider>
    </TooltipProvider>
  )
}
