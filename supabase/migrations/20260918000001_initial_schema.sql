-- Esquema inicial: talleres, usuarios, clientes, vehiculos, servicios,
-- servicio_items, recordatorios. Arquitectura single-tenant-ready: todas las
-- tablas de datos de negocio llevan taller_id, con RLS activado en la
-- migracion siguiente.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ============================================================
-- talleres: tenant raiz
-- ============================================================
create table public.talleres (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- usuarios: perfil de cada usuario de Supabase Auth, asociado a un taller.
-- El id coincide con auth.users.id (se crea a mano por ahora; no hay
-- registro self-service todavia).
-- ============================================================
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  taller_id uuid not null references public.talleres (id) on delete restrict,
  email text not null,
  rol text not null default 'owner',
  created_at timestamptz not null default now()
);

create index usuarios_taller_id_idx on public.usuarios (taller_id);

-- ============================================================
-- clientes
-- ============================================================
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres (id) on delete restrict,
  nombre text not null,
  telefono text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clientes_taller_id_idx on public.clientes (taller_id);
-- Busqueda rapida por nombre (parcial, insensible a mayusculas) por taller.
create index clientes_nombre_trgm_idx on public.clientes using gin (
  nombre gin_trgm_ops
);

-- ============================================================
-- vehiculos
-- ============================================================
create table public.vehiculos (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres (id) on delete restrict,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  marca text not null,
  modelo text not null,
  anio integer,
  patente text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehiculos_taller_id_idx on public.vehiculos (taller_id);
create index vehiculos_cliente_id_idx on public.vehiculos (cliente_id);
-- Patente unica por taller (ya normalizada en mayusculas sin espacios/guiones
-- por la app antes de insertar).
create unique index vehiculos_taller_patente_key on public.vehiculos (
  taller_id, patente
);
create index vehiculos_patente_trgm_idx on public.vehiculos using gin (
  patente gin_trgm_ops
);

-- ============================================================
-- servicios
-- ============================================================
create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres (id) on delete restrict,
  vehiculo_id uuid not null references public.vehiculos (id) on delete restrict,
  fecha_ingreso date not null default current_date,
  fecha_entrega date,
  km_al_ingreso integer not null,
  observaciones text,
  estado text,
  total numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index servicios_taller_id_idx on public.servicios (taller_id);
create index servicios_vehiculo_id_idx on public.servicios (
  vehiculo_id, fecha_ingreso desc
);

-- ============================================================
-- servicio_items: repuestos / mano de obra de un servicio
-- ============================================================
create table public.servicio_items (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres (id) on delete restrict,
  servicio_id uuid not null references public.servicios (id) on delete cascade,
  descripcion text not null,
  cantidad numeric(10, 2) not null default 1,
  precio numeric(12, 2),
  created_at timestamptz not null default now()
);

create index servicio_items_taller_id_idx on public.servicio_items (
  taller_id
);
create index servicio_items_servicio_id_idx on public.servicio_items (
  servicio_id
);

-- ============================================================
-- recordatorios: proximos servicios por km y/o fecha
-- ============================================================
create table public.recordatorios (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid not null references public.talleres (id) on delete restrict,
  vehiculo_id uuid not null references public.vehiculos (id) on delete cascade,
  tipo text not null check (tipo in ('km', 'fecha')),
  target_km integer,
  fecha_estimada date not null,
  nota text,
  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'hecho')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recordatorios_taller_id_idx on public.recordatorios (taller_id);
create index recordatorios_vehiculo_id_idx on public.recordatorios (
  vehiculo_id
);
create index recordatorios_fecha_estimada_idx on public.recordatorios (
  fecha_estimada
) where estado = 'pendiente';
