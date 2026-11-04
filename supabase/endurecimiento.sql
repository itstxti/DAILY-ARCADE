-- Endurecimiento: arregla los avisos del Security/Performance Advisor de Supabase.
-- Ejecútalo DESPUÉS de schema.sql y de duelos.sql (y otra vez si cambias esas funciones). Es idempotente: se puede repetir.
--   · fija el search_path de las funciones internas (evita que alguien cambie a qué esquema apuntan);
--   · quita el permiso de llamar por la API a la función de alta de usuarios (solo debe dispararla el trigger);
--   · cubre claves foráneas sin índice;
--   · las políticas llaman a auth.uid() / es_admin() una vez por consulta en vez de una por fila;
--   · retos: una sola política de lectura (antes había dos permisivas solapadas) y políticas de escritura solo para el admin.
-- Lo que NO se toca a propósito: es_admin() y usuario_libre() siguen ejecutables por anon (las políticas de retos y el registro las necesitan),
-- y las tablas con RLS y sin políticas (amistades, bloqueos, duelos…) son intencionadas: solo se llega a ellas por funciones.

do $$
declare f text;
begin
  foreach f in array array[
    'reto_hoy()', 'duelo_juegos()', 'duelo_por_tiempo(text)', 'duelo_peso(text)', 'duelo_cfg()', 'duelo_ms(timestamptz)',
    'duelo_num(jsonb, text)', 'duelo_candado(uuid, uuid)', 'duelo_clave(text, jsonb, jsonb, timestamptz, timestamptz)']
  loop
    if to_regprocedure(f) is not null then execute format('alter function %s set search_path = public', f); end if;
  end loop;
end $$;

revoke execute on function nuevo_usuario() from public, anon, authenticated;   -- solo la dispara el trigger al crear la cuenta
do $$ begin   -- función de ayuda que crea el propio Supabase (no está en este repo): tampoco debe poder llamarse desde la API
  if to_regprocedure('rls_auto_enable()') is not null then revoke execute on function rls_auto_enable() from public, anon, authenticated; end if;
end $$;

create index if not exists amistades_solicitante on amistades (solicitante);
do $$ begin
  if to_regclass('duelos') is not null then create index if not exists duelos_ganador on duelos (ganador); end if;
end $$;

drop policy if exists perfiles_editar on profiles;
create policy perfiles_editar on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists retos_leer on retos;
drop policy if exists retos_admin on retos;
drop policy if exists retos_admin_insertar on retos;
drop policy if exists retos_admin_cambiar on retos;
drop policy if exists retos_admin_borrar on retos;
create policy retos_leer on retos for select using (dia <= reto_hoy() or (select es_admin()));
create policy retos_admin_insertar on retos for insert to authenticated with check ((select es_admin()));
create policy retos_admin_cambiar on retos for update to authenticated using ((select es_admin())) with check ((select es_admin()));
create policy retos_admin_borrar on retos for delete to authenticated using ((select es_admin()));

notify pgrst, 'reload schema';
