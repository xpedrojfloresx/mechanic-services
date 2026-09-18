-- Reasignar un vehículo a otro cliente: el nuevo cliente tiene que ser del
-- mismo taller. Las claves foráneas no pasan por RLS, así que sin esta
-- validación se podría enlazar un vehículo a un cliente de otro taller.
-- SECURITY INVOKER: la consulta a clientes respeta RLS, por eso un cliente
-- ajeno "no existe" para el usuario.

create function public.validar_cliente_del_vehiculo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.clientes
    where id = new.cliente_id and taller_id = new.taller_id
  ) then
    raise exception 'El cliente no pertenece al taller del vehículo'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validar_cliente_del_vehiculo
before update of cliente_id on public.vehiculos
for each row
when (new.cliente_id is distinct from old.cliente_id)
execute function public.validar_cliente_del_vehiculo();
