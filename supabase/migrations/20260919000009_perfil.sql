-- Perfil: nombre del mecánico (para el saludo) y logo del taller.
-- El logo se guarda como imagen chica en base64 (data URL), sin servicio de
-- almacenamiento aparte; el front la achica a ~160 px antes de subirla.
-- usuarios y talleres solo tienen policy de SELECT: la edición pasa por la
-- función guardar_perfil, que toca solo estas columnas (el usuario no puede
-- cambiar su rol ni otros datos).

alter table public.usuarios
  add column nombre text,
  add constraint usuarios_nombre_largo
    check (nombre is null or char_length(nombre) <= 60);

alter table public.talleres
  add column logo text,
  add constraint talleres_logo_valido
    check (
      logo is null
      or (
        char_length(logo) <= 100000
        and logo ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'
      )
    );

-- p_logo: null = dejar el logo como está; '' = quitarlo; otro valor = nuevo logo.
-- El nombre y el logo del taller solo los cambia el dueño (rol 'owner').
create function public.guardar_perfil(
  p_nombre_mecanico text,
  p_nombre_taller text,
  p_logo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
begin
  select rol into v_rol from public.usuarios where id = auth.uid();
  if v_rol is null then
    raise exception 'Usuario sin taller' using errcode = '42501';
  end if;

  update public.usuarios
    set nombre = nullif(btrim(p_nombre_mecanico), '')
    where id = auth.uid();

  if v_rol = 'owner' then
    update public.talleres
      set nombre = coalesce(nullif(btrim(p_nombre_taller), ''), nombre),
          logo = case
            when p_logo is null then logo
            when p_logo = '' then null
            else p_logo
          end
      where id = public.current_taller_id();
  end if;
end;
$$;

revoke all on function public.guardar_perfil(text, text, text) from public;
grant execute on function public.guardar_perfil(text, text, text) to authenticated;
