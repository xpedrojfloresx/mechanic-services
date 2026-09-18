-- Eliminar un cliente borra también sus vehículos, y eliminar un vehículo
-- borra sus servicios (servicio_items y recordatorios ya eran en cascada).
-- La app pide confirmación explícita antes de borrar.

alter table public.vehiculos
  drop constraint vehiculos_cliente_id_fkey,
  add constraint vehiculos_cliente_id_fkey
    foreign key (cliente_id) references public.clientes (id) on delete cascade;

alter table public.servicios
  drop constraint servicios_vehiculo_id_fkey,
  add constraint servicios_vehiculo_id_fkey
    foreign key (vehiculo_id) references public.vehiculos (id) on delete cascade;
