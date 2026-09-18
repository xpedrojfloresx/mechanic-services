-- Crea un vehículo y su ingreso en una sola transacción (si algo falla no
-- queda nada a medias). SECURITY INVOKER: respeta RLS y los triggers de
-- taller_id, igual que un insert directo.

create function public.crear_vehiculo_con_ingreso(
  p_cliente_id uuid,
  p_vehiculo jsonb,
  p_ingreso jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_vehiculo uuid;
begin
  insert into public.vehiculos (cliente_id, patente, marca, modelo, anio, color)
  values (
    p_cliente_id,
    p_vehiculo->>'patente',
    p_vehiculo->>'marca',
    p_vehiculo->>'modelo',
    nullif(p_vehiculo->>'anio', '')::integer,
    nullif(p_vehiculo->>'color', '')
  )
  returning id into v_vehiculo;

  insert into public.servicios (
    vehiculo_id, fecha_ingreso, km_al_ingreso,
    motivo_ingreso, estado_al_ingreso
  )
  values (
    v_vehiculo,
    coalesce(nullif(p_ingreso->>'fecha_ingreso', '')::date, current_date),
    (p_ingreso->>'km_al_ingreso')::integer,
    nullif(p_ingreso->>'motivo_ingreso', ''),
    nullif(p_ingreso->>'estado_al_ingreso', '')
  );

  return v_vehiculo;
end;
$$;

revoke all on function public.crear_vehiculo_con_ingreso(uuid, jsonb, jsonb)
  from public;
grant execute on function public.crear_vehiculo_con_ingreso(uuid, jsonb, jsonb)
  to authenticated;
