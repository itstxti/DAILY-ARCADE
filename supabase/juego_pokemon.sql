-- Migración: nuevo juego (Pokémon).
-- Amplía la lista de juegos permitidos en `resultados`. Idempotente: se puede ejecutar más de una vez.
-- Ejecútala una vez en el SQL Editor de Supabase si tu base de datos ya estaba creada
-- (las bases nuevas ya lo traen en schema.sql). Sin esto, los resultados de Pokémon no se guardan en el servidor.
-- Pokémon no entra en los duelos a propósito: depende de que se puedan cargar los dibujos desde internet.

alter table resultados drop constraint if exists resultados_juego_valido;
alter table resultados add constraint resultados_juego_valido
  check (juego in ('palabra','cifra','coronas','sudoku','escalera','operaciones','camino','luces','tuberias','sopa','sospechosos','balanza','intruso','mezcla','siluetas','rayo','caratula','cronologia','pais','pokemon'));
