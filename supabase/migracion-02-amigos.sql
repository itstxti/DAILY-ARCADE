-- Daily Arcade · Fase 2, paso 2: amigos.
-- Para bases de datos que YA tienen schema.sql y migracion-01 ejecutados. Idempotente.
-- Las instalaciones nuevas no la necesitan: schema.sql ya incluye esto.

-- 1) Los perfiles dejan de ser legibles por todo el mundo: cada uno lee solo el suyo.
--    Lo que otros pueden ver de ti pasa por las funciones de abajo, que aplican tu privacidad.
drop policy if exists perfiles_ver on profiles;
create policy perfiles_ver on profiles for select to authenticated using (id = (select auth.uid()));

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
