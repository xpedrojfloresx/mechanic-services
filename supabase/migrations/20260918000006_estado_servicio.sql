-- Estado del servicio: lista cerrada (En taller / Listo / Entregado).
-- Los servicios existentes (sin estado) pasan a "en_taller".

update public.servicios set estado = 'en_taller' where estado is null;

alter table public.servicios
  alter column estado set default 'en_taller',
  alter column estado set not null,
  add constraint servicios_estado_check
    check (estado in ('en_taller', 'listo', 'entregado'));

create index servicios_taller_estado_idx
  on public.servicios (taller_id, estado);
