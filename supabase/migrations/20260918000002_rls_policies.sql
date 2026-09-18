-- RLS: aislamiento de datos por taller_id.
--
-- Estrategia:
-- 1. public.current_taller_id() devuelve el taller_id del usuario logueado
--    (SECURITY DEFINER para poder leer public.usuarios sin recursion de RLS).
-- 2. Triggers BEFORE INSERT derivan taller_id automaticamente desde la fila
--    padre (o desde current_taller_id() para clientes, que no tiene padre),
--    asi el front nunca necesita mandar taller_id "a mano".
-- 3. Las policies usan taller_id = current_taller_id() tanto para
--    lectura/escritura como para WITH CHECK, como defensa en profundidad:
--    si alguien intenta enlazar un registro a un padre de otro taller, el
--    trigger deriva el taller_id real del padre (de otro taller) y el
--    WITH CHECK lo rechaza.

create function public.current_taller_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select taller_id from public.usuarios where id = auth.uid();
$$;

revoke all on function public.current_taller_id() from public;
grant execute on function public.current_taller_id() to authenticated;

-- ============================================================
-- Triggers: derivar taller_id automaticamente en cada insert
-- ============================================================

create function public.set_taller_id_from_current_user()
returns trigger
language plpgsql
as $$
begin
  if new.taller_id is null then
    new.taller_id := public.current_taller_id();
  end if;
  return new;
end;
$$;

create function public.set_taller_id_from_cliente()
returns trigger
language plpgsql
as $$
begin
  if new.taller_id is null then
    select taller_id into new.taller_id
    from public.clientes
    where id = new.cliente_id;
  end if;
  return new;
end;
$$;

create function public.set_taller_id_from_vehiculo()
returns trigger
language plpgsql
as $$
begin
  if new.taller_id is null then
    select taller_id into new.taller_id
    from public.vehiculos
    where id = new.vehiculo_id;
  end if;
  return new;
end;
$$;

create function public.set_taller_id_from_servicio()
returns trigger
language plpgsql
as $$
begin
  if new.taller_id is null then
    select taller_id into new.taller_id
    from public.servicios
    where id = new.servicio_id;
  end if;
  return new;
end;
$$;

create trigger set_taller_id before insert on public.clientes
for each row execute function public.set_taller_id_from_current_user();

create trigger set_taller_id before insert on public.vehiculos
for each row execute function public.set_taller_id_from_cliente();

create trigger set_taller_id before insert on public.servicios
for each row execute function public.set_taller_id_from_vehiculo();

create trigger set_taller_id before insert on public.servicio_items
for each row execute function public.set_taller_id_from_servicio();

create trigger set_taller_id before insert on public.recordatorios
for each row execute function public.set_taller_id_from_vehiculo();

-- ============================================================
-- updated_at automatico
-- ============================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.clientes
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.vehiculos
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.servicios
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.recordatorios
for each row execute function public.set_updated_at();

-- ============================================================
-- Activar RLS
-- ============================================================

alter table public.talleres enable row level security;
alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.vehiculos enable row level security;
alter table public.servicios enable row level security;
alter table public.servicio_items enable row level security;
alter table public.recordatorios enable row level security;

-- talleres: cada usuario ve solo su propio taller.
create policy "talleres: ver el propio" on public.talleres
for select to authenticated
using (id = public.current_taller_id());

-- usuarios: cada usuario ve a los usuarios de su propio taller.
create policy "usuarios: ver los del propio taller" on public.usuarios
for select to authenticated
using (taller_id = public.current_taller_id());

-- clientes
create policy "clientes: select propio taller" on public.clientes
for select to authenticated
using (taller_id = public.current_taller_id());

create policy "clientes: insert propio taller" on public.clientes
for insert to authenticated
with check (taller_id = public.current_taller_id());

create policy "clientes: update propio taller" on public.clientes
for update to authenticated
using (taller_id = public.current_taller_id())
with check (taller_id = public.current_taller_id());

create policy "clientes: delete propio taller" on public.clientes
for delete to authenticated
using (taller_id = public.current_taller_id());

-- vehiculos
create policy "vehiculos: select propio taller" on public.vehiculos
for select to authenticated
using (taller_id = public.current_taller_id());

create policy "vehiculos: insert propio taller" on public.vehiculos
for insert to authenticated
with check (taller_id = public.current_taller_id());

create policy "vehiculos: update propio taller" on public.vehiculos
for update to authenticated
using (taller_id = public.current_taller_id())
with check (taller_id = public.current_taller_id());

create policy "vehiculos: delete propio taller" on public.vehiculos
for delete to authenticated
using (taller_id = public.current_taller_id());

-- servicios
create policy "servicios: select propio taller" on public.servicios
for select to authenticated
using (taller_id = public.current_taller_id());

create policy "servicios: insert propio taller" on public.servicios
for insert to authenticated
with check (taller_id = public.current_taller_id());

create policy "servicios: update propio taller" on public.servicios
for update to authenticated
using (taller_id = public.current_taller_id())
with check (taller_id = public.current_taller_id());

create policy "servicios: delete propio taller" on public.servicios
for delete to authenticated
using (taller_id = public.current_taller_id());

-- servicio_items
create policy "servicio_items: select propio taller" on public.servicio_items
for select to authenticated
using (taller_id = public.current_taller_id());

create policy "servicio_items: insert propio taller" on public.servicio_items
for insert to authenticated
with check (taller_id = public.current_taller_id());

create policy "servicio_items: update propio taller" on public.servicio_items
for update to authenticated
using (taller_id = public.current_taller_id())
with check (taller_id = public.current_taller_id());

create policy "servicio_items: delete propio taller" on public.servicio_items
for delete to authenticated
using (taller_id = public.current_taller_id());

-- recordatorios
create policy "recordatorios: select propio taller" on public.recordatorios
for select to authenticated
using (taller_id = public.current_taller_id());

create policy "recordatorios: insert propio taller" on public.recordatorios
for insert to authenticated
with check (taller_id = public.current_taller_id());

create policy "recordatorios: update propio taller" on public.recordatorios
for update to authenticated
using (taller_id = public.current_taller_id())
with check (taller_id = public.current_taller_id());

create policy "recordatorios: delete propio taller" on public.recordatorios
for delete to authenticated
using (taller_id = public.current_taller_id());
