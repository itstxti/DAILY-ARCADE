/* Daily Arcade · service worker (modo sin conexión).
   - Archivos de la propia web: primero la red (siempre ves la última versión); sin conexión o si tarda más de 4 s, la copia guardada.
   - Librería de Supabase y tipografías: se guardan la primera vez y se reutilizan.
   - Todo lo demás (la API de Supabase, POST…) pasa directo a la red y nunca se guarda.
   Al cambiar la lista de archivos, sube el número de V para limpiar copias antiguas. */
const V = 'da-v26';
const SHELL = ['./', 'index.html', 'css/styles.css', 'js/config.js', 'js/core.js', 'js/nube.js', 'js/content.js', 'content/aceptadas.js',
   'js/games/palabra.js', 'js/games/cifra.js', 'js/games/coronas.js', 'js/games/sudoku.js', 'js/games/escalera.js', 'js/games/operaciones.js',
   'js/games/camino.js', 'js/games/luces.js', 'js/games/tuberias.js', 'js/games/sopa.js', 'js/duelo.js', 'js/teclado.js', 'js/app.js',
   'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const EXT = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];
const EXT_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const PRIVADO = /\/(admin\.html|admin-local|supabase|local)(\/|$)/; /* nunca se guardan (soluciones y panel) */

addEventListener('install', e => e.waitUntil((async () => {
   const c = await caches.open(V);
   await Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { })));
   await Promise.all(EXT.map(u => fetch(u).then(r => r.ok && c.put(u, r)).catch(() => { })));
   skipWaiting()
})()));

addEventListener('activate', e => e.waitUntil((async () => {
   for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
   await clients.claim()
})()));

async function propia(r) {
   const c = await caches.open(V), hit = await c.match(r, { ignoreSearch: r.mode == 'navigate' });
   try {
      const net = fetch(r), res = hit ? await Promise.race([net, new Promise((_, no) => setTimeout(no, 4000))]) : await net;
      if (res.ok && res.type == 'basic' && !res.redirected) c.put(r, res.clone());
      return res
   }
   catch (e) {
      if (hit) return hit;
      if (r.mode == 'navigate') { const i = await c.match('./') || await c.match('index.html'); if (i) return i }
      throw e
   }
}
async function externa(r) {
   const c = await caches.open(V), hit = await c.match(r, { ignoreVary: true }); if (hit) return hit;
   const res = await fetch(r); if (res.ok || res.type == 'opaque') c.put(r, res.clone()); return res
}

addEventListener('fetch', e => {
   const r = e.request; if (r.method !== 'GET') return;
   const u = new URL(r.url);
   if (u.origin === location.origin) { if (!PRIVADO.test(u.pathname)) e.respondWith(propia(r)) }
   else if (EXT_HOSTS.includes(u.host)) e.respondWith(externa(r))
});
