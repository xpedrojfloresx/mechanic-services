-- Datos de desarrollo. Se corre automaticamente con `supabase db reset`
-- (stack local). No se corre en produccion.
--
-- No creamos un usuario de auth.users aca: ese vinculo (auth.users <->
-- public.usuarios) se arma en la Fase 2 (Autenticacion), cuando Pedro cree
-- su usuario real via Supabase Auth. Este seed solo carga datos de negocio
-- con un taller_id fijo para poder probar consultas/RLS con el service_role.

insert into public.talleres (id, nombre) values
  ('00000000-0000-0000-0000-000000000001', 'Taller Demo')
on conflict (id) do nothing;

insert into public.clientes (id, taller_id, nombre, telefono, email) values
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'Juan Perez',
    '+54 9 11 5555-0101',
    'juan.perez@example.com'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000001',
    'Maria Gomez',
    '+54 9 11 5555-0102',
    null
  )
on conflict (id) do nothing;

insert into public.vehiculos (
  id, taller_id, cliente_id, marca, modelo, anio, patente, color
) values
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'Volkswagen',
    'Gol Trend',
    2015,
    'AB123CD',
    'Gris'
  ),
  (
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000102',
    'Ford',
    'Fiesta',
    2011,
    'GKY123',
    'Rojo'
  )
on conflict (id) do nothing;

insert into public.servicios (
  id, taller_id, vehiculo_id, fecha_ingreso, fecha_entrega, km_al_ingreso,
  observaciones, estado, total
) values (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000201',
  current_date - 7,
  current_date - 6,
  85000,
  'Cambio de aceite y filtro',
  'entregado',
  45000
)
on conflict (id) do nothing;

insert into public.servicio_items (
  id, taller_id, servicio_id, descripcion, cantidad, precio
) values
  (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000301',
    'Aceite 10W40 (litro)',
    4,
    8000
  ),
  (
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000301',
    'Filtro de aceite',
    1,
    13000
  )
on conflict (id) do nothing;

insert into public.recordatorios (
  id, taller_id, vehiculo_id, tipo, target_km, fecha_estimada, nota, estado
) values (
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000201',
  'km',
  95000,
  current_date + 150,
  'Proximo cambio de aceite a los 95.000 km',
  'pendiente'
)
on conflict (id) do nothing;
