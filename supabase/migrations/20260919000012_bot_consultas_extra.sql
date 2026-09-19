-- Bot de Telegram, etapa 2a (consultas extra, todas de SOLO LECTURA): lista de
-- clientes, prometidos para hoy, recordatorios para avisar e historial de un
-- auto. Mismo esquema de seguridad que la migración 11: cada función recibe el
-- id de Telegram, deduce el taller con bot_taller_id() y filtra por él; solo
-- las ejecuta service_role. "Hoy" es la fecha de Argentina, no la del servidor.

-- Clientes cargados: el total y hasta 20 (opcionalmente los que empiezan con un texto).
create function public.bot_listar_clientes(
  p_telegram_user_id bigint,
  p_prefijo text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v_patron text := case
    when p_prefijo is null or btrim(p_prefijo) = '' then '%'
    else replace(replace(replace(btrim(p_prefijo), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  end;
begin
  return jsonb_build_object(
    'total', (select count(*) from public.clientes c
              where c.taller_id = v_taller and c.nombre ilike v_patron),
    'clientes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nombre', x.nombre, 'telefono', x.telefono, 'vehiculos', x.vehiculos)
        order by x.nombre)
      from (
        select c.nombre, c.telefono,
               (select count(*) from public.vehiculos v where v.cliente_id = c.id) as vehiculos
        from public.clientes c
        where c.taller_id = v_taller and c.nombre ilike v_patron
        order by c.nombre
        limit 20
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- Vehículos que siguen en el taller y se prometieron para hoy o antes.
create function public.bot_para_hoy(p_telegram_user_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'patente', v.patente,
      'marca', v.marca,
      'modelo', v.modelo,
      'cliente', c.nombre,
      'telefono', c.telefono,
      'estado', s.estado,
      'fecha_prometida', s.fecha_prometida,
      'vencido', s.fecha_prometida < v_hoy
    ) order by s.fecha_prometida, s.created_at)
    from public.servicios s
    join public.vehiculos v on v.id = s.vehiculo_id
    left join public.clientes c on c.id = v.cliente_id
    where s.taller_id = v_taller
      and s.estado in ('en_taller', 'listo')
      and s.fecha_prometida is not null
      and s.fecha_prometida <= v_hoy
  ), '[]'::jsonb);
end;
$$;

-- Recordatorios pendientes vencidos o de este mes (lo mismo que "Para avisar"
-- en Inicio): el total y hasta 15, con a quién avisar.
create function public.bot_para_avisar(p_telegram_user_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_fin_de_mes date := (date_trunc('month', v_hoy) + interval '1 month - 1 day')::date;
begin
  return jsonb_build_object(
    'total', (select count(*) from public.recordatorios r
              where r.taller_id = v_taller and r.estado = 'pendiente'
                and r.fecha_estimada <= v_fin_de_mes),
    'recordatorios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nota', x.nota, 'fecha', x.fecha_estimada, 'vencido', x.fecha_estimada < v_hoy,
        'patente', x.patente, 'marca', x.marca, 'modelo', x.modelo,
        'cliente', x.cliente, 'telefono', x.telefono)
        order by x.fecha_estimada)
      from (
        select r.nota, r.fecha_estimada, v.patente, v.marca, v.modelo,
               c.nombre as cliente, c.telefono
        from public.recordatorios r
        join public.vehiculos v on v.id = r.vehiculo_id
        left join public.clientes c on c.id = v.cliente_id
        where r.taller_id = v_taller and r.estado = 'pendiente'
          and r.fecha_estimada <= v_fin_de_mes
        order by r.fecha_estimada
        limit 15
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- Últimos 5 ingresos de un auto, con los trabajos y su desglose (null si no existe).
create function public.bot_historial_vehiculo(
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
    'cliente', c.nombre,
    'ingresos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fecha', x.fecha_ingreso,
        'km', x.km_al_ingreso,
        'estado', x.estado,
        'motivo', x.motivo_ingreso,
        'trabajos', x.trabajos,
        'total', x.total) order by x.fecha_ingreso desc, x.created_at desc)
      from (
        select s.fecha_ingreso, s.created_at, s.km_al_ingreso, s.estado, s.motivo_ingreso,
               coalesce((select jsonb_agg(jsonb_build_object(
                           'descripcion', i.descripcion, 'cantidad', i.cantidad,
                           'precio', i.precio, 'tipo', i.tipo) order by i.created_at)
                         from public.servicio_items i where i.servicio_id = s.id), '[]'::jsonb) as trabajos,
               (select coalesce(sum(i.cantidad * coalesce(i.precio, 0)), 0)
                from public.servicio_items i where i.servicio_id = s.id) as total
        from public.servicios s
        where s.vehiculo_id = v.id
        order by s.fecha_ingreso desc, s.created_at desc
        limit 5
      ) x), '[]'::jsonb)
  ) into r
  from public.vehiculos v
  left join public.clientes c on c.id = v.cliente_id
  where v.taller_id = v_taller and v.patente = upper(p_patente);
  return r;
end;
$$;

revoke all on function public.bot_listar_clientes(bigint, text) from public, anon, authenticated;
revoke all on function public.bot_para_hoy(bigint) from public, anon, authenticated;
revoke all on function public.bot_para_avisar(bigint) from public, anon, authenticated;
revoke all on function public.bot_historial_vehiculo(bigint, text) from public, anon, authenticated;
grant execute on function public.bot_listar_clientes(bigint, text) to service_role;
grant execute on function public.bot_para_hoy(bigint) to service_role;
grant execute on function public.bot_para_avisar(bigint) to service_role;
grant execute on function public.bot_historial_vehiculo(bigint, text) to service_role;
