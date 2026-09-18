-- Datos de recepción del vehículo (ingreso al taller) en la tabla servicios,
-- y función para crear cliente + vehículo + ingreso en una sola transacción.

alter table public.servicios
  add column motivo_ingreso text,
  add column estado_al_ingreso text;

comment on column public.servicios.motivo_ingreso is
  'Para qué trajo el cliente el vehículo';
comment on column public.servicios.estado_al_ingreso is
  'En qué estado llegó el vehículo (golpes, rayones, etc.)';

-- SECURITY INVOKER (por defecto): corre con los permisos del usuario, así que
-- RLS y los triggers que derivan taller_id funcionan igual que en un insert
-- directo. Si algún paso falla se revierte todo (una sola transacción).
create function public.crear_cliente_completo(
  p_cliente jsonb,
  p_vehiculo jsonb default null,
  p_ingreso jsonb default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_cliente uuid;
  v_vehiculo uuid;
begin
  insert into public.clientes (nombre, telefono, email)
  values (
    p_cliente->>'nombre',
    nullif(p_cliente->>'telefono', ''),
    nullif(p_cliente->>'email', '')
  )
  returning id into v_cliente;

  if p_vehiculo is not null then
    insert into public.vehiculos (cliente_id, patente, marca, modelo, anio, color)
    values (
      v_cliente,
      p_vehiculo->>'patente',
      p_vehiculo->>'marca',
      p_vehiculo->>'modelo',
      nullif(p_vehiculo->>'anio', '')::integer,
      nullif(p_vehiculo->>'color', '')
    )
    returning id into v_vehiculo;

    if p_ingreso is not null then
      insert into public.servicios (
        vehiculo_id, fecha_ingreso, km_al_ingreso,
        motivo_ingreso, estado_al_ingreso, observaciones
      )
      values (
        v_vehiculo,
        coalesce(nullif(p_ingreso->>'fecha_ingreso', '')::date, current_date),
        (p_ingreso->>'km_al_ingreso')::integer,
        nullif(p_ingreso->>'motivo_ingreso', ''),
        nullif(p_ingreso->>'estado_al_ingreso', ''),
        nullif(p_ingreso->>'observaciones', '')
      );
    end if;
  end if;

  return v_cliente;
end;
$$;

revoke all on function public.crear_cliente_completo(jsonb, jsonb, jsonb)
  from public;
grant execute on function public.crear_cliente_completo(jsonb, jsonb, jsonb)
  to authenticated;
