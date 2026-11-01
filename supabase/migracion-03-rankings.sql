-- Daily Arcade · Fase 2, paso 3: rankings entre amigos.
-- Para bases de datos que YA tienen schema.sql y las migraciones 01 y 02. Idempotente.
-- Las instalaciones nuevas no la necesitan: schema.sql ya incluye esto.
--
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
