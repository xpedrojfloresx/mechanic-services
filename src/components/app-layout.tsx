import {
  ArrowLeft,
  Bell,
  Calculator,
  CarFront,
  ChartColumnIncreasing,
  LayoutDashboard,
  LogOut,
  Users,
  Wrench,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
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
import { LogoTaller } from '@/components/logo-taller'
import { useAuth } from '@/features/auth/auth-context'
import { useTallerActual } from '@/features/auth/hooks/use-taller-actual'
import { useUsuarioActual } from '@/features/auth/hooks/use-usuario-actual'
import { BuscadorGlobal } from '@/features/busqueda/components/buscador-global'
import { ProponerProximoServicio } from '@/features/recordatorios/components/proponer-proximo-servicio'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const secciones = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/servicios', label: 'Servicios', icon: Wrench, end: false },
  { to: '/recordatorios', label: 'Recordatorios', icon: Bell, end: false },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/calculadora', label: 'Calculadora', icon: Calculator, end: false },
  // Solo en el menú lateral (no en la barra de abajo del celu): es la parte más técnica.
  {
    to: '/insights',
    label: 'Insights',
    icon: ChartColumnIncreasing,
    end: false,
  },
]

function AppSidebar() {
  const { user } = useAuth()
  const { data: taller } = useTallerActual()
  const { data: usuario } = useUsuarioActual()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 p-4">
        <Link
          to="/perfil"
          onClick={() => setOpenMobile(false)}
          className="hover:bg-sidebar-accent -m-2 flex items-center gap-3 rounded-lg p-2"
        >
          <LogoTaller logo={taller?.logo} />
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {taller?.nombre ?? 'Talleres'}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {usuario?.nombre ?? 'Agregá tu nombre'}
            </p>
          </div>
        </Link>
        <Button
          asChild
          className="h-12 text-base md:h-8 md:text-sm"
          onClick={() => setOpenMobile(false)}
        >
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
                  {/* En el celu más grandes: se tocan con el pulgar. */}
                  <SidebarMenuButton
                    asChild
                    className="h-12 gap-3 text-base md:h-8 md:gap-2 md:text-sm [&>svg]:size-5 md:[&>svg]:size-4"
                  >
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
          className="h-10 text-base md:h-7 md:text-[0.8rem]"
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut /> Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

// Barra inferior para el celular: lo que más se usa, siempre a un toque. La
// sección donde se está parado se ve más grande y en el color de acento.
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
          'flex flex-1 flex-col items-center gap-0.5 text-xs',
          isActive
            ? 'bg-primary text-primary-foreground -mt-5 rounded-2xl px-3 py-2 font-medium shadow-md'
            : 'text-muted-foreground py-2',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icono className={isActive ? 'size-6' : 'size-5'} />
          {label}
        </>
      )}
    </NavLink>
  )

  return (
    <nav className="bg-background fixed inset-x-0 bottom-0 z-20 flex items-center gap-1 border-t px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      {item('/', 'Inicio', LayoutDashboard, true)}
      {item('/servicios', 'Servicios', Wrench)}
      {item('/recibir', 'Recibir', CarFront)}
      {item('/clientes', 'Clientes', Users)}
    </nav>
  )
}

// Botón de volver: en todas las pantallas menos Inicio. Vuelve a la pantalla
// anterior; si se entró directo a esta (link, app recién abierta), va a Inicio.
function BotonVolver() {
  const { pathname, key } = useLocation()
  const navigate = useNavigate()
  if (pathname === '/') return null

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10 shrink-0"
      aria-label="Volver"
      onClick={() => (key === 'default' ? navigate('/') : navigate(-1))}
    >
      <ArrowLeft />
    </Button>
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
            <BotonVolver />
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
