-- Migración: nuevos juegos (Sospechosos y Balanza).
-- Amplía la lista de juegos permitidos en `resultados`. Idempotente: se puede ejecutar más de una vez.
-- Ejecútala una vez en el SQL Editor de Supabase si tu base de datos ya estaba creada
-- (las bases nuevas ya lo traen en schema.sql). Sin esto, los resultados de los juegos nuevos no se guardan en el servidor.
-- Para que también salgan en los duelos, vuelve a ejecutar después supabase/duelos.sql y supabase/endurecimiento.sql (también son idempotentes).

alter table resultados drop constraint if exists resultados_juego_valido;
alter table resultados add constraint resultados_juego_valido
  check (juego in ('palabra','cifra','coronas','sudoku','escalera','operaciones','camino','luces','tuberias','sopa','sospechosos','balanza'));
