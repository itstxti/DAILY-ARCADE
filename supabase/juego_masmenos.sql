-- Migración: nuevo juego (Más o menos).
-- Amplía la lista de juegos permitidos en `resultados`. Idempotente: se puede ejecutar más de una vez.
-- Ejecútala una vez en el SQL Editor de Supabase si tu base de datos ya estaba creada
-- (las bases nuevas ya lo traen en schema.sql). Sin esto, los resultados de Más o menos no se guardan en el servidor.
-- Más o menos no entra en los duelos a propósito: depende de datos en directo (REST Countries y la API de visitas de Wikimedia).

alter table resultados drop constraint if exists resultados_juego_valido;
alter table resultados add constraint resultados_juego_valido
  check (juego in ('palabra','cifra','coronas','sudoku','escalera','operaciones','camino','luces','tuberias','sopa','sospechosos','balanza','intruso','mezcla','siluetas','rayo','caratula','cronologia','pais','pokemon','masmenos'));
