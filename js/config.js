/* Conexión con Supabase (Project Settings → API). La "anon key" es pública por diseño: la seguridad
   la dan las reglas de schema.sql. NUNCA pongas aquí la "service_role key".
   Si lo dejas vacío, la web funciona en MODO LOCAL leyendo la carpeta local/ (solo para pruebas). */
window.SUPABASE_URL='https://cobynsvgkvqgzqnkpgkx.supabase.co';
window.SUPABASE_ANON_KEY='sb_publishable_QLDjyt5H86uEbvBCOOyapw_j8b1CYjk';

/* Carátula (adivinar la película por su póster): clave gratuita de la API de TMDB (https://www.themoviedb.org/settings/api).
   Se usa desde el navegador, así que será visible para quien abra la web: usa la clave v3 (revocable) y no pongas nada privado.
   Si se deja vacía, el juego simplemente no aparece. */
window.TMDB_KEY = '';
