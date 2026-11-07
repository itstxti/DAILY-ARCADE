/* Función serverless de Vercel: intermediario de TMDB para el juego Carátula.
   La clave vive solo en la variable de entorno TMDB_KEY (Vercel → Settings → Environment Variables) y NUNCA llega al navegador:
   el juego pide /api/tmdb?query=…&year=… y esta función añade la clave, llama a TMDB y devuelve solo los campos que hacen falta.
   Las respuestas se guardan en la caché de Vercel (un día), así que cada película se consulta a TMDB muy pocas veces. */
module.exports = async (req, res) => {
   if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'método no permitido' }) }
   const key = process.env.TMDB_KEY;
   if (!key) return res.status(503).json({ error: 'TMDB_KEY sin configurar' });

   const q = String(req.query.query || '').trim(), y = String(req.query.year || '');
   if (!q || q.length > 100 || (y && !/^\d{4}$/.test(y))) return res.status(400).json({ error: 'parámetros no válidos' });

   const u = new URL('https://api.themoviedb.org/3/search/movie');
   u.search = new URLSearchParams({ api_key: key, language: 'es-ES', include_adult: 'false', query: q, ...(y ? { primary_release_year: y } : {}) }).toString();
   try {
      const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return res.status(502).json({ error: 'TMDB ' + r.status });
      const results = ((await r.json()).results || []).slice(0, 10).map(({ original_title, release_date, poster_path, genre_ids }) => ({ original_title, release_date, poster_path, genre_ids }));
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).json({ results })
   } catch (_) {
      return res.status(502).json({ error: 'TMDB no responde' })   // sin detalles: el error original podría llevar la URL con la clave
   }
};
