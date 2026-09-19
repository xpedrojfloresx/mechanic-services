-- Bot de Telegram: encontrar el auto por el NOMBRE DEL CLIENTE (no hace falta
-- dictar la patente) y guardar la pregunta de aclaración cuando hay dudas.
-- Solo lectura y filtrado por el taller del usuario, como las demás funciones
-- bot_*; solo las ejecuta service_role.

-- Minúsculas y sin tildes, para comparar "Pérez" con "Perez".
create function public.bot_sin_acentos(p_texto text)
returns text
language sql
immutable
as $$
  select translate(lower(coalesce(p_texto, '')), 'áéíóúüñ', 'aeiouun');
$$;

-- Devuelve uno de:
--   {tipo:'vehiculo', patente, cliente}   se sabe cuál es el auto
--   {tipo:'clientes', clientes:[{id,nombre,telefono}]}   hay varios clientes con ese nombre
--   {tipo:'aclarar', cliente, candidatos:[{id,patente,marca,modelo}]}   el cliente tiene varios autos
--   {error: 'no_existe' | 'cliente_no_existe' | 'sin_vehiculos' | 'no_esta_en_taller', cliente?}
-- p_requiere_ingreso: para cambiar estado o cargar servicios solo cuentan los
-- autos con un ingreso abierto (así "el auto de Juan" alcanza si solo uno está en el taller).
create function public.bot_resolver_vehiculo(
  p_telegram_user_id bigint,
  p_patente text default null,
  p_cliente text default null,
  p_cliente_id uuid default null,
  p_modelo text default null,
  p_requiere_ingreso boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v_patente text := upper(btrim(coalesce(p_patente, '')));
  v_nombre text := public.bot_sin_acentos(btrim(coalesce(p_cliente, '')));
  v_modelo text := public.bot_sin_acentos(btrim(coalesce(p_modelo, '')));
  v_cliente uuid := p_cliente_id;
  v_cliente_nombre text;
  v_encontrados jsonb;
  v_cantidad int;
  v_cands jsonb;
begin
  -- 1) Si dijo la patente y existe, no hay nada que preguntar.
  if v_patente <> '' then
    if exists (select 1 from public.vehiculos
               where taller_id = v_taller and patente = v_patente) then
      return jsonb_build_object('tipo', 'vehiculo', 'patente', v_patente);
    end if;
    if v_cliente is null and v_nombre = '' then
      return jsonb_build_object('error', 'no_existe');
    end if;
  end if;

  -- 2) Cliente: por id (ya elegido) o por nombre.
  if v_cliente is null then
    if v_nombre = '' then
      return jsonb_build_object('error', 'cliente_no_existe');
    end if;
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', x.id, 'nombre', x.nombre, 'telefono', x.telefono) order by x.nombre), '[]'::jsonb),
           count(*)
      into v_encontrados, v_cantidad
    from (
      select c.id, c.nombre, c.telefono
      from public.clientes c
      where c.taller_id = v_taller
        and public.bot_sin_acentos(c.nombre) like '%' || v_nombre || '%'
      order by c.nombre
      limit 6
    ) x;
    if v_cantidad = 0 then
      return jsonb_build_object('error', 'cliente_no_existe');
    end if;
    if v_cantidad > 1 then
      -- Si uno solo coincide exactamente con lo que dijo, es ese.
      select c.id into v_cliente
      from public.clientes c
      where c.taller_id = v_taller and public.bot_sin_acentos(c.nombre) = v_nombre
      limit 1;
      if v_cliente is null or (
        select count(*) from public.clientes c
        where c.taller_id = v_taller and public.bot_sin_acentos(c.nombre) = v_nombre) > 1 then
        return jsonb_build_object('tipo', 'clientes', 'clientes', v_encontrados);
      end if;
    else
      v_cliente := (v_encontrados->0->>'id')::uuid;
    end if;
  end if;

  select c.nombre into v_cliente_nombre
  from public.clientes c where c.id = v_cliente and c.taller_id = v_taller;
  if v_cliente_nombre is null then
    return jsonb_build_object('error', 'cliente_no_existe');
  end if;

  -- 3) Autos del cliente (con ingreso abierto si la acción lo pide), filtrando
  -- por la marca o modelo que haya nombrado (si el filtro no deja nada, se ignora).
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'patente', x.patente, 'marca', x.marca, 'modelo', x.modelo)
           order by x.patente), '[]'::jsonb)
    into v_cands
  from (
    select v.id, v.patente, v.marca, v.modelo
    from public.vehiculos v
    where v.taller_id = v_taller and v.cliente_id = v_cliente
      and (not p_requiere_ingreso or exists (
        select 1 from public.servicios s
        where s.vehiculo_id = v.id and s.estado <> 'entregado'))
  ) x;

  if jsonb_array_length(v_cands) = 0 then
    return jsonb_build_object(
      'error', case when p_requiere_ingreso and exists (
                  select 1 from public.vehiculos v
                  where v.taller_id = v_taller and v.cliente_id = v_cliente)
                then 'no_esta_en_taller' else 'sin_vehiculos' end,
      'cliente', v_cliente_nombre);
  end if;

  if v_modelo <> '' then
    select coalesce(jsonb_agg(e), '[]'::jsonb) into v_encontrados
    from jsonb_array_elements(v_cands) e
    where public.bot_sin_acentos((e->>'marca') || ' ' || (e->>'modelo')) like '%' || v_modelo || '%';
    if jsonb_array_length(v_encontrados) > 0 then
      v_cands := v_encontrados;
    end if;
  end if;

  if jsonb_array_length(v_cands) = 1 then
    return jsonb_build_object(
      'tipo', 'vehiculo', 'patente', v_cands->0->>'patente', 'cliente', v_cliente_nombre);
  end if;
  return jsonb_build_object('tipo', 'aclarar', 'cliente', v_cliente_nombre, 'candidatos', v_cands);
end;
$$;

-- Pregunta pendiente (un usuario tiene como máximo una; vence a los 5 minutos):
-- guarda la orden original y las opciones entre las que tiene que elegir.
create table public.telegram_aclaraciones (
  telegram_user_id bigint primary key,
  tipo text not null check (tipo in ('vehiculos', 'clientes')),
  orden jsonb not null,
  candidatos jsonb not null,
  vence timestamptz not null default now() + interval '5 minutes'
);
alter table public.telegram_aclaraciones enable row level security;
revoke all on public.telegram_aclaraciones from anon, authenticated;

create function public.bot_guardar_aclaracion(
  p_telegram_user_id bigint,
  p_tipo text,
  p_orden jsonb,
  p_candidatos jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.bot_taller_id(p_telegram_user_id);
  insert into public.telegram_aclaraciones (telegram_user_id, tipo, orden, candidatos, vence)
  values (p_telegram_user_id, p_tipo, p_orden, p_candidatos, now() + interval '5 minutes')
  on conflict (telegram_user_id) do update
    set tipo = excluded.tipo, orden = excluded.orden,
        candidatos = excluded.candidatos, vence = excluded.vence;
end;
$$;

-- La pregunta pendiente si no venció (null si no hay).
create function public.bot_leer_aclaracion(p_telegram_user_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.telegram_aclaraciones%rowtype;
begin
  perform public.bot_taller_id(p_telegram_user_id);
  select * into r from public.telegram_aclaraciones
    where telegram_user_id = p_telegram_user_id;
  if not found then
    return null;
  end if;
  if r.vence < now() then
    delete from public.telegram_aclaraciones where telegram_user_id = p_telegram_user_id;
    return null;
  end if;
  return jsonb_build_object('tipo', r.tipo, 'orden', r.orden, 'candidatos', r.candidatos);
end;
$$;

create function public.bot_borrar_aclaracion(p_telegram_user_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.bot_taller_id(p_telegram_user_id);
  delete from public.telegram_aclaraciones where telegram_user_id = p_telegram_user_id;
end;
$$;

revoke all on function public.bot_resolver_vehiculo(bigint, text, text, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.bot_guardar_aclaracion(bigint, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.bot_leer_aclaracion(bigint) from public, anon, authenticated;
revoke all on function public.bot_borrar_aclaracion(bigint) from public, anon, authenticated;
grant execute on function public.bot_resolver_vehiculo(bigint, text, text, uuid, text, boolean) to service_role;
grant execute on function public.bot_guardar_aclaracion(bigint, text, jsonb, jsonb) to service_role;
grant execute on function public.bot_leer_aclaracion(bigint) to service_role;
grant execute on function public.bot_borrar_aclaracion(bigint) to service_role;
