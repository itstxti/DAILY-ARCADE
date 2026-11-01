-- Daily Arcade · Fase 2, paso 2c: privacidad en dos niveles.
-- Para bases de datos que YA tienen schema.sql y las migraciones 01 a 04. Idempotente.
-- Las instalaciones nuevas no la necesitan: schema.sql ya incluye esto.
--
--   public  → cualquier usuario con sesión que te encuentre por tu @usuario puede ver tu perfil
--             (nombre, rachas, actividad y estadísticas por juego).
--   private → solo tus amigos ven tu perfil. Los demás te pueden encontrar por tu @usuario y enviarte una
--             solicitud, pero solo ven tu @usuario (ni nombre ni rachas).
-- El antiguo "Solo amigos" pasa a "Privado". Tus amigos (aceptados) entran en rankings y listas sea cual sea tu nivel.

-- 1) Solo dos valores.
alter table profiles drop constraint if exists profiles_privacidad_check;
update profiles set privacidad = 'private' where privacidad not in ('public', 'private');
alter table profiles add constraint profiles_privacidad_check check (privacidad in ('public', 'private'));

-- 2) Tu círculo (rankings): tú + todos tus amigos aceptados.
create or replace function circulo() returns table(id uuid)
language sql security definer stable set search_path = public as
$$
  select auth.uid()
  union
  select case when a.solicitante = auth.uid() then a.destinatario else a.solicitante end
    from amistades a
   where a.estado = 'aceptada' and (a.solicitante = auth.uid() or a.destinatario = auth.uid())
$$;
revoke execute on function circulo() from public, anon, authenticated;

-- 3) Buscar por @usuario exacto. Ahora también devuelve "publico" (true = se puede ver su perfil sin ser amigos).
drop function if exists buscar_usuario(text);
create function buscar_usuario(u text) returns table(usuario text, nombre text, relacion text, publico boolean)
language plpgsql security definer stable set search_path = public as
$$
#variable_conflict use_column
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@'); p profiles; a amistades; rel text;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  if h !~ '^[a-z0-9_]{3,15}$' then return; end if;
  select * into p from profiles where profiles.usuario = h;
  if not found then return; end if;
  if p.id = me then return query select p.usuario, p.nombre, 'yo'::text, true; return; end if;
  select * into a from amistades where (solicitante = me and destinatario = p.id) or (solicitante = p.id and destinatario = me);
  rel := case when not found then 'ninguna' when a.estado = 'aceptada' then 'amigos' when a.solicitante = me then 'enviada' else 'recibida' end;
  return query select p.usuario, case when p.privacidad = 'public' or rel = 'amigos' then p.nombre end, rel, (p.privacidad = 'public');
end
$$;

-- 4) Enviar solicitud: ya no hay perfiles que no se puedan encontrar.
create or replace function solicitar_amistad(u text) returns text
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@'); p profiles; a amistades; n int;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select * into p from profiles where usuario = h;
  if not found then raise exception 'No se ha encontrado ese usuario.'; end if;
  if p.id = me then raise exception 'No puedes añadirte a ti mismo.'; end if;
  select * into a from amistades where (solicitante = me and destinatario = p.id) or (solicitante = p.id and destinatario = me);
  if found then
    if a.estado = 'aceptada' then raise exception 'Ya sois amigos.'; end if;
    if a.solicitante = me then raise exception 'Ya le enviaste una solicitud.'; end if;
    update amistades set estado = 'aceptada' where id = a.id;
    return 'aceptada';
  end if;
  select count(*) into n from amistades where solicitante = me and estado = 'pendiente';
  if n >= 30 then raise exception 'Tienes demasiadas solicitudes pendientes. Cancela alguna o espera a que respondan.'; end if;
  select count(*) into n from amistades where solicitante = me or destinatario = me;
  if n >= 200 then raise exception 'Has llegado al máximo de amigos y solicitudes.'; end if;
  begin
    insert into amistades(solicitante, destinatario) values (me, p.id);
  exception when unique_violation then
    raise exception 'Ya hay una solicitud entre vosotros.';
  end;
  return 'pendiente';
end
$$;

-- 5) Lista de amistades: los amigos aceptados siempre se ven (con racha); en solicitudes solo se ve el nombre si es público.
create or replace function mis_amistades() returns table(usuario text, nombre text, estado text, direccion text, visible boolean, racha int, mejor int, dias int, hoy int)
language plpgsql security definer stable set search_path = public as
$$
#variable_conflict use_column
declare me uuid := auth.uid(); h int := reto_hoy();
begin
  if me is null then return; end if;
  return query
  with rel as (
    select a.id, case when a.solicitante = me then a.destinatario else a.solicitante end as otro, a.estado,
           case when a.solicitante = me then 'enviada' else 'recibida' end as dir
      from amistades a where a.solicitante = me or a.destinatario = me),
  v as (
    select r.otro, r.estado, r.dir, p.usuario, p.nombre, p.privacidad, (r.estado = 'aceptada') as ver
      from rel r join profiles p on p.id = r.otro),
  d as (select distinct s.user_id, s.dia from resultados s join v on v.otro = s.user_id where v.ver),
  i as (select d.user_id, d.dia, d.dia - (row_number() over (partition by d.user_id order by d.dia))::int as g from d),
  c as (select i.user_id, count(*)::int as n, max(i.dia) as fin from i group by i.user_id, i.g),
  st as (select c.user_id, max(c.n)::int as mejor, coalesce(max(c.n) filter (where c.fin >= h - 1), 0)::int as racha, sum(c.n)::int as dias from c group by c.user_id),
  hy as (select s.user_id, count(*)::int as n from resultados s join v on v.otro = s.user_id where v.ver and s.dia = h group by s.user_id)
  select v.usuario,
         case when v.privacidad = 'public' or v.ver then v.nombre end,
         v.estado, v.dir, v.ver,
         case when v.ver then coalesce(st.racha, 0) end,
         case when v.ver then coalesce(st.mejor, 0) end,
         case when v.ver then coalesce(st.dias, 0) end,
         case when v.ver then coalesce(hy.n, 0) end
    from v left join st on st.user_id = v.otro left join hy on hy.user_id = v.otro
   order by (v.estado = 'pendiente') desc, (v.dir = 'recibida') desc, coalesce(st.racha, 0) desc, v.usuario;
end
$$;

-- 6) Ver el perfil de otra persona: si es pública, cualquiera con sesión; si es privada, solo sus amigos.
--    Sustituye a perfil_amigo. Solo devuelve st, t, att, sc, n, par y h de cada resultado;
--    NUNCA los intentos de Palabra (g), que desvelarían la solución del día.
drop function if exists perfil_amigo(text);
create or replace function ver_perfil(u text) returns jsonb
language plpgsql security definer stable set search_path = public as
$$
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@'); p profiles; lista jsonb;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select pr.* into p from profiles pr where pr.usuario = h;
  if not found then raise exception 'No se ha encontrado ese usuario.'; end if;
  if p.id = me then raise exception 'Ese es tu perfil.'; end if;
  if p.privacidad <> 'public' and p.id not in (select c.id from circulo() c) then
    raise exception 'Este perfil es privado: solo lo ven sus amigos.';
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

revoke execute on function buscar_usuario(text), ver_perfil(text) from public, anon;
grant execute on function buscar_usuario(text), ver_perfil(text) to authenticated;
