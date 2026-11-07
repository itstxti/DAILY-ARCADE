/* Conexión con Supabase (Project Settings → API). La "anon key" es pública por diseño: la seguridad
   la dan las reglas de schema.sql. NUNCA pongas aquí la "service_role key".
   Si lo dejas vacío, la web funciona en MODO LOCAL leyendo la carpeta local/ (solo para pruebas). */
window.SUPABASE_URL='https://cobynsvgkvqgzqnkpgkx.supabase.co';
window.SUPABASE_ANON_KEY='sb_publishable_QLDjyt5H86uEbvBCOOyapw_j8b1CYjk';

/* Carátula (adivinar la película por su póster): los datos de TMDB se piden a la función /api/tmdb de Vercel (api/tmdb.js), que guarda
   la clave en el servidor: ponla en Vercel → Settings → Environment Variables como TMDB_KEY (la «Clave de la API» v3 de
   https://www.themoviedb.org/settings/api). En esta carpeta NO va ninguna clave de TMDB.
   Déjalo vacío ('') para ocultar el juego, p. ej. al probar en local con un servidor estático (no ejecuta /api). */
window.TMDB_PROXY = '/api/tmdb';
