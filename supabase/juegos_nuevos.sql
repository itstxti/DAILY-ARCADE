-- Migración: nuevos juegos (Camino, Luces, Tuberías y Sopa de letras).
-- Amplía la lista de juegos permitidos en `resultados`. Idempotente: se puede ejecutar más de una vez.
-- Ejecútala una vez en el SQL Editor de Supabase si tu base de datos ya estaba creada
-- (las bases nuevas ya lo traen en schema.sql). Sin esto, los resultados de los juegos nuevos no se guardan en el servidor.

alter table resultados drop constraint if exists resultados_juego_valido;
alter table resultados add constraint resultados_juego_valido
  check (juego in ('palabra','cifra','coronas','sudoku','escalera','operaciones','camino','luces','tuberias','sopa'));