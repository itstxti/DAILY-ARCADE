-- Daily Arcade · Fase 2, paso 1: resultados y privacidad en el servidor.
-- Para bases de datos que YA tienen schema.sql ejecutado (SQL Editor → pegar → Run).
-- Es idempotente: se puede ejecutar más de una vez sin romper nada.
-- Las instalaciones nuevas no la necesitan: schema.sql ya incluye esto.

-- 1) Privacidad del perfil (antes solo vivía en el navegador).
alter table profiles add column if not exists privacidad text not null default 'public';
alter table profiles drop constraint if exists profiles_privacidad_check;
alter table profiles add constraint profiles_privacidad_check check (privacidad in ('public','friends','private'));
grant update (privacidad) on profiles to authenticated;

-- 2) Resultados: una fila por usuario, día y juego.
--    "datos" es el objeto que guarda cada juego (st, t, att…). Máx. 4000 caracteres.
--    Si añades un juego nuevo: amplía la lista de resultados_juego_valido (ver README).
create table if not exists resultados(
  user_id uuid not null references profiles(id) on delete cascade,
  dia int not null check (dia >= 1),
  juego text not null,
  datos jsonb not null,
  creado timestamptz not null default now(),
  primary key (user_id, dia, juego),
  constraint resultados_juego_valido check (juego in ('palabra','cifra','coronas','sudoku','escalera','operaciones')),
  constraint resultados_datos_validos check (jsonb_typeof(datos) = 'object' and octet_length(datos::text) <= 4000)
);
alter table resultados enable row level security;

revoke all on resultados from anon, authenticated;
grant select, insert, delete on resultados to authenticated;  -- sin UPDATE: un resultado enviado no se reescribe

-- Cada jugador ve solo lo suyo (las reglas de amigos llegan en el paso 2).
drop policy if exists resultados_ver_propios on resultados;
create policy resultados_ver_propios on resultados for select to authenticated
  using (user_id = (select auth.uid()));

-- Solo puede guardar resultados propios y de días que ya han empezado (nunca del futuro).
drop policy if exists resultados_insertar on resultados;
create policy resultados_insertar on resultados for insert to authenticated
  with check (user_id = (select auth.uid()) and dia <= reto_hoy());

-- Necesario para "Borrar mis resultados" en Ajustes.
drop policy if exists resultados_borrar on resultados;
create policy resultados_borrar on resultados for delete to authenticated
  using (user_id = (select auth.uid()));
