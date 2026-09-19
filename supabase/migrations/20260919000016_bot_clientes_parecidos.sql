-- Bot de Telegram: "¿quisiste decir...?". Whisper a veces escribe mal los
-- apellidos ("Bock" o "Boq" por "Boock"). Cuando no hay ningún cliente con ese
-- nombre, se buscan los más PARECIDOS (pg_trgm, sin tildes ni mayúsculas) para
-- ofrecerlos con botones. Solo lectura, filtrada por el taller del usuario de
-- Telegram; solo la ejecuta service_role. Devuelve hasta 5, del más parecido
-- al menos; [] si ninguno se parece lo suficiente.

create function public.bot_clientes_parecidos(
  p_telegram_user_id bigint,
  p_nombre text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taller uuid := public.bot_taller_id(p_telegram_user_id);
  v_q text := public.bot_sin_acentos(btrim(coalesce(p_nombre, '')));
begin
  if char_length(v_q) < 3 then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', x.id, 'nombre', x.nombre, 'telefono', x.telefono)
      order by x.por_palabra desc, x.total desc, x.nombre)
    from (
      select c.id, c.nombre, c.telefono,
             word_similarity(v_q, public.bot_sin_acentos(c.nombre)) as por_palabra,
             similarity(v_q, public.bot_sin_acentos(c.nombre)) as total
      from public.clientes c
      where c.taller_id = v_taller
        and word_similarity(v_q, public.bot_sin_acentos(c.nombre)) >= 0.45
      order by por_palabra desc, total desc, c.nombre
      limit 5
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.bot_clientes_parecidos(bigint, text) from public, anon, authenticated;
grant execute on function public.bot_clientes_parecidos(bigint, text) to service_role;
