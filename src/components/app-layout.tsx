import {
  Bell,
  LayoutDashboard,
  LogOut,
  Plus,
  Users,
  Wrench,
} from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import { supabase } from '@/lib/supabase'

const secciones = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/servicios', label: 'Servicios', icon: Wrench, end: false },
]

// Secciones de fases futuras: se muestran deshabilitadas para dar el panorama.
const proximamente = [{ label: 'Recordatorios', icon: Bell }]

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
        <Button asChild size="sm" onClick={() => setOpenMobile(false)}>
          <Link to="/clientes/nuevo">
            <Plus /> Nuevo cliente
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

        <SidebarGroup>
          <SidebarGroupLabel>Próximamente</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {proximamente.map((s) => (
                <SidebarMenuItem key={s.label}>
                  <SidebarMenuButton disabled>
                    <s.icon />
                    <span>{s.label}</span>
                    <Badge variant="outline" className="ml-auto">
                      Pronto
                    </Badge>
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

export function AppLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <span className="font-medium">Panel</span>
          </header>
          <main className="mx-auto w-full max-w-4xl px-4 py-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
