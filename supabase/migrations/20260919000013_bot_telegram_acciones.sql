-- Bot de Telegram, etapa 2b: acciones que MODIFICAN datos, siempre con
-- confirmación. El flujo es en dos pasos y el modelo de IA no interviene en
-- ninguno de los dos:
--   1) bot_preparar_*  valida todo, guarda una acción PENDIENTE (vence a los
--      10 minutos) y devuelve lo que se va a hacer para mostrarlo con botones;
--   2) bot_confirmar   la ejecuta de forma atómica (una sola vez) si el mismo
--      usuario la confirma a tiempo; bot_cancelar la descarta.
-- Misma seguridad que las migraciones 11 y 12: todo filtra por el taller del
-- usuario de Telegram (bot_taller_id) y solo lo ejecuta service_role.
-- Regla de la app: a un auto solo se le cargan cosas si tiene un ingreso
-- abierto (no entregado); si no está recibido, no se crea ingreso acá.

create table public.telegram_acciones (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  tipo text not null check (tipo in ('cambiar_estado', 'agregar_servicios')),
  datos jsonb not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'ejecutada', 'cancelada')),
  creada timestamptz not null default now(),
  vence timestamptz not null default now() + interval '10 minutes'
);

alter table public.telegram_acciones enable row level security;
revoke all on public.telegram_acciones from anon, authenticated;

-- Paso 1a: cambiar el estado del ingreso abierto de un auto (listo / entregado).
create function public.bot_preparar_cambio_estado(
  p_telegram_user_id bigint,
  p_patente text,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v public.vehiculos%rowtype;
  s public.servicios%rowtype;
  v_cliente text;
  v_id uuid;
begin
  if p_estado not in ('listo', 'entregado') then
    return jsonb_build_object('error', 'estado_invalido');
  end if;
  select * into v from public.vehiculos
    where taller_id = v_taller and patente = upper(p_patente);
  if not found then
    return jsonb_build_object('error', 'no_existe');
  end if;
  select * into s from public.servicios
    where vehiculo_id = v.id and estado <> 'entregado'
    order by fecha_ingreso desc, created_at desc
    limit 1;
  if not found then
    return jsonb_build_object('error', 'no_esta_en_taller');
  end if;
  if s.estado = p_estado then
    return jsonb_build_object('error', 'ya_esta', 'estado', s.estado);
  end if;
  select nombre into v_cliente from public.clientes where id = v.cliente_id;

  delete from public.telegram_acciones where vence < now() - interval '1 day';
  insert into public.telegram_acciones (telegram_user_id, tipo, datos)
  values (p_telegram_user_id, 'cambiar_estado',
          jsonb_build_object('servicio_id', s.id, 'estado', p_estado))
  returning id into v_id;

  return jsonb_build_object(
    'accion_id', v_id,
    'patente', v.patente, 'marca', v.marca, 'modelo', v.modelo,
    'cliente', v_cliente,
    'estado_actual', s.estado, 'estado_nuevo', p_estado);
end;
$$;

-- Paso 1b: agregar renglones (repuestos / mano de obra) al ingreso abierto de un auto.
-- p_items: arreglo de {tipo, descripcion, cantidad?, precio?}, de 1 a 5 renglones.
create function public.bot_preparar_servicios(
  p_telegram_user_id bigint,
  p_patente text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v public.vehiculos%rowtype;
  s public.servicios%rowtype;
  v_cliente text;
  v_id uuid;
  v_item jsonb;
  v_limpios jsonb := '[]'::jsonb;
  v_tipo text;
  v_desc text;
  v_cant numeric;
  v_precio numeric;
  v_total numeric := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 5 then
    return jsonb_build_object('error', 'items_invalidos');
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_tipo := v_item->>'tipo';
    v_desc := btrim(coalesce(v_item->>'descripcion', ''));
    v_cant := coalesce(nullif(v_item->>'cantidad', '')::numeric, 1);
    v_precio := nullif(v_item->>'precio', '')::numeric;
    if v_tipo not in ('repuesto', 'mano_de_obra')
       or v_desc = '' or char_length(v_desc) > 100
       or v_cant <= 0 or v_cant > 100000
       or (v_precio is not null and (v_precio < 0 or v_precio > 100000000)) then
      return jsonb_build_object('error', 'items_invalidos');
    end if;
    v_limpios := v_limpios || jsonb_build_object(
      'tipo', v_tipo, 'descripcion', v_desc, 'cantidad', v_cant, 'precio', v_precio);
    v_total := v_total + v_cant * coalesce(v_precio, 0);
  end loop;

  select * into v from public.vehiculos
    where taller_id = v_taller and patente = upper(p_patente);
  if not found then
    return jsonb_build_object('error', 'no_existe');
  end if;
  select * into s from public.servicios
    where vehiculo_id = v.id and estado <> 'entregado'
    order by fecha_ingreso desc, created_at desc
    limit 1;
  if not found then
    return jsonb_build_object('error', 'no_esta_en_taller');
  end if;
  select nombre into v_cliente from public.clientes where id = v.cliente_id;

  delete from public.telegram_acciones where vence < now() - interval '1 day';
  insert into public.telegram_acciones (telegram_user_id, tipo, datos)
  values (p_telegram_user_id, 'agregar_servicios',
          jsonb_build_object('servicio_id', s.id, 'items', v_limpios))
  returning id into v_id;

  return jsonb_build_object(
    'accion_id', v_id,
    'patente', v.patente, 'marca', v.marca, 'modelo', v.modelo,
    'cliente', v_cliente,
    'items', v_limpios, 'total', v_total);
end;
$$;

-- Paso 2: ejecutar la acción pendiente. Atómico: el bloqueo de la fila evita
-- que un doble toque en "Confirmar" la ejecute dos veces.
create function public.bot_confirmar(
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

  -- El ingreso tiene que seguir abierto y ser de este taller (pudo cambiar en
  -- estos minutos, por ejemplo desde la app).
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

create function public.bot_cancelar(
  p_telegram_user_id bigint,
  p_accion_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filas int;
begin
  perform public.bot_taller_id(p_telegram_user_id);
  update public.telegram_acciones set estado = 'cancelada'
    where id = p_accion_id and telegram_user_id = p_telegram_user_id
      and estado = 'pendiente';
  get diagnostics v_filas = row_count;
  return v_filas > 0;
end;
$$;

revoke all on function public.bot_preparar_cambio_estado(bigint, text, text) from public, anon, authenticated;
revoke all on function public.bot_preparar_servicios(bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.bot_confirmar(bigint, uuid) from public, anon, authenticated;
revoke all on function public.bot_cancelar(bigint, uuid) from public, anon, authenticated;
grant execute on function public.bot_preparar_cambio_estado(bigint, text, text) to service_role;
grant execute on function public.bot_preparar_servicios(bigint, text, jsonb) to service_role;
grant execute on function public.bot_confirmar(bigint, uuid) to service_role;
grant execute on function public.bot_cancelar(bigint, uuid) to service_role;
