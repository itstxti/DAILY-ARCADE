-- Daily Arcade · base de datos (Supabase → SQL Editor → pegar todo → Run). Ejecútalo UNA vez.
-- Si cambias el día de lanzamiento, cambia también EPOCH en js/core.js: deben coincidir.

create table profiles(
  id uuid primary key references auth.users on delete cascade,
  nombre text not null default 'Jugador' check (length(nombre) between 1 and 20),
  usuario text not null unique check (usuario ~ '^[a-z0-9_]{3,15}$'),
  rol text not null default 'jugador' check (rol in ('jugador','admin')),
  privacidad text not null default 'public' check (privacidad in ('public','friends','private'))
);
alter table profiles enable row level security;
-- Cada uno lee solo su perfil. Lo que otros ven de ti pasa por las funciones de amigos (más abajo), que aplican tu privacidad.
create policy perfiles_ver on profiles for select to authenticated using (id = (select auth.uid()));
create policy perfiles_editar on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Un jugador solo puede cambiar su nombre y su usuario; el rol NO se puede tocar desde la web.
revoke update on profiles from authenticated;
grant update (nombre, usuario, privacidad) on profiles to authenticated;

create function es_admin() returns boolean language sql security definer stable set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and rol = 'admin') $$;

-- Nº del reto de hoy, calculado en el servidor (hora de Madrid). Reto nº 1 = 2026-10-31.
create function reto_hoy() returns int language sql stable as
$$ select ((timezone('Europe/Madrid', now()))::date - date '2026-10-31') + 1 $$;

-- Al crear una cuenta: usa el usuario elegido; si no es válido o ya existe, genera uno (jugador_xxxxxx).
create function nuevo_usuario() returns trigger language plpgsql security definer set search_path = public as
$$
declare u text := lower(trim(coalesce(new.raw_user_meta_data->>'usuario', '')));
begin
  if u !~ '^[a-z0-9_]{3,15}$' or exists (select 1 from profiles where usuario = u) then
    u := 'jugador_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  insert into profiles (id, nombre, usuario)
  values (new.id,
          left(coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Jugador'), 20),
          u);
  return new;
end
$$;
create trigger al_crear_usuario after insert on auth.users for each row execute function nuevo_usuario();

create table retos(
  dia int primary key check (dia >= 1),
  palabra text not null check (palabra ~ '^[a-zñ]{5}$'),
  frase text not null check (length(frase) between 25 and 110),
  autor text not null default 'Refrán popular'
);
alter table retos enable row level security;
-- Los jugadores solo pueden leer hasta el reto de hoy: los días futuros no se ven. Los admin ven y editan todo.
create policy retos_leer on retos for select using (dia <= reto_hoy() or es_admin());
create policy retos_admin on retos for all using (es_admin()) with check (es_admin());

-- Para convertirte en administrador (cambia el correo por el tuyo, después de crear tu cuenta en la web):
-- update profiles set rol = 'admin' where id = (select id from auth.users where email = 'tu@correo.com');

-- Para comprobar si un usuario está libre antes de registrarse.
create function usuario_libre(u text) returns boolean language sql security definer stable set search_path = public as
$$ select not exists (select 1 from profiles where usuario = lower(trim(u))) $$;
grant execute on function usuario_libre(text) to anon, authenticated;

-- ═══ Fase 2 · paso 1: resultados en el servidor ═══
-- Una fila por usuario, día y juego. "datos" es el objeto que guarda cada juego (máx. 4000 caracteres).
-- Si añades un juego nuevo, amplía la lista de resultados_juego_valido (ver README).
create table resultados(
  user_id uuid not null references profiles(id) on delete cascade,
  dia int not null check (dia >= 1),
  juego text not null,
  datos jsonb not null,
  creado timestamptz not null default now(),
  primary key (user_id, dia, juego),
  constraint resultados_juego_valido check (juego in ('palabra','cifra','coronas','sudoku','escalera','operaciones','camino','luces','tuberias','sopa','sospechosos','balanza','intruso','mezcla','siluetas','rayo','caratula','cronologia','pais','pokemon')),
  constraint resultados_datos_validos check (jsonb_typeof(datos) = 'object' and octet_length(datos::text) <= 4000)
);
alter table resultados enable row level security;
revoke all on resultados from anon, authenticated;
grant select, insert, delete on resultados to authenticated;  -- sin UPDATE: un resultado enviado no se reescribe
-- Cada jugador ve solo lo suyo (las reglas de amigos llegan en el paso 2).
create policy resultados_ver_propios on resultados for select to authenticated using (user_id = (select auth.uid()));
-- Solo resultados propios y de días que ya han empezado (nunca del futuro).
create policy resultados_insertar on resultados for insert to authenticated with check (user_id = (select auth.uid()) and dia <= reto_hoy());
-- Para "Borrar mis resultados" en Ajustes.
create policy resultados_borrar on resultados for delete to authenticated using (user_id = (select auth.uid()));

-- ═══ Fase 2 · paso 2: amigos ═══
-- 2) Amistades. Una fila por pareja (da igual quién la pidió). Sin acceso directo desde la web:
--    todo pasa por las funciones de abajo (RLS activado y sin políticas = nadie accede directamente).
create table if not exists amistades(
  id bigint generated always as identity primary key,
  solicitante uuid not null references profiles(id) on delete cascade,
  destinatario uuid not null references profiles(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente','aceptada')),
  creado timestamptz not null default now(),
  check (solicitante <> destinatario)
);
create unique index if not exists amistades_par on amistades (least(solicitante, destinatario), greatest(solicitante, destinatario));
create index if not exists amistades_destinatario on amistades (destinatario);
alter table amistades enable row level security;
revoke all on amistades from anon, authenticated;

-- Reglas de privacidad (se aplican en el servidor, no en el navegador):
--   public  → quien te busque por tu @usuario ve tu nombre; tus amigos ven tu nombre y tus rachas.
--   friends → quien te busque ve solo tu @usuario; tus amigos ven tu nombre y tus rachas.
--   private → no apareces en búsquedas ni te pueden enviar solicitudes; ni tus amigos ven tu nombre ni tus rachas.

-- 3) Buscar por @usuario EXACTO. Devuelve 0 o 1 fila; no hay forma de listar usuarios.
create or replace function buscar_usuario(u text) returns table(usuario text, nombre text, relacion text)
language plpgsql security definer stable set search_path = public as
$$
#variable_conflict use_column
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@'); p profiles; a amistades;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  if h !~ '^[a-z0-9_]{3,15}$' then return; end if;
  select * into p from profiles where profiles.usuario = h;
  if not found then return; end if;
  if p.id = me then return query select p.usuario, p.nombre, 'yo'::text; return; end if;
  select * into a from amistades where (solicitante = me and destinatario = p.id) or (solicitante = p.id and destinatario = me);
  if not found then
    if p.privacidad = 'private' then return; end if;
    return query select p.usuario, case when p.privacidad = 'public' then p.nombre end, 'ninguna'::text;
    return;
  end if;
  return query select p.usuario,
    case when p.privacidad = 'public' or (a.estado = 'aceptada' and p.privacidad <> 'private') then p.nombre end,
    case when a.estado = 'aceptada' then 'amigos' when a.solicitante = me then 'enviada' else 'recibida' end;
end
$$;

-- 4) Enviar solicitud. Si esa persona ya te la había enviado, se acepta directamente. Devuelve 'pendiente' o 'aceptada'.
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
  if p.privacidad = 'private' then raise exception 'No se ha encontrado ese usuario.'; end if;
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

-- 5) Aceptar o rechazar una solicitud RECIBIDA (rechazar la borra).
create or replace function responder_amistad(u text, aceptar boolean) returns void
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@'); a amistades;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select am.* into a from amistades am join profiles p on p.id = am.solicitante
   where p.usuario = h and am.destinatario = me and am.estado = 'pendiente';
  if not found then raise exception 'La solicitud ya no existe.'; end if;
  if aceptar then update amistades set estado = 'aceptada' where id = a.id;
  else delete from amistades where id = a.id; end if;
end
$$;

-- 6) Quitar a un amigo o cancelar una solicitud enviada.
create or replace function eliminar_amistad(u text) returns void
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@');
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  delete from amistades am using profiles p
   where p.usuario = h and ((am.solicitante = me and am.destinatario = p.id) or (am.solicitante = p.id and am.destinatario = me));
end
$$;

-- 7) Todo lo de la pantalla Amigos en una llamada: solicitudes recibidas/enviadas y amigos con su racha.
--    racha/mejor/dias/hoy solo se rellenan para amigos aceptados que no son privados.
--    La racha cuenta como en la app: días seguidos con algún juego, terminando hoy o ayer.
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
    select r.otro, r.estado, r.dir, p.usuario, p.nombre, p.privacidad, (r.estado = 'aceptada' and p.privacidad <> 'private') as ver
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

-- Solo usuarios con sesión pueden llamarlas.
revoke execute on function buscar_usuario(text), solicitar_amistad(text), responder_amistad(text, boolean), eliminar_amistad(text), mis_amistades() from public, anon;
grant execute on function buscar_usuario(text), solicitar_amistad(text), responder_amistad(text, boolean), eliminar_amistad(text), mis_amistades() to authenticated;

-- ═══ Fase 2 · paso 3: rankings entre amigos ═══
-- Quién sale en un ranking ("tu círculo"): tú + tus amigos ACEPTADOS que no tengan el perfil Privado.
-- Nadie fuera de tu círculo aparece, y no hay forma de pedir el ranking de otra persona.
--
-- Ranking del día: más juegos ganados; si empatan, menos tiempo total (solo cuenta si todos sus juegos
--   ganados tienen tiempo válido); si siguen empatados, más juegos jugados. Empates comparten posición.
-- Ranking de rachas: racha actual; si empatan, mejor racha. La racha se calcula como en la app.
-- OJO: hoy el cliente decide si ganaste y cuánto tardaste. Entre amigos es aceptable; para rankings
--   públicos hay que validar en el servidor (paso 4).

-- Interna: los ids de tu círculo. No es llamable desde la web (solo la usan las funciones de abajo).
create or replace function circulo() returns table(id uuid)
language sql security definer stable set search_path = public as
$$
  select auth.uid()
  union
  select case when a.solicitante = auth.uid() then a.destinatario else a.solicitante end
    from amistades a
    join profiles p on p.id = case when a.solicitante = auth.uid() then a.destinatario else a.solicitante end
   where a.estado = 'aceptada' and (a.solicitante = auth.uid() or a.destinatario = auth.uid()) and p.privacidad <> 'private'
$$;
revoke execute on function circulo() from public, anon, authenticated;

-- Ranking de un día (por defecto, hoy). Error si el día no existe todavía.
create or replace function ranking_dia(d int default null)
returns table(pos int, usuario text, nombre text, yo boolean, jugados int, ganados int, tiempo bigint)
language plpgsql security definer stable set search_path = public as
$$
#variable_conflict use_column
declare me uuid := auth.uid(); dd int := coalesce(d, reto_hoy());
begin
  if me is null then return; end if;
  if dd < 1 or dd > reto_hoy() then raise exception 'Ese día no está disponible.'; end if;
  return query
  with res as (
    select x.user_id, x.datos->>'st' as st,
           -- tiempo válido: número > 0 (se limita a 24 h para que la suma no pueda desbordar)
           case when jsonb_typeof(x.datos->'t') = 'number' then
             case when (x.datos->>'t')::numeric > 0 then least((x.datos->>'t')::numeric, 86400000) end
           end as t
      from resultados x
     where x.dia = dd and x.user_id in (select c.id from circulo() c)),
  agg as (
    select c.id,
           count(res.st)::int as jugados,
           (count(*) filter (where res.st in ('won','completed')))::int as ganados,
           case when (count(*) filter (where res.st in ('won','completed') and res.t is null)) = 0
                then (sum(res.t) filter (where res.st in ('won','completed')))::bigint end as tiempo
      from circulo() c left join res on res.user_id = c.id
     group by c.id)
  select case when g.jugados > 0 then (rank() over (order by g.ganados desc, g.tiempo asc nulls last, g.jugados desc))::int end,
         p.usuario, p.nombre, (g.id = me), g.jugados, g.ganados, g.tiempo
    from agg g join profiles p on p.id = g.id
   order by 1 asc nulls last, p.usuario;
end
$$;

-- Ranking de rachas.
create or replace function ranking_rachas()
returns table(pos int, usuario text, nombre text, yo boolean, racha int, mejor int, dias int)
language plpgsql security definer stable set search_path = public as
$$
#variable_conflict use_column
declare me uuid := auth.uid(); h int := reto_hoy();
begin
  if me is null then return; end if;
  return query
  with d as (select distinct s.user_id, s.dia from resultados s where s.user_id in (select c.id from circulo() c)),
  i as (select d.user_id, d.dia, d.dia - (row_number() over (partition by d.user_id order by d.dia))::int as g from d),
  r as (select i.user_id, count(*)::int as n, max(i.dia) as fin from i group by i.user_id, i.g),
  st as (select r.user_id,
                coalesce(max(r.n) filter (where r.fin >= h - 1), 0)::int as racha,
                max(r.n)::int as mejor, sum(r.n)::int as dias
           from r group by r.user_id),
  t as (select c.id, coalesce(st.racha, 0) as racha, coalesce(st.mejor, 0) as mejor, coalesce(st.dias, 0) as dias
          from circulo() c left join st on st.user_id = c.id)
  select (rank() over (order by t.racha desc, t.mejor desc))::int, p.usuario, p.nombre, (t.id = me), t.racha, t.mejor, t.dias
    from t join profiles p on p.id = t.id
   order by 1, p.usuario;
end
$$;

revoke execute on function ranking_dia(int), ranking_rachas() from public, anon;
grant execute on function ranking_dia(int), ranking_rachas() to authenticated;

-- ═══ Fase 2 · paso 2b: perfil de un amigo ═══
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

-- ═══ Fase 2 · paso 2c: privacidad en dos niveles (sustituye a perfil_amigo por ver_perfil) ═══
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

-- ═══ Fase 2 · paso 5a: bloquear usuarios ═══
-- Bloqueo SILENCIOSO y SIMÉTRICO:
--   · Al bloquear se borra la amistad o solicitud entre los dos.
--   · Quien ha sido bloqueado no puede encontrarte, ver tu perfil (aunque sea público) ni enviarte solicitudes:
--     para él es "No se ha encontrado ese usuario", igual que si no existieras. No recibe ningún aviso.
--   · Tú tampoco puedes ver ni añadir a quien has bloqueado (salvo para desbloquearlo en Ajustes).
--   · Si te bloquea otra persona, tú dejas de verla igual que ella a ti.
--   · Desbloquear NO restaura la amistad.

create table if not exists bloqueos(
  bloqueador uuid not null references profiles(id) on delete cascade,
  bloqueado uuid not null references profiles(id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (bloqueador, bloqueado),
  check (bloqueador <> bloqueado)
);
create index if not exists bloqueos_bloqueado on bloqueos (bloqueado);
alter table bloqueos enable row level security;
revoke all on bloqueos from anon, authenticated;   -- sin acceso directo: todo pasa por las funciones de abajo

-- Interna: ¿hay un bloqueo entre estas dos personas, en cualquier sentido? No es llamable desde la web.
create or replace function hay_bloqueo(x uuid, y uuid) returns boolean
language sql security definer stable set search_path = public as
$$ select exists (select 1 from bloqueos b where (b.bloqueador = x and b.bloqueado = y) or (b.bloqueador = y and b.bloqueado = x)) $$;
revoke execute on function hay_bloqueo(uuid, uuid) from public, anon, authenticated;

-- Tu círculo (rankings): tú + tus amigos aceptados sin bloqueo entre medias (el bloqueo ya borra la amistad; esto es una red de seguridad).
create or replace function circulo() returns table(id uuid)
language sql security definer stable set search_path = public as
$$
  select auth.uid()
  union
  select case when a.solicitante = auth.uid() then a.destinatario else a.solicitante end
    from amistades a
   where a.estado = 'aceptada' and (a.solicitante = auth.uid() or a.destinatario = auth.uid())
     and not hay_bloqueo(a.solicitante, a.destinatario)
$$;
revoke execute on function circulo() from public, anon, authenticated;

-- Buscar: si te ha bloqueado, no aparece nada; si lo has bloqueado tú, aparece con relacion = 'bloqueado' (para poder desbloquearlo).
create or replace function buscar_usuario(u text) returns table(usuario text, nombre text, relacion text, publico boolean)
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
  if exists (select 1 from bloqueos b where b.bloqueador = p.id and b.bloqueado = me) then return; end if;
  if exists (select 1 from bloqueos b where b.bloqueador = me and b.bloqueado = p.id) then
    return query select p.usuario, case when p.privacidad = 'public' then p.nombre end, 'bloqueado'::text, (p.privacidad = 'public');
    return;
  end if;
  select * into a from amistades where (solicitante = me and destinatario = p.id) or (solicitante = p.id and destinatario = me);
  rel := case when not found then 'ninguna' when a.estado = 'aceptada' then 'amigos' when a.solicitante = me then 'enviada' else 'recibida' end;
  return query select p.usuario, case when p.privacidad = 'public' or rel = 'amigos' then p.nombre end, rel, (p.privacidad = 'public');
end
$$;

-- Solicitar amistad.
create or replace function solicitar_amistad(u text) returns text
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@'); p profiles; a amistades; n int;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select * into p from profiles where usuario = h;
  if not found then raise exception 'No se ha encontrado ese usuario.'; end if;
  if p.id = me then raise exception 'No puedes añadirte a ti mismo.'; end if;
  if exists (select 1 from bloqueos b where b.bloqueador = p.id and b.bloqueado = me) then raise exception 'No se ha encontrado ese usuario.'; end if;
  if exists (select 1 from bloqueos b where b.bloqueador = me and b.bloqueado = p.id) then raise exception 'Has bloqueado a este usuario. Desbloquéalo para añadirlo.'; end if;
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

-- Ver perfil.
create or replace function ver_perfil(u text) returns jsonb
language plpgsql security definer stable set search_path = public as
$$
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@'); p profiles; lista jsonb;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select pr.* into p from profiles pr where pr.usuario = h;
  if not found then raise exception 'No se ha encontrado ese usuario.'; end if;
  if p.id = me then raise exception 'Ese es tu perfil.'; end if;
  if exists (select 1 from bloqueos b where b.bloqueador = p.id and b.bloqueado = me) then raise exception 'No se ha encontrado ese usuario.'; end if;
  if exists (select 1 from bloqueos b where b.bloqueador = me and b.bloqueado = p.id) then raise exception 'Has bloqueado a este usuario.'; end if;
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

-- Bloquear: borra cualquier amistad o solicitud entre los dos. Máximo 200 bloqueos por usuario.
create or replace function bloquear_usuario(u text) returns void
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@'); pid uuid; n int;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select id into pid from profiles where usuario = h;
  if pid is null then raise exception 'No se ha encontrado ese usuario.'; end if;
  if pid = me then raise exception 'No puedes bloquearte a ti mismo.'; end if;
  select count(*) into n from bloqueos where bloqueador = me;
  if n >= 200 and not exists (select 1 from bloqueos where bloqueador = me and bloqueado = pid) then
    raise exception 'Has llegado al máximo de usuarios bloqueados.';
  end if;
  insert into bloqueos(bloqueador, bloqueado) values (me, pid) on conflict do nothing;
  delete from amistades where (solicitante = me and destinatario = pid) or (solicitante = pid and destinatario = me);
end
$$;

create or replace function desbloquear_usuario(u text) returns void
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u,''))), '@');
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  delete from bloqueos b using profiles p where p.usuario = h and b.bloqueador = me and b.bloqueado = p.id;
end
$$;

-- Los usuarios que has bloqueado tú (nunca quién te ha bloqueado a ti). El nombre solo si su perfil es público.
create or replace function mis_bloqueados() returns table(usuario text, nombre text)
language plpgsql security definer stable set search_path = public as
$$
#variable_conflict use_column
begin
  if auth.uid() is null then return; end if;
  return query
    select p.usuario, case when p.privacidad = 'public' then p.nombre end
      from bloqueos b join profiles p on p.id = b.bloqueado
     where b.bloqueador = auth.uid()
     order by b.creado desc;
end
$$;

revoke execute on function buscar_usuario(text), ver_perfil(text), bloquear_usuario(text), desbloquear_usuario(text), mis_bloqueados() from public, anon;
grant execute on function buscar_usuario(text), ver_perfil(text), bloquear_usuario(text), desbloquear_usuario(text), mis_bloqueados() to authenticated;
grant select on profiles to service_role;