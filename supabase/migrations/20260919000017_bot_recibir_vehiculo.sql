-- Bot de Telegram: recibir un auto nuevo (crea el cliente y el auto si hacen
-- falta, y abre el ingreso) y crear un cliente suelto. Igual que las otras
-- acciones que modifican: bot_preparar_* valida y guarda una acción PENDIENTE
-- (vence a los 10 minutos) y bot_confirmar la ejecuta, todo o nada, una sola
-- vez. Mismas reglas que la app: patente ABC123 o AB123CD, marca y modelo
-- obligatorios, año opcional (1900 a año próximo), km y motivo obligatorios,
-- teléfono opcional con los formatos de Argentina y Chile. Los duplicados de
-- clientes se evitan: si el nombre coincide exacto se usa ese cliente y, si
-- solo hay parecidos, se pregunta. Solo las ejecuta service_role.

alter table public.telegram_acciones
  drop constraint telegram_acciones_tipo_check,
  add constraint telegram_acciones_tipo_check check (tipo in (
    'cambiar_estado', 'agregar_servicios', 'recibir_vehiculo', 'crear_cliente'));

-- Falta un dato: la pregunta pendiente también puede ser "¿cuál es la patente?".
alter table public.telegram_aclaraciones
  drop constraint telegram_aclaraciones_tipo_check,
  add constraint telegram_aclaraciones_tipo_check check (tipo in (
    'vehiculos', 'clientes', 'faltante'));

-- Teléfono en solo números si tiene un formato válido; null si está vacío o es inválido.
create function public.bot_telefono_valido(p_telefono text)
returns text
language sql
immutable
as $$
  select case
    when p_telefono is null or btrim(p_telefono) = '' then null
    when btrim(p_telefono) !~ '^\+?[0-9 ().-]+$' then null
    when regexp_replace(p_telefono, '[ ().+-]', '', 'g')
         ~ '^([0-9]{10}|0[0-9]{10}|54[0-9]{10}|549[0-9]{10}|[0-9]{9}|56[0-9]{9})$'
      then regexp_replace(p_telefono, '[ ().+-]', '', 'g')
    else null
  end;
$$;

-- Clientes parecidos (o iguales) a un nombre, para no duplicar: hasta 5.
create function public.bot_clientes_por_nombre(p_taller uuid, p_nombre text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'nombre', x.nombre, 'telefono', x.telefono)
           order by x.exacto desc, x.por_palabra desc, x.nombre), '[]'::jsonb)
  from (
    select c.id, c.nombre, c.telefono,
           (public.bot_sin_acentos(c.nombre) = public.bot_sin_acentos(btrim(p_nombre))) as exacto,
           word_similarity(public.bot_sin_acentos(btrim(p_nombre)), public.bot_sin_acentos(c.nombre)) as por_palabra
    from public.clientes c
    where c.taller_id = p_taller
      and (public.bot_sin_acentos(c.nombre) = public.bot_sin_acentos(btrim(p_nombre))
           or word_similarity(public.bot_sin_acentos(btrim(p_nombre)), public.bot_sin_acentos(c.nombre)) >= 0.45)
    order by exacto desc, por_palabra desc, c.nombre
    limit 5
  ) x;
$$;

-- Paso 1: recibir un vehículo. Devuelve uno de:
--   {accion_id, cliente:{nombre,telefono,nuevo}, vehiculo:{patente,marca,modelo,anio,nuevo}, km, motivo, telefono_ignorado}
--   {falta: 'cliente' | 'patente' | 'marca_modelo' | 'km' | 'motivo'}   hay que preguntar ese dato
--   {tipo:'clientes_parecidos', clientes:[...]}   hay uno igual o parecido: elegir o crear uno nuevo
--   {error: 'patente_invalida' | 'cliente_no_existe' | 'motivo_largo' | 'ya_en_taller'}
create function public.bot_preparar_recepcion(
  p_telegram_user_id bigint,
  p_cliente text default null,
  p_cliente_id uuid default null,
  p_crear_nuevo boolean default false,
  p_telefono text default null,
  p_patente text default null,
  p_marca text default null,
  p_modelo text default null,
  p_anio int default null,
  p_km int default null,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v_patente text := upper(regexp_replace(coalesce(p_patente, ''), '[^A-Za-z0-9]', '', 'g'));
  v_nombre text := btrim(coalesce(p_cliente, ''));
  v_marca text := btrim(coalesce(p_marca, ''));
  v_modelo text := btrim(coalesce(p_modelo, ''));
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_tel text := public.bot_telefono_valido(p_telefono);
  v_anio int := case when p_anio between 1900 and extract(year from now())::int + 1
                     then p_anio else null end;
  v_veh public.vehiculos%rowtype;
  v_cli public.clientes%rowtype;
  v_cliente_id uuid := p_cliente_id;
  v_cliente_nuevo boolean := false;
  v_veh_existe boolean := false;
  v_cands jsonb;
  v_exactos int;
  v_id uuid;
begin
  -- 1) Patente bien formada (si la dijo).
  if v_patente <> '' and not (v_patente ~ '^[A-Z]{3}[0-9]{3}$' or v_patente ~ '^[A-Z]{2}[0-9]{3}[A-Z]{2}$') then
    return jsonb_build_object('error', 'patente_invalida');
  end if;

  -- 2) Si la patente ya está cargada, el auto y su dueño son esos.
  if v_patente <> '' then
    select * into v_veh from public.vehiculos
      where taller_id = v_taller and patente = v_patente;
    v_veh_existe := found;
  end if;

  if v_veh_existe then
    select * into v_cli from public.clientes where id = v_veh.cliente_id;
    v_cliente_id := v_cli.id;
  else
    -- 3) Cliente: elegido, igual, parecido o nuevo.
    if v_cliente_id is not null then
      select * into v_cli from public.clientes
        where id = v_cliente_id and taller_id = v_taller;
      if not found then
        return jsonb_build_object('error', 'cliente_no_existe');
      end if;
    elsif v_nombre = '' then
      return jsonb_build_object('falta', 'cliente');
    elsif not p_crear_nuevo then
      v_cands := public.bot_clientes_por_nombre(v_taller, v_nombre);
      select count(*) into v_exactos from jsonb_array_elements(v_cands) e
        where public.bot_sin_acentos(e->>'nombre') = public.bot_sin_acentos(v_nombre);
      if v_exactos = 1 then
        select * into v_cli from public.clientes
          where id = (select (e->>'id')::uuid from jsonb_array_elements(v_cands) e
                      where public.bot_sin_acentos(e->>'nombre') = public.bot_sin_acentos(v_nombre) limit 1);
        v_cliente_id := v_cli.id;
      elsif jsonb_array_length(v_cands) > 0 then
        return jsonb_build_object('tipo', 'clientes_parecidos', 'clientes', v_cands);
      end if;
    end if;
    v_cliente_nuevo := v_cliente_id is null;

    -- 4) Sin patente: solo se sigue si el cliente tiene UN auto de esa marca o modelo.
    if v_patente = '' then
      if v_cliente_id is not null and (v_marca <> '' or v_modelo <> '') then
        select * into v_veh from public.vehiculos v
          where v.taller_id = v_taller and v.cliente_id = v_cliente_id
            and public.bot_sin_acentos(v.marca || ' ' || v.modelo)
                like '%' || public.bot_escapar_like(public.bot_sin_acentos(v_modelo)) || '%'
            and public.bot_sin_acentos(v.marca || ' ' || v.modelo)
                like '%' || public.bot_escapar_like(public.bot_sin_acentos(v_marca)) || '%';
        if found and (select count(*) from public.vehiculos v
            where v.taller_id = v_taller and v.cliente_id = v_cliente_id
              and public.bot_sin_acentos(v.marca || ' ' || v.modelo)
                  like '%' || public.bot_escapar_like(public.bot_sin_acentos(v_modelo)) || '%'
              and public.bot_sin_acentos(v.marca || ' ' || v.modelo)
                  like '%' || public.bot_escapar_like(public.bot_sin_acentos(v_marca)) || '%') = 1 then
          v_veh_existe := true;
          v_patente := v_veh.patente;
        end if;
      end if;
      if not v_veh_existe then
        return jsonb_build_object('falta', 'patente');
      end if;
    elsif v_marca = '' or v_modelo = '' then
      return jsonb_build_object('falta', 'marca_modelo');
    end if;
  end if;

  -- 5) Km y motivo (obligatorios en el ingreso).
  if p_km is null or p_km < 0 or p_km > 3000000 then
    return jsonb_build_object('falta', 'km');
  end if;
  if v_motivo = '' then
    return jsonb_build_object('falta', 'motivo');
  end if;
  if char_length(v_motivo) > 200 then
    return jsonb_build_object('error', 'motivo_largo');
  end if;

  -- 6) El auto no puede tener ya un ingreso abierto.
  if v_veh_existe and exists (select 1 from public.servicios s
      where s.vehiculo_id = v_veh.id and s.estado <> 'entregado') then
    return jsonb_build_object('error', 'ya_en_taller',
      'patente', v_veh.patente, 'marca', v_veh.marca, 'modelo', v_veh.modelo);
  end if;

  delete from public.telegram_acciones where vence < now() - interval '1 day';
  insert into public.telegram_acciones (telegram_user_id, tipo, datos)
  values (p_telegram_user_id, 'recibir_vehiculo', jsonb_build_object(
    'cliente_id', v_cliente_id,
    'cliente_nuevo', case when v_cliente_nuevo then
        jsonb_build_object('nombre', left(v_nombre, 80), 'telefono', v_tel) else null end,
    'vehiculo_id', case when v_veh_existe then v_veh.id else null end,
    'vehiculo_nuevo', case when v_veh_existe then null else
        jsonb_build_object('patente', v_patente, 'marca', left(v_marca, 40),
                           'modelo', left(v_modelo, 40), 'anio', v_anio) end,
    'km', p_km,
    'motivo', v_motivo))
  returning id into v_id;

  return jsonb_build_object(
    'accion_id', v_id,
    'cliente', jsonb_build_object(
      'nombre', case when v_cliente_nuevo then left(v_nombre, 80) else v_cli.nombre end,
      'telefono', case when v_cliente_nuevo then v_tel else v_cli.telefono end,
      'nuevo', v_cliente_nuevo),
    'vehiculo', jsonb_build_object(
      'patente', v_patente,
      'marca', case when v_veh_existe then v_veh.marca else left(v_marca, 40) end,
      'modelo', case when v_veh_existe then v_veh.modelo else left(v_modelo, 40) end,
      'anio', case when v_veh_existe then v_veh.anio else v_anio end,
      'nuevo', not v_veh_existe),
    'km', p_km,
    'motivo', v_motivo,
    'telefono_ignorado', (p_telefono is not null and btrim(p_telefono) <> '' and v_tel is null));
end;
$$;

-- Paso 1: crear un cliente suelto (sin auto).
create function public.bot_preparar_cliente(
  p_telegram_user_id bigint,
  p_nombre text,
  p_telefono text default null,
  p_crear_nuevo boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_tel text := public.bot_telefono_valido(p_telefono);
  v_cands jsonb;
  v_id uuid;
begin
  if v_nombre = '' then
    return jsonb_build_object('falta', 'cliente');
  end if;
  if not p_crear_nuevo then
    v_cands := public.bot_clientes_por_nombre(v_taller, v_nombre);
    if exists (select 1 from jsonb_array_elements(v_cands) e
               where public.bot_sin_acentos(e->>'nombre') = public.bot_sin_acentos(v_nombre)) then
      return jsonb_build_object('error', 'ya_existe', 'nombre', v_nombre, 'clientes', v_cands);
    end if;
    if jsonb_array_length(v_cands) > 0 then
      return jsonb_build_object('tipo', 'clientes_parecidos', 'clientes', v_cands);
    end if;
  end if;
  delete from public.telegram_acciones where vence < now() - interval '1 day';
  insert into public.telegram_acciones (telegram_user_id, tipo, datos)
  values (p_telegram_user_id, 'crear_cliente',
          jsonb_build_object('nombre', left(v_nombre, 80), 'telefono', v_tel))
  returning id into v_id;
  return jsonb_build_object(
    'accion_id', v_id, 'nombre', left(v_nombre, 80), 'telefono', v_tel,
    'telefono_ignorado', (p_telefono is not null and btrim(p_telefono) <> '' and v_tel is null));
end;
$$;

-- Paso 2 (reemplaza la de la migración 13): ahora también ejecuta
-- 'recibir_vehiculo' y 'crear_cliente'. Todo o nada: si algo falla, no queda
-- ni el cliente ni el auto a medias.
create or replace function public.bot_confirmar(
  p_telegram_user_id bigint,
  p_accion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  a public.telegram_acciones%rowtype;
  s public.servicios%rowtype;
  v public.vehiculos%rowtype;
  v_item jsonb;
  v_total numeric := 0;
  v_cliente_id uuid;
  v_vehiculo_id uuid;
  v_cliente_nombre text;
  v_nuevo_cliente boolean := false;
begin
  select * into a from public.telegram_acciones
    where id = p_accion_id and telegram_user_id = p_telegram_user_id
    for update;
  if not found then
    return jsonb_build_object('error', 'no_existe');
  end if;
  if a.estado <> 'pendiente' then
    return jsonb_build_object('error', 'ya_procesada', 'estado', a.estado);
  end if;
  if a.vence < now() then
    update public.telegram_acciones set estado = 'cancelada' where id = a.id;
    return jsonb_build_object('error', 'vencida');
  end if;

  if a.tipo = 'crear_cliente' then
    insert into public.clientes (taller_id, nombre, telefono)
    values (v_taller, a.datos->>'nombre', nullif(a.datos->>'telefono', ''))
    returning id into v_cliente_id;
    update public.telegram_acciones set estado = 'ejecutada' where id = a.id;
    return jsonb_build_object('ok', true, 'tipo', a.tipo, 'nombre', a.datos->>'nombre');
  end if;

  if a.tipo = 'recibir_vehiculo' then
    begin
      -- Cliente: el que ya existe o uno nuevo.
      if a.datos->>'cliente_id' is not null then
        v_cliente_id := (a.datos->>'cliente_id')::uuid;
        select nombre into v_cliente_nombre from public.clientes
          where id = v_cliente_id and taller_id = v_taller;
        if v_cliente_nombre is null then
          raise exception 'cliente_ajeno';
        end if;
      else
        insert into public.clientes (taller_id, nombre, telefono)
        values (v_taller, a.datos->'cliente_nuevo'->>'nombre',
                nullif(a.datos->'cliente_nuevo'->>'telefono', ''))
        returning id, nombre into v_cliente_id, v_cliente_nombre;
        v_nuevo_cliente := true;
      end if;
      -- Vehículo: el que ya existe o uno nuevo del cliente.
      if a.datos->>'vehiculo_id' is not null then
        select * into v from public.vehiculos
          where id = (a.datos->>'vehiculo_id')::uuid and taller_id = v_taller;
        if not found then
          raise exception 'vehiculo_ajeno';
        end if;
      else
        insert into public.vehiculos (taller_id, patente, marca, modelo, anio, cliente_id)
        values (v_taller, a.datos->'vehiculo_nuevo'->>'patente',
                a.datos->'vehiculo_nuevo'->>'marca', a.datos->'vehiculo_nuevo'->>'modelo',
                nullif(a.datos->'vehiculo_nuevo'->>'anio', '')::int, v_cliente_id)
        returning * into v;
      end if;
      -- El ingreso.
      if exists (select 1 from public.servicios
                 where vehiculo_id = v.id and estado <> 'entregado') then
        raise exception 'ya_en_taller';
      end if;
      insert into public.servicios
        (taller_id, vehiculo_id, fecha_ingreso, km_al_ingreso, motivo_ingreso, estado)
      values (v_taller, v.id, v_hoy, (a.datos->>'km')::int, a.datos->>'motivo', 'en_taller');
    exception
      when unique_violation then
        update public.telegram_acciones set estado = 'cancelada' where id = a.id;
        return jsonb_build_object('error', 'patente_repetida');
      when others then
        if sqlerrm in ('ya_en_taller', 'cliente_ajeno', 'vehiculo_ajeno') then
          update public.telegram_acciones set estado = 'cancelada' where id = a.id;
          return jsonb_build_object('error', sqlerrm);
        end if;
        raise;
    end;
    update public.telegram_acciones set estado = 'ejecutada' where id = a.id;
    return jsonb_build_object(
      'ok', true, 'tipo', a.tipo,
      'patente', v.patente, 'marca', v.marca, 'modelo', v.modelo,
      'cliente', v_cliente_nombre, 'cliente_nuevo', v_nuevo_cliente);
  end if;

  -- cambiar_estado / agregar_servicios: el ingreso tiene que seguir abierto y
  -- ser de este taller (pudo cambiar en estos minutos, por ejemplo desde la app).
  select * into s from public.servicios
    where id = (a.datos->>'servicio_id')::uuid and taller_id = v_taller
    for update;
  if not found or s.estado = 'entregado' then
    update public.telegram_acciones set estado = 'cancelada' where id = a.id;
    return jsonb_build_object('error', 'ya_no_esta_abierto');
  end if;
  select * into v from public.vehiculos where id = s.vehiculo_id;

  if a.tipo = 'cambiar_estado' then
    update public.servicios
      set estado = a.datos->>'estado',
          fecha_entrega = case
            when a.datos->>'estado' = 'entregado' then coalesce(s.fecha_entrega, v_hoy)
            else null end
      where id = s.id;
    update public.telegram_acciones set estado = 'ejecutada' where id = a.id;
    return jsonb_build_object(
      'ok', true, 'tipo', a.tipo,
      'patente', v.patente, 'marca', v.marca, 'modelo', v.modelo,
      'estado_nuevo', a.datos->>'estado');
  end if;

  -- agregar_servicios
  for v_item in select * from jsonb_array_elements(a.datos->'items') loop
    insert into public.servicio_items
      (taller_id, servicio_id, tipo, descripcion, cantidad, precio)
    values (
      v_taller, s.id, v_item->>'tipo', v_item->>'descripcion',
      (v_item->>'cantidad')::numeric, nullif(v_item->>'precio', '')::numeric);
    v_total := v_total + (v_item->>'cantidad')::numeric
                         * coalesce(nullif(v_item->>'precio', '')::numeric, 0);
  end loop;
  update public.telegram_acciones set estado = 'ejecutada' where id = a.id;
  return jsonb_build_object(
    'ok', true, 'tipo', a.tipo,
    'patente', v.patente, 'marca', v.marca, 'modelo', v.modelo,
    'cantidad', jsonb_array_length(a.datos->'items'), 'total', v_total);
end;
$$;

revoke all on function public.bot_clientes_por_nombre(uuid, text) from public, anon, authenticated;
revoke all on function public.bot_preparar_recepcion(bigint, text, uuid, boolean, text, text, text, text, int, int, text) from public, anon, authenticated;
revoke all on function public.bot_preparar_cliente(bigint, text, text, boolean) from public, anon, authenticated;
grant execute on function public.bot_clientes_por_nombre(uuid, text) to service_role;
grant execute on function public.bot_preparar_recepcion(bigint, text, uuid, boolean, text, text, text, text, int, int, text) to service_role;
grant execute on function public.bot_preparar_cliente(bigint, text, text, boolean) to service_role;
