-- Migración 08: entrar con Google.
-- Google no envía "nombre" ni "usuario", sino "full_name" / "name". Esta versión del trigger usa el nombre de Google
-- si no hay "nombre" (se sigue generando un @usuario jugador_xxxxxx, que el jugador puede cambiar en Cuenta).
-- Idempotente. Ejecútala una vez en el SQL Editor si tu base de datos ya estaba creada (las nuevas ya lo traen en schema.sql).
-- Los usuarios que ya existen no cambian.

create or replace function nuevo_usuario() returns trigger language plpgsql security definer set search_path = public as
$$
declare u text := lower(trim(coalesce(new.raw_user_meta_data->>'usuario', '')));
begin
  if u !~ '^[a-z0-9_]{3,15}$' or exists (select 1 from profiles where usuario = u) then
    u := 'jugador_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  insert into profiles (id, nombre, usuario)
  values (new.id,
          left(coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''),
                        nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
                        nullif(trim(new.raw_user_meta_data->>'name'), ''),
                        'Jugador'), 20),
          u);
  return new;
end
$$;
