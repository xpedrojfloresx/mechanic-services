-- Corrección de la migración 14: un % o un _ en el nombre del cliente o del
-- modelo se trataba como comodín de LIKE (con "%" coincidía con todos los
-- clientes del taller). Ahora se escapan y se buscan como texto normal.

create function public.bot_escapar_like(p_texto text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(coalesce(p_texto, ''), '\', '\\'), '%', '\%'), '_', '\_');
$$;

create or replace function public.bot_resolver_vehiculo(
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
        and public.bot_sin_acentos(c.nombre) like '%' || public.bot_escapar_like(v_nombre) || '%'
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
    where public.bot_sin_acentos((e->>'marca') || ' ' || (e->>'modelo')) like '%' || public.bot_escapar_like(v_modelo) || '%';
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
