-- Daily Arcade · Fase 2, paso 5a: bloquear usuarios.
-- Para bases de datos que YA tienen schema.sql y las migraciones 01 a 05. Idempotente.
-- Las instalaciones nuevas no la necesitan: schema.sql ya incluye esto.
--
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
