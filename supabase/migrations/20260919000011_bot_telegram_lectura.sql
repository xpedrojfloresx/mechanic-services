-- Bot de Telegram por voz, etapa 2a: tablas y funciones de SOLO LECTURA.
-- Diseño en context.md §15. El bot corre en una Edge Function con la clave de
-- servidor de Supabase (que se salta el RLS), así que TODA la seguridad está
-- acá: cada función bot_* recibe el id de Telegram, lo cruza con
-- telegram_usuarios para saber el taller, y filtra por ese taller. No hay SQL
-- libre. Las funciones solo las puede ejecutar service_role.

-- Quién puede usar el bot: cada id de Telegram vinculado a un usuario de la app.
-- El alta se hace a mano por SQL (no va en migraciones).
create table public.telegram_usuarios (
  telegram_user_id bigint primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Mensajes de Telegram ya procesados: Telegram reintenta si tarda, y así no se
-- ejecuta dos veces lo mismo.
create table public.telegram_updates (
  update_id bigint primary key,
  created_at timestamptz not null default now()
);

-- Auditoría: qué se pidió y qué pasó (texto recortado).
create table public.telegram_log (
  id bigint generated always as identity primary key,
  telegram_user_id bigint,
  texto text,
  accion text,
  resultado text,
  created_at timestamptz not null default now()
);

-- RLS sin policies: nadie entra desde la app; solo la clave de servidor.
alter table public.telegram_usuarios enable row level security;
alter table public.telegram_updates enable row level security;
alter table public.telegram_log enable row level security;
revoke all on public.telegram_usuarios from anon, authenticated;
revoke all on public.telegram_updates from anon, authenticated;
revoke all on public.telegram_log from anon, authenticated;

-- Taller del usuario de Telegram; corta con 'no_autorizado' si no está vinculado.
create function public.bot_taller_id(p_telegram_user_id bigint)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taller uuid;
begin
  select u.taller_id into v_taller
  from public.telegram_usuarios t
  join public.usuarios u on u.id = t.usuario_id
  where t.telegram_user_id = p_telegram_user_id;
  if v_taller is null then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;
  return v_taller;
end;
$$;

-- Ficha corta de un vehículo por patente (null si no existe en el taller).
create function public.bot_buscar_vehiculo(
  p_telegram_user_id bigint,
  p_patente text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  r jsonb;
begin
  select jsonb_build_object(
    'patente', v.patente,
    'marca', v.marca,
    'modelo', v.modelo,
    'anio', v.anio,
    'color', v.color,
    'cliente', case when c.id is null then null else jsonb_build_object(
      'nombre', c.nombre, 'telefono', c.telefono) end,
    'ingresos', (select count(*) from public.servicios s where s.vehiculo_id = v.id),
    'abierto', (
      select jsonb_build_object(
        'estado', s.estado,
        'fecha_ingreso', s.fecha_ingreso,
        'fecha_prometida', s.fecha_prometida,
        'motivo', s.motivo_ingreso,
        'total', (select coalesce(sum(i.cantidad * coalesce(i.precio, 0)), 0)
                  from public.servicio_items i where i.servicio_id = s.id))
      from public.servicios s
      where s.vehiculo_id = v.id and s.estado <> 'entregado'
      order by s.fecha_ingreso desc, s.created_at desc
      limit 1),
    'ultimo', (
      select jsonb_build_object(
        'fecha', s.fecha_ingreso,
        'km', s.km_al_ingreso,
        'motivo', s.motivo_ingreso,
        'trabajos', (select coalesce(jsonb_agg(i.descripcion order by i.created_at), '[]'::jsonb)
                     from public.servicio_items i where i.servicio_id = s.id))
      from public.servicios s
      where s.vehiculo_id = v.id
      order by s.fecha_ingreso desc, s.created_at desc
      limit 1)
  ) into r
  from public.vehiculos v
  left join public.clientes c on c.id = v.cliente_id
  where v.taller_id = v_taller and v.patente = upper(p_patente);
  return r;
end;
$$;

-- Lo que hay en el taller ahora (en taller y listos).
create function public.bot_estado_taller(p_telegram_user_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'patente', v.patente,
      'marca', v.marca,
      'modelo', v.modelo,
      'cliente', c.nombre,
      'estado', s.estado,
      'fecha_ingreso', s.fecha_ingreso,
      'fecha_prometida', s.fecha_prometida
    ) order by s.fecha_prometida nulls last, s.fecha_ingreso, s.created_at)
    from public.servicios s
    join public.vehiculos v on v.id = s.vehiculo_id
    left join public.clientes c on c.id = v.cliente_id
    where s.taller_id = v_taller and s.estado in ('en_taller', 'listo')
  ), '[]'::jsonb);
end;
$$;

-- Clientes cuyo nombre contiene el texto (hasta 6).
create function public.bot_buscar_clientes(
  p_telegram_user_id bigint,
  p_nombre text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v_patron text := '%' || replace(replace(replace(btrim(p_nombre), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  if char_length(btrim(p_nombre)) < 2 then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', x.id, 'nombre', x.nombre, 'telefono', x.telefono) order by x.nombre)
    from (
      select c.id, c.nombre, c.telefono
      from public.clientes c
      where c.taller_id = v_taller and c.nombre ilike v_patron
      order by c.nombre
      limit 6
    ) x
  ), '[]'::jsonb);
end;
$$;

-- Todo lo que hay cargado de un cliente.
create function public.bot_ficha_cliente(
  p_telegram_user_id bigint,
  p_cliente_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  r jsonb;
begin
  select jsonb_build_object(
    'nombre', c.nombre,
    'telefono', c.telefono,
    'email', c.email,
    'vehiculos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'patente', v.patente, 'marca', v.marca, 'modelo', v.modelo,
        'anio', v.anio, 'color', v.color) order by v.patente)
      from public.vehiculos v where v.cliente_id = c.id), '[]'::jsonb),
    'servicios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fecha', x.fecha_ingreso, 'patente', x.patente, 'marca', x.marca,
        'modelo', x.modelo, 'estado', x.estado, 'motivo', x.motivo_ingreso,
        'total', x.total) order by x.fecha_ingreso desc, x.created_at desc)
      from (
        select s.fecha_ingreso, s.created_at, s.estado, s.motivo_ingreso,
               v.patente, v.marca, v.modelo,
               (select coalesce(sum(i.cantidad * coalesce(i.precio, 0)), 0)
                from public.servicio_items i where i.servicio_id = s.id) as total
        from public.servicios s
        join public.vehiculos v on v.id = s.vehiculo_id
        where v.cliente_id = c.id
        order by s.fecha_ingreso desc, s.created_at desc
        limit 5
      ) x), '[]'::jsonb),
    'recordatorios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nota', r.nota, 'fecha', r.fecha_estimada, 'patente', v.patente)
        order by r.fecha_estimada)
      from public.recordatorios r
      join public.vehiculos v on v.id = r.vehiculo_id
      where v.cliente_id = c.id and r.estado = 'pendiente'), '[]'::jsonb)
  ) into r
  from public.clientes c
  where c.id = p_cliente_id and c.taller_id = v_taller;
  return r;
end;
$$;

-- Devuelve true si el update es nuevo y false si ya se procesó.
create function public.bot_registrar_update(p_update_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filas int;
begin
  delete from public.telegram_updates where created_at < now() - interval '7 days';
  insert into public.telegram_updates (update_id) values (p_update_id)
  on conflict do nothing;
  get diagnostics v_filas = row_count;
  return v_filas > 0;
end;
$$;

create function public.bot_registrar_log(
  p_telegram_user_id bigint,
  p_texto text,
  p_accion text,
  p_resultado text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.telegram_log (telegram_user_id, texto, accion, resultado)
  values (p_telegram_user_id, left(p_texto, 300), left(p_accion, 60), left(p_resultado, 300));
$$;

-- Solo la clave de servidor (la Edge Function) puede ejecutarlas.
revoke all on function public.bot_taller_id(bigint) from public, anon, authenticated;
revoke all on function public.bot_buscar_vehiculo(bigint, text) from public, anon, authenticated;
revoke all on function public.bot_estado_taller(bigint) from public, anon, authenticated;
revoke all on function public.bot_buscar_clientes(bigint, text) from public, anon, authenticated;
revoke all on function public.bot_ficha_cliente(bigint, uuid) from public, anon, authenticated;
revoke all on function public.bot_registrar_update(bigint) from public, anon, authenticated;
revoke all on function public.bot_registrar_log(bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.bot_taller_id(bigint) to service_role;
grant execute on function public.bot_buscar_vehiculo(bigint, text) to service_role;
grant execute on function public.bot_estado_taller(bigint) to service_role;
grant execute on function public.bot_buscar_clientes(bigint, text) to service_role;
grant execute on function public.bot_ficha_cliente(bigint, uuid) to service_role;
grant execute on function public.bot_registrar_update(bigint) to service_role;
grant execute on function public.bot_registrar_log(bigint, text, text, text) to service_role;
