-- Daily Arcade · Duelos entre amigos (mejor de 5).
-- Ejecútalo UNA vez en el SQL Editor de Supabase, DESPUÉS de schema.sql. Es idempotente (se puede repetir).
--
-- Cómo funciona
--   1. Un jugador reta a un amigo (duelo_retar). La invitación caduca a los 5 minutos (cfg.invitacion).
--   2. El rival acepta o rechaza (duelo_responder). Al aceptar empieza el duelo; el retador también puede cancelarla.
--   3. Se juegan hasta 5 rondas, cada una con un juego distinto elegido al azar por el SERVIDOR (misma semilla para los dos).
--      Gana la ronda quien lo resuelve con menos intentos (Palabra, Escalera, Luces, Operaciones) o más rápido (el resto);
--      el tiempo sirve de desempate. Quien se rinde o no resuelve pierde la ronda. Si no resuelve ninguno, la ronda queda en tablas.
--   4. Gana el duelo quien llega primero a 3 rondas (cfg.victorias), o quien tenga más tras 5 rondas.
--   5. duelo_rendirse termina el duelo al instante. Si alguien no juega dos rondas seguidas se da por abandonado.
--
-- Seguridad: las tablas no tienen acceso directo (RLS activado y sin políticas). Todo pasa por las funciones de abajo,
-- que comprueban que eres uno de los dos jugadores. El tiempo lo mide el servidor (ver cfg.holgura): el navegador
-- no puede declarar un tiempo muy inferior al real. Los intentos sí los declara el navegador (igual que el ranking),
-- salvo en Palabra, donde el servidor comprueba la lista de intentos contra la palabra de la ronda.
--
-- Si añades un juego nuevo, añádelo también a duelo_juegos() y, si se puntúa por intentos, a duelo_por_tiempo().

-- ───── Parámetros (única fuente de verdad: el navegador los recibe en mis_duelos().cfg) ─────
create or replace function duelo_cfg() returns jsonb language sql immutable as
$$ select jsonb_build_object(
     'invitacion', 300,   -- segundos que dura una invitación sin responder
     'ronda', 300,        -- segundos máximos por ronda
     'inicio', 15,        -- segundos entre aceptar el duelo y empezar la primera ronda (da tiempo a que el retador se entere)
     'pausa', 8,          -- segundos entre el final de una ronda y el comienzo de la siguiente
     'rondas', 5,         -- rondas máximas
     'victorias', 3,      -- rondas para ganar antes de tiempo
     'holgura', 4000)     -- ms que se le perdonan a cada jugador por latencia al empezar la ronda
$$;

create or replace function duelo_juegos() returns text[] language sql immutable as
$$ select array['palabra','cifra','coronas','sudoku','escalera','operaciones','camino','luces','tuberias','sopa'] $$;

-- Juegos que se puntúan por intentos (menos = mejor). El resto se puntúan por tiempo.
create or replace function duelo_por_tiempo(jg text) returns boolean language sql immutable as
$$ select jg <> all (array['palabra','escalera','luces','operaciones']) $$;

-- ───── Tablas ─────
create table if not exists duelos(
  id uuid primary key default gen_random_uuid(),
  retador uuid not null references profiles(id) on delete cascade,
  rival uuid not null references profiles(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','terminado','rechazado','cancelado','expirado')),
  creado timestamptz not null default clock_timestamp(),
  expira timestamptz not null,
  ronda int not null default 0 check (ronda between 0 and 5),
  pt_retador int not null default 0,
  pt_rival int not null default 0,
  ganador uuid references profiles(id),
  motivo text check (motivo in ('puntos','empate','rendicion','abandono')),
  cerrado timestamptz,
  check (retador <> rival)
);
create index if not exists duelos_retador on duelos (retador, estado);
create index if not exists duelos_rival on duelos (rival, estado);
-- Como mucho una invitación o duelo activo por pareja (da igual quién retó).
create unique index if not exists duelos_pareja_activa on duelos (least(retador, rival), greatest(retador, rival)) where estado in ('pendiente','en_curso');

create table if not exists duelo_rondas(
  duelo uuid not null references duelos(id) on delete cascade,
  n int not null check (n between 1 and 5),
  juego text not null,
  semilla int not null,
  contenido jsonb,                       -- palabra/frase de la ronda (solo la usan Palabra, Cifrado y Sopa)
  empieza timestamptz not null,
  limite timestamptz not null,
  res_retador jsonb, res_rival jsonb,    -- lo que envía cada navegador al terminar
  fin_retador timestamptz, fin_rival timestamptz,   -- cuándo llegó cada envío al servidor
  ganador uuid,                          -- null = tablas
  tt_retador bigint, tt_rival bigint,    -- tiempo que cuenta el servidor, en ms (solo rondas cerradas)
  cerrada boolean not null default false,
  primary key (duelo, n),
  constraint duelo_rondas_juego_valido check (juego = any (duelo_juegos()))
);
alter table duelos enable row level security;
alter table duelo_rondas enable row level security;
revoke all on duelos, duelo_rondas from anon, authenticated;

-- ───── Utilidades internas (no llamables desde la web) ─────
create or replace function duelo_ms(t timestamptz) returns bigint language sql immutable as
$$ select floor(extract(epoch from t) * 1000)::bigint $$;

-- Número seguro de un campo del resultado (0 si falta o no es un número).
create or replace function duelo_num(dat jsonb, k text) returns bigint language sql immutable as
$$ select case when jsonb_typeof(dat->k) = 'number' then least(greatest((dat->>k)::numeric, 0), 1000000000)::bigint else 0 end $$;

-- Evita carreras: bloquea a los dos jugadores, siempre en el mismo orden.
create or replace function duelo_candado(a uuid, b uuid) returns void language plpgsql as
$$
begin
  perform pg_advisory_xact_lock(hashtextextended(least(a, b)::text, 7));
  perform pg_advisory_xact_lock(hashtextextended(greatest(a, b)::text, 7));
end
$$;

-- Clave de comparación de un resultado: menor = mejor; null = no ha ganado la ronda (rendido, fallado o sin enviar).
--   clave = (intentos, 0 en los juegos por tiempo) * 1e9 + tiempo en ms (+ penalizaciones por pistas/comprobaciones).
create or replace function duelo_clave(jg text, dat jsonb, ct jsonb, empieza timestamptz, fin timestamptz) returns bigint
language plpgsql stable as
$$
declare st text; el bigint; t bigint; pri bigint := 0; pen bigint := 0; ult text;
begin
  if dat is null or jsonb_typeof(dat) <> 'object' then return null; end if;
  st := dat->>'st';
  if st is null or st not in ('won','completed') then return null; end if;
  -- El tiempo cuenta como mínimo lo que ha pasado en el servidor desde que empezó la ronda (menos la holgura).
  el := floor(extract(epoch from (fin - empieza)) * 1000)::bigint;
  t := least(greatest(duelo_num(dat, 't'), el - (duelo_cfg()->>'holgura')::bigint, 0), 3600000);
  if jg = 'palabra' then
    -- Se comprueba la lista de intentos: el último debe ser la palabra de la ronda.
    if ct is null or coalesce(jsonb_typeof(dat->'g'), '') <> 'array' then return null; end if;
    if jsonb_array_length(dat->'g') not between 1 and 6 then return null; end if;
    ult := dat->'g'->>(jsonb_array_length(dat->'g') - 1);
    if ult is distinct from ct->>'p' then return null; end if;
    pri := jsonb_array_length(dat->'g');
  elsif jg in ('escalera','luces','operaciones') then
    pri := case when duelo_num(dat, 'n') = 0 then 999 else least(duelo_num(dat, 'n'), 999) end;
  elsif jg = 'cifra' then
    pen := (100 - least(duelo_num(dat, 'sc'), 100)) * 1000;      -- cada pista o comprobación resta puntos: 1 punto = 1 s
  elsif jg = 'sopa' then
    pen := least(duelo_num(dat, 'h'), 20) * 15000;               -- 15 s por pista
  end if;
  return pri * 1000000000 + least(t + pen, 999999999);
end
$$;

-- Crea la siguiente ronda: juego distinto a los ya jugados, semilla al azar y contenido de un reto YA PASADO
-- (así no se desvela ningún reto diario futuro; si todavía no hay pasados, se usa cualquiera hasta hoy).
create or replace function duelo_nueva_ronda(did uuid) returns void
language plpgsql set search_path = public as
$$
declare d duelos; jg text; ct jsonb; cfg jsonb := duelo_cfg(); ini timestamptz;
begin
  select * into d from duelos where id = did;
  ini := clock_timestamp() + make_interval(secs => (case when d.ronda = 0 then cfg->>'inicio' else cfg->>'pausa' end)::int);
  select j into jg from unnest(duelo_juegos()) j where j not in (select juego from duelo_rondas where duelo = did) order by random() limit 1;
  select jsonb_build_object('p', palabra, 'f', frase, 'a', autor) into ct from retos where dia < reto_hoy() order by random() limit 1;
  if ct is null then select jsonb_build_object('p', palabra, 'f', frase, 'a', autor) into ct from retos where dia <= reto_hoy() order by random() limit 1; end if;
  update duelos set ronda = d.ronda + 1 where id = did;
  insert into duelo_rondas(duelo, n, juego, semilla, contenido, empieza, limite)
  values (did, d.ronda + 1, jg, 1 + floor(random() * 999999999)::int, ct, ini, ini + make_interval(secs => (cfg->>'ronda')::int));
end
$$;

-- Cierra la ronda en juego (con lo que haya enviado cada uno), reparte el punto y decide si el duelo sigue.
create or replace function duelo_cerrar_ronda(did uuid) returns void
language plpgsql set search_path = public as
$$
declare d duelos; r duelo_rondas; pv duelo_rondas; ka bigint; kb bigint; gan uuid; cfg jsonb := duelo_cfg(); ab_a boolean; ab_b boolean;
begin
  select * into d from duelos where id = did for update;
  select * into r from duelo_rondas where duelo = did and n = d.ronda for update;
  if not found or r.cerrada then return; end if;
  ka := duelo_clave(r.juego, r.res_retador, r.contenido, r.empieza, r.fin_retador);
  kb := duelo_clave(r.juego, r.res_rival, r.contenido, r.empieza, r.fin_rival);
  if ka is null and kb is null then gan := null;
  elsif kb is null then gan := d.retador;
  elsif ka is null then gan := d.rival;
  elsif ka < kb then gan := d.retador;
  elsif kb < ka then gan := d.rival;
  else gan := case when r.fin_retador < r.fin_rival then d.retador when r.fin_rival < r.fin_retador then d.rival else null end;
  end if;
  update duelo_rondas set cerrada = true, ganador = gan,
         tt_retador = ka % 1000000000, tt_rival = kb % 1000000000 where duelo = did and n = r.n;
  update duelos set pt_retador = pt_retador + case when gan = d.retador then 1 else 0 end,
                    pt_rival = pt_rival + case when gan = d.rival then 1 else 0 end where id = did returning * into d;

  -- ¿Abandono? No ha enviado nada esta ronda ni la anterior.
  select * into pv from duelo_rondas where duelo = did and n = r.n - 1;
  ab_a := found and r.res_retador is null and pv.res_retador is null;
  ab_b := pv.n is not null and r.res_rival is null and pv.res_rival is null;
  if ab_a or ab_b then
    update duelos set estado = 'terminado', cerrado = clock_timestamp(), motivo = 'abandono',
           ganador = case when ab_a and not ab_b then d.rival when ab_b and not ab_a then d.retador else null end where id = did;
  elsif d.pt_retador >= (cfg->>'victorias')::int or d.pt_rival >= (cfg->>'victorias')::int then
    update duelos set estado = 'terminado', cerrado = clock_timestamp(), motivo = 'puntos',
           ganador = case when d.pt_retador > d.pt_rival then d.retador else d.rival end where id = did;
  elsif d.ronda >= (cfg->>'rondas')::int then
    update duelos set estado = 'terminado', cerrado = clock_timestamp(),
           motivo = case when d.pt_retador = d.pt_rival then 'empate' else 'puntos' end,
           ganador = case when d.pt_retador > d.pt_rival then d.retador when d.pt_rival > d.pt_retador then d.rival else null end where id = did;
  else
    perform duelo_nueva_ronda(did);
  end if;
end
$$;

-- Pone al día un duelo según el reloj: caduca invitaciones, cierra rondas que se han pasado de tiempo
-- o en las que el rival ya no puede ganar. Se llama al leer o modificar un duelo (no hace falta ningún cron).
create or replace function duelo_avanzar(did uuid) returns void
language plpgsql set search_path = public as
$$
declare d duelos; r duelo_rondas; k bigint;
begin
  select * into d from duelos where id = did for update;
  if not found then return; end if;
  if d.estado = 'pendiente' then
    if d.expira <= clock_timestamp() then update duelos set estado = 'expirado', cerrado = clock_timestamp() where id = did; end if;
    return;
  end if;
  if d.estado <> 'en_curso' then return; end if;
  select * into r from duelo_rondas where duelo = did and n = d.ronda;
  if not found or r.cerrada then return; end if;
  if r.limite <= clock_timestamp() then perform duelo_cerrar_ronda(did); return; end if;
  -- Juego por tiempo en el que uno ya ha terminado y al otro ya no le da tiempo a mejorarlo.
  if duelo_por_tiempo(r.juego) and (r.res_retador is null) <> (r.res_rival is null) then
    k := case when r.res_retador is not null then duelo_clave(r.juego, r.res_retador, r.contenido, r.empieza, r.fin_retador)
              else duelo_clave(r.juego, r.res_rival, r.contenido, r.empieza, r.fin_rival) end;
    if k is not null and floor(extract(epoch from (clock_timestamp() - r.empieza)) * 1000) - (duelo_cfg()->>'holgura')::bigint > k % 1000000000 then
      perform duelo_cerrar_ronda(did);
    end if;
  end if;
end
$$;

create or replace function duelo_barrer(uid uuid) returns void language plpgsql set search_path = public as
$$
declare x uuid;
begin
  for x in select id from duelos where (retador = uid or rival = uid) and estado in ('pendiente','en_curso') loop
    perform duelo_avanzar(x);
  end loop;
end
$$;

-- Estado de un duelo tal como lo ve el jugador `me`. Del rival solo se ve su resultado cuando la ronda ya está cerrada.
create or replace function duelo_json(d duelos, me uuid) returns jsonb
language sql stable set search_path = public as
$$
  select jsonb_build_object(
    'id', d.id, 'estado', d.estado, 'soy', case when d.retador = me then 'retador' else 'rival' end,
    'rival', (select jsonb_build_object('usuario', p.usuario, 'nombre', case when p.privacidad = 'private' then null else p.nombre end)
                from profiles p where p.id = case when d.retador = me then d.rival else d.retador end),
    'creado', duelo_ms(d.creado), 'expira', duelo_ms(d.expira), 'cerrado', duelo_ms(d.cerrado), 'ronda', d.ronda,
    'yo', case when d.retador = me then d.pt_retador else d.pt_rival end,
    'ellos', case when d.retador = me then d.pt_rival else d.pt_retador end,
    'ganador', case when d.ganador is null then null when d.ganador = me then 'yo' else 'rival' end,
    'motivo', d.motivo,
    'rondas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'n', r.n, 'juego', r.juego, 'semilla', r.semilla, 'contenido', r.contenido,
        'empieza', duelo_ms(r.empieza), 'limite', duelo_ms(r.limite), 'cerrada', r.cerrada,
        'yo', case when d.retador = me then r.res_retador else r.res_rival end,
        'yo_fin', (case when d.retador = me then r.res_retador else r.res_rival end) is not null,
        'rival_fin', (case when d.retador = me then r.res_rival else r.res_retador end) is not null,
        'rival', case when r.cerrada then case when d.retador = me then r.res_rival else r.res_retador end end,
        'tt_yo', case when r.cerrada then case when d.retador = me then r.tt_retador else r.tt_rival end end,
        'tt_rival', case when r.cerrada then case when d.retador = me then r.tt_rival else r.tt_retador end end,
        'ganador', case when not r.cerrada then null when r.ganador is null then null when r.ganador = me then 'yo' else 'rival' end
      ) order by r.n) from duelo_rondas r where r.duelo = d.id), '[]'::jsonb))
$$;

-- ───── API para el navegador ─────

-- Retar a un amigo por su @usuario. Devuelve el id del duelo.
create or replace function duelo_retar(u text) returns uuid
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); h text := ltrim(lower(trim(coalesce(u, ''))), '@'); p profiles; n int; did uuid; ex duelos;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select * into p from profiles where usuario = h;
  if not found then raise exception 'No se ha encontrado ese usuario.'; end if;
  if p.id = me then raise exception 'No puedes retarte a ti mismo.'; end if;
  if hay_bloqueo(me, p.id) or not exists (
       select 1 from amistades a where a.estado = 'aceptada' and ((a.solicitante = me and a.destinatario = p.id) or (a.solicitante = p.id and a.destinatario = me)))
  then raise exception 'Solo puedes retar a tus amigos.'; end if;
  perform duelo_candado(me, p.id);
  perform duelo_barrer(me); perform duelo_barrer(p.id);
  if exists (select 1 from duelos where estado = 'en_curso' and me in (retador, rival)) then raise exception 'Ya estás en un duelo. Termínalo antes de empezar otro.'; end if;
  if exists (select 1 from duelos where estado = 'en_curso' and p.id in (retador, rival)) then raise exception 'Tu amigo está ahora mismo en otro duelo. Inténtalo más tarde.'; end if;
  select * into ex from duelos where estado = 'pendiente' and least(retador, rival) = least(me, p.id) and greatest(retador, rival) = greatest(me, p.id);
  if found then
    raise exception '%', case when ex.retador = me then 'Ya le has enviado una invitación: espera a que responda.' else 'Tu amigo ya te ha retado: acepta su invitación.' end;
  end if;
  select count(*) into n from duelos where retador = me and estado = 'pendiente';
  if n >= 5 then raise exception 'Tienes demasiadas invitaciones pendientes. Espera a que respondan o cancela alguna.'; end if;
  insert into duelos(retador, rival, expira) values (me, p.id, clock_timestamp() + make_interval(secs => (duelo_cfg()->>'invitacion')::int)) returning id into did;
  return did;
end
$$;

-- Aceptar o rechazar una invitación recibida. Devuelve 'aceptado', 'rechazado' o 'caducado'.
create or replace function duelo_responder(did uuid, aceptar boolean) returns text
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); d duelos;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select * into d from duelos where id = did and rival = me;
  if not found then raise exception 'Esta invitación ya no está disponible.'; end if;
  perform duelo_candado(d.retador, d.rival);   -- primero los candados y luego la fila, igual que duelo_retar (evita interbloqueos)
  perform duelo_avanzar(did);
  select * into d from duelos where id = did;
  if d.estado = 'expirado' then return 'caducado'; end if;
  if d.estado <> 'pendiente' then raise exception 'Esta invitación ya no está disponible.'; end if;
  if not aceptar then
    update duelos set estado = 'rechazado', cerrado = clock_timestamp() where id = did;
    return 'rechazado';
  end if;
  if exists (select 1 from duelos where estado = 'en_curso' and me in (retador, rival)) then raise exception 'Ya estás en un duelo. Termínalo antes de aceptar otro.'; end if;
  if exists (select 1 from duelos where estado = 'en_curso' and d.retador in (retador, rival)) then raise exception 'Tu amigo ya está en otro duelo.'; end if;
  update duelos set estado = 'en_curso' where id = did;
  perform duelo_nueva_ronda(did);
  return 'aceptado';
end
$$;

-- El retador cancela su invitación mientras nadie la haya respondido.
create or replace function duelo_cancelar(did uuid) returns void
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); d duelos;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select * into d from duelos where id = did and retador = me for update;
  if not found or d.estado <> 'pendiente' then raise exception 'Esta invitación ya no se puede cancelar.'; end if;
  update duelos set estado = 'cancelado', cerrado = clock_timestamp() where id = did;
end
$$;

-- Enviar mi resultado de la ronda `rn`. Devuelve el estado del duelo. Si llego tarde (la ronda ya se cerró), no hace nada.
create or replace function duelo_enviar(did uuid, rn int, dat jsonb) returns jsonb
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); d duelos; r duelo_rondas; soy boolean; st text;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select * into d from duelos where id = did and me in (retador, rival) for update;
  if not found then raise exception 'Duelo no encontrado.'; end if;
  perform duelo_avanzar(did);
  select * into d from duelos where id = did;
  if d.estado <> 'en_curso' or d.ronda <> rn then return duelo_json(d, me); end if;
  select * into r from duelo_rondas where duelo = did and n = rn for update;
  if r.cerrada then return duelo_json(d, me); end if;
  if clock_timestamp() < r.empieza then raise exception 'La ronda todavía no ha empezado.'; end if;
  if jsonb_typeof(dat) is distinct from 'object' or octet_length(dat::text) > 2000 then raise exception 'Resultado no válido.'; end if;
  st := dat->>'st';
  if st is null or st not in ('won','completed','lost') then raise exception 'Resultado no válido.'; end if;
  soy := d.retador = me;
  if (soy and r.res_retador is not null) or (not soy and r.res_rival is not null) then return duelo_json(d, me); end if;
  if soy then update duelo_rondas set res_retador = dat, fin_retador = clock_timestamp() where duelo = did and n = rn;
  else update duelo_rondas set res_rival = dat, fin_rival = clock_timestamp() where duelo = did and n = rn;
  end if;
  if (select res_retador is not null and res_rival is not null from duelo_rondas where duelo = did and n = rn) then
    perform duelo_cerrar_ronda(did);
  else
    perform duelo_avanzar(did);
  end if;
  select * into d from duelos where id = did;
  return duelo_json(d, me);
end
$$;

-- Rendirse: termina el duelo y gana el rival.
create or replace function duelo_rendirse(did uuid) returns jsonb
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); d duelos;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  select * into d from duelos where id = did and me in (retador, rival) for update;
  if not found then raise exception 'Duelo no encontrado.'; end if;
  perform duelo_avanzar(did);
  select * into d from duelos where id = did;
  if d.estado = 'en_curso' then
    update duelos set estado = 'terminado', cerrado = clock_timestamp(), motivo = 'rendicion',
           ganador = case when d.retador = me then d.rival else d.retador end where id = did;
    select * into d from duelos where id = did;
  end if;
  return duelo_json(d, me);
end
$$;

-- Estado de un duelo (para consultarlo cada pocos segundos mientras se juega).
create or replace function duelo_estado(did uuid) returns jsonb
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); d duelos;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  perform 1 from duelos where id = did and me in (retador, rival);
  if not found then raise exception 'Duelo no encontrado.'; end if;
  perform duelo_avanzar(did);
  select * into d from duelos where id = did;
  return jsonb_build_object('ahora', duelo_ms(clock_timestamp()), 'duelo', duelo_json(d, me));
end
$$;

-- Mis duelos: invitaciones y duelos activos, y los cerrados en los últimos 7 días (máx. 20). Incluye la hora del servidor y los parámetros.
create or replace function mis_duelos() returns jsonb
language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); l jsonb;
begin
  if me is null then raise exception 'Inicia sesión.'; end if;
  perform duelo_barrer(me);
  select coalesce(jsonb_agg(duelo_json(x, me) order by coalesce(x.cerrado, x.creado) desc), '[]'::jsonb) into l from duelos x where x.id in (
    select d.id from duelos d where me in (d.retador, d.rival)
       and (d.estado in ('pendiente','en_curso') or d.cerrado > clock_timestamp() - interval '7 days')
     order by coalesce(d.cerrado, d.creado) desc limit 20);
  return jsonb_build_object('ahora', duelo_ms(clock_timestamp()), 'cfg', duelo_cfg(), 'duelos', l);
end
$$;

-- ───── Permisos ─────
revoke execute on function duelo_cfg(), duelo_juegos(), duelo_por_tiempo(text), duelo_ms(timestamptz), duelo_num(jsonb, text), duelo_candado(uuid, uuid),
  duelo_clave(text, jsonb, jsonb, timestamptz, timestamptz), duelo_nueva_ronda(uuid), duelo_cerrar_ronda(uuid), duelo_avanzar(uuid), duelo_barrer(uuid),
  duelo_json(duelos, uuid) from public, anon, authenticated;
revoke execute on function duelo_retar(text), duelo_responder(uuid, boolean), duelo_cancelar(uuid), duelo_enviar(uuid, int, jsonb), duelo_rendirse(uuid),
  duelo_estado(uuid), mis_duelos() from public, anon;
grant execute on function duelo_retar(text), duelo_responder(uuid, boolean), duelo_cancelar(uuid), duelo_enviar(uuid, int, jsonb), duelo_rendirse(uuid),
  duelo_estado(uuid), mis_duelos() to authenticated;
