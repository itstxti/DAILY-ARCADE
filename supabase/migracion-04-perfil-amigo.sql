-- Daily Arcade · Fase 2, paso 2b: ver el perfil de un amigo (rachas, actividad y estadísticas por juego).
-- Para bases de datos que YA tienen schema.sql y las migraciones 01, 02 y 03. Idempotente.
-- Las instalaciones nuevas no la necesitan: schema.sql ya incluye esto.
--
-- Solo se puede ver el perfil de un amigo ACEPTADO que no tenga el perfil Privado (la misma regla que "tu círculo").
-- Para cualquier otro caso (no existe, no es amigo, es privado, eres tú) el error es el mismo: no se revela nada.
-- Se devuelve únicamente lo necesario para las estadísticas: resultado (st) y las cifras t, att, sc, n, par, h.
-- NUNCA se devuelven los intentos de "Palabra" (g), que desvelarían la solución del día a quien aún no ha jugado.

create or replace function perfil_amigo(u text) returns jsonb
language plpgsql security definer stable set search_path = public as
$$
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@'); p profiles; lista jsonb;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select pr.* into p from profiles pr where pr.usuario = h;
  if not found or p.id = me or p.id not in (select c.id from circulo() c) then
    raise exception 'No puedes ver este perfil.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('d', r.dia, 'j', r.juego, 'x', f.x) order by r.dia, r.juego), '[]'::jsonb) into lista
    from resultados r
    cross join lateral (
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) as x
        from jsonb_each(r.datos) e
       where (e.key = 'st' and e.value in ('"won"'::jsonb, '"completed"'::jsonb, '"lost"'::jsonb))
          or (e.key in ('t','att','sc','n','par','h') and jsonb_typeof(e.value) = 'number')) f
   where r.user_id = p.id and r.datos->>'st' in ('won','completed','lost');
  return jsonb_build_object('usuario', p.usuario, 'nombre', p.nombre, 'resultados', lista);
end
$$;

revoke execute on function perfil_amigo(text) from public, anon;
grant execute on function perfil_amigo(text) to authenticated;
