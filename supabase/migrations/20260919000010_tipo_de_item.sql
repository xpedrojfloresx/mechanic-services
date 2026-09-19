-- Tipo de cada renglón de un servicio: repuesto o mano de obra, para poder
-- mostrar subtotales. Es opcional: los renglones que ya estaban cargados
-- quedan sin clasificar (null) en vez de asignarles un tipo que no se eligió.

alter table public.servicio_items
  add column tipo text,
  add constraint servicio_items_tipo_check
    check (tipo is null or tipo in ('repuesto', 'mano_de_obra'));
