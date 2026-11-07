/* Juego: Carátula — se enseña el póster de una película muy pixelado, dividido en una cuadrícula de 3×3 zonas, y hay que adivinar
   cuál es. Cada fallo (o cada «Saltar») quita los píxeles de una zona (se ve nítida); con 6 fallos se acaba. El orden en que se
   destapan las zonas sale de la fecha. Las pistas dan el año, el género y la forma del título.
   El reto sale de la fecha: se elige una película de la lista (content/peliculas.js, solo títulos y años) y su póster se
   carga EN DIRECTO desde TMDB al jugar (no se guarda ninguna imagen en el repositorio). Los datos se piden a /api/tmdb (api/tmdb.js),
   una función de Vercel que guarda la clave de TMDB en el servidor (variable TMDB_KEY): la clave nunca llega al navegador.
   Si window.TMDB_PROXY está vacío (js/config.js), el juego no se muestra. La victoria se comprueba por reglas: el título que se
   escribe es el de la película del día (se compara por título normalizado, sin tildes ni mayúsculas, con sus alias).
   Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB. */
(function () {
   const PROXY = window.TMDB_PROXY, LISTA = window.PELIS || [];
   if (!PROXY || !LISTA.length) { console.info('Carátula: window.TMDB_PROXY vacío en js/config.js (o falta content/peliculas.js); el juego no se muestra.'); return }
   const INTENTOS = 6, N = 3, PIX = 15;                                    // fallos permitidos · cuadrícula de N×N zonas · ancho (en píxeles) de la imagen pixelada
   /* Orden en que se destapan las 9 zonas (0..8, fila a fila): mezcla de la fecha. */
   const ORDEN = memoSD(() => { const r = rng(SD * 53 + 5), a = [0, 1, 2, 3, 4, 5, 6, 7, 8]; for (let k = 8; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [a[k], a[j]] = [a[j], a[k]] } return a });
   const GEN = { 28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia', 80: 'Crimen', 99: 'Documental', 18: 'Drama', 10751: 'Familia', 14: 'Fantasía', 36: 'Historia', 27: 'Terror', 10402: 'Música', 9648: 'Misterio', 10749: 'Romance', 878: 'Ciencia ficción', 10770: 'Película de TV', 53: 'Suspense', 10752: 'Bélica', 37: 'Western' };
   const pls = (n, a, b) => n == 1 ? a : b;
   const norm = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
   const NOMS = LISTA.map(f => [f[1], f[0], ...f.slice(3)].map(norm));      // títulos que valen para cada película

   const P = memoSD(() => Math.floor(rng(SD * 89 + 17)() * LISTA.length)); // índice de la película (se regenera si cambia la semilla SD)

   /* ---------- Datos de TMDB (se piden al abrir el juego; si falla, se puede reintentar) ---------- */
   const CARGA = {};                                                       // índice → { est: 'cargando' | 'ok' | 'error' | 'sinclave', img, gens, err }
   async function consulta(orig, anyo) {
      const r = await fetch(`${PROXY}?query=${encodeURIComponent(orig)}${anyo ? '&year=' + anyo : ''}`);
      if (r.status == 503) throw Object.assign(new Error('TMDB_KEY sin configurar en el servidor'), { sinClave: true });
      if (!r.ok) throw new Error('TMDB ' + r.status);
      return ((await r.json()).results || []).filter(x => x.poster_path)
   }
   async function buscar(i) {
      const [orig, , anyo] = LISTA[i], a = x => +String(x.release_date || '0').slice(0, 4);
      let rs = await consulta(orig, anyo); if (!rs.length) rs = await consulta(orig, 0);
      const m = rs.find(x => norm(x.original_title || '') == norm(orig) && a(x) == anyo) || rs.find(x => a(x) == anyo) || rs[0];
      if (!m) throw new Error('sin póster');
      const img = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('imagen')); im.src = 'https://image.tmdb.org/t/p/w500' + m.poster_path });
      return { img, gens: (m.genre_ids || []).map(g => GEN[g]).filter(Boolean) }
   }
   function dato(i) {
      let c = CARGA[i];
      if (!c) {
         c = CARGA[i] = { est: 'cargando' };
         buscar(i).then(d => Object.assign(c, d, { est: 'ok' })).catch(e => { console.warn(e); c.est = e.sinClave ? 'sinclave' : 'error' })
            .then(() => { const g = cur(); if (g && g.id == 'caratula') draw() })
      }
      return c
   }

   /* Progreso: p.g = intentos fallidos (índice de la película probada, o -1 si se saltó) · p.h = pistas · p.c = fallos. */
   const ini = p => { if (!Array.isArray(p.g)) { p.g = []; p.h = 0; p.c = 0 } };

   /* Dibuja el póster en el canvas (siempre a tamaño completo): todo pixelado, con las zonas ya destapadas nítidas, o entero y nítido al
      terminar. La versión pixelada se hace reduciendo la imagen a PIX píxeles de ancho y ampliándola sin suavizar. */
   function pinta() {
      const cv = document.querySelector('canvas.car'); if (!cv) return;
      const c = CARGA[+cv.dataset.i]; if (!c || !c.img) return;
      const W = cv.width, H = cv.height, abre = +cv.dataset.z, x = cv.getContext('2d');
      x.clearRect(0, 0, W, H); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      if (cv.dataset.f == '1') return void x.drawImage(c.img, 0, 0, W, H);
      const gh = Math.max(N, Math.round(PIX * H / W / N) * N), ch = document.createElement('canvas'); ch.width = PIX; ch.height = gh;
      ch.getContext('2d').drawImage(c.img, 0, 0, PIX, gh);
      x.imageSmoothingEnabled = false; x.drawImage(ch, 0, 0, W, H);
      x.imageSmoothingEnabled = true;
      const zw = W / N, zh = H / N, iw = c.img.naturalWidth / N, ih = c.img.naturalHeight / N;
      ORDEN().slice(0, abre).forEach(z => { const cx = z % N, cy = Math.floor(z / N); x.drawImage(c.img, cx * iw, cy * ih, iw, ih, cx * zw, cy * zh, zw, zh) });
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; x.beginPath();    // rejilla 3×3
      for (let k = 1; k < N; k++) { x.moveTo(k * zw, 0); x.lineTo(k * zw, H); x.moveTo(0, k * zh); x.lineTo(W, k * zh) }
      x.stroke()
   }

   function caratula() {
      const p = prog('ca'); ini(p);
      const r = R('caratula'), i = P(), c = dato(i), [orig, es, anyo] = LISTA[i];
      if (c.est == 'cargando') return shell('Carátula', '<p class="cap" style="text-align:center">Cargando…</p>');
      if (c.est == 'sinclave') return shell('Carátula', '<p class="cap" style="text-align:center">Carátula no está disponible por ahora.</p>');
      if (c.est == 'error') return shell('Carátula', `<p class="cap" style="text-align:center">No se ha podido cargar el póster de hoy (¿sin conexión?).</p><div class="row ctl"><button class="btn pri" data-a="cr">Reintentar</button></div>`);
      if (!r && !p.t0) { p.t0 = Date.now(); sv() }
      const fin_ = !!r, fallos = Math.min(p.g.length, N * N), w = 500, h = Math.round(w * c.img.naturalHeight / c.img.naturalWidth);
      setTimeout(pinta, 0);
      let b = `<canvas class="car" data-i="${i}" data-z="${fallos}" data-f="${fin_ ? 1 : 0}" width="${w}" height="${h}" role="img" aria-label="${fin_ ? 'Carátula de ' + es : `Carátula pixelada en 9 zonas, ${fallos} ${pls(fallos, 'zona nítida', 'zonas nítidas')}`}"></canvas>`;
      const pistas = [`Año: <b>${anyo}</b>`, c.gens.length ? `Género: <b>${c.gens.join(', ')}</b>` : `Década: <b>${Math.floor(anyo / 10) * 10}</b>`, (() => { const pal = es.trim().split(/\s+/).length; return `Título: <b>${es[0].toUpperCase()}…</b> · ${pal} ${pls(pal, 'palabra', 'palabras')} · ${es.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').length} letras` })()];
      if (r) {
         b += `<p class="cart">${esc(es)} <small>(${anyo})</small></p>`;
         if (r.st == 'lost' && r.f >= INTENTOS) b += res('Sin más intentos', `Era «${es}» (${anyo}). Vuelve mañana para un reto nuevo.`, `Daily Arcade · Carátula #${DAY} · ✕`);
         else if (r.st == 'lost') b += resRendida('Carátula', `Era «${es}» (${anyo}). Vuelve mañana para un reto nuevo.`);
         else b += res(`¡Era «${es}»! En ${mmss(r.t)}`, `${r.c ? r.c + pls(r.c, ' fallo', ' fallos') + ' antes de acertar' : 'A la primera'}. Vuelve mañana para un reto nuevo.`,
            `Daily Arcade · Carátula #${DAY} · ${mmss(r.t)}${r.c ? ' · ' + r.c + pls(r.c, ' fallo', ' fallos') : ''}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}`)
      } else {
         b += `<p class="cap" style="text-align:center;margin:0" aria-live="polite">Intento <b>${fallos + 1}</b> de ${INTENTOS}. Cada fallo destapa una zona y suma ${Duelo.coste('comprobar')} s.</p>`;
         if (p.h) b += `<ul class="carh" aria-label="Pistas">${pistas.slice(0, p.h).map(x => `<li>${x}</li>`).join('')}</ul>`;
         if (fallos) b += `<ol class="carg" aria-label="Intentos fallidos">${p.g.map(k => `<li>${k < 0 ? 'Saltado' : esc(LISTA[k][1])}</li>`).join('')}</ol>`;
         b += `<div class="carf"><input id="car-in" class="carin" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Escribe el título…" aria-label="Título de la película" aria-controls="car-sug"><div id="car-sug" class="carsug" role="group" aria-label="Sugerencias"></div></div>`
            + `<div class="row ctl"><button class="btn pri" data-a="cg">Adivinar</button><button class="btn" data-a="ck">Saltar (+${Duelo.coste('comprobar')} s)</button></div>`
            + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ pista: p.h < pistas.length ? 1 : 0, rendirme: 1 })}`
      }
      b += `<p class="cap carat">Pósters y datos: <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a>. Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.</p>`;
      return shell('Carátula', b)
   }

   /* Acaba la partida con un fallo más; con INTENTOS fallos se pierde. */
   function falla(p, k) {
      p.g.push(k); p.c = p.g.length; Sfx.p('error');
      if (p.g.length >= INTENTOS) fin('caratula', { st: 'lost', t: Date.now() - p.t0, h: p.h || 0, c: p.c, f: p.g.length })
   }

   function cg() {
      if (R('caratula')) return;
      const p = prog('ca'); ini(p); const inp = $('#car-in'), t = norm(inp ? inp.value : '');
      if (!t) { msg = 'Escribe el título de la película.'; Sfx.p('error'); return draw() }
      const k = NOMS.findIndex(n => n.includes(t));
      if (k < 0) { msg = 'No la encuentro en la lista: elige una de las sugerencias.'; Sfx.p('error'); return draw() }
      if (p.g.includes(k)) { msg = 'Esa ya la has probado.'; Sfx.p('error'); return draw() }
      p.t0 = p.t0 || Date.now(); msg = '';
      if (k == P()) { Sfx.p('acierto'); fin('caratula', { st: 'completed', t: Date.now() - p.t0, h: p.h || 0, c: p.g.length }) }
      else { falla(p, k); msg = R('caratula') ? '' : `No es «${LISTA[k][1]}».` }
      sv(); draw()
   }

   function ck() {
      if (R('caratula')) return;
      const p = prog('ca'); ini(p); p.t0 = p.t0 || Date.now(); msg = 'Zona destapada.'; falla(p, -1);
      if (R('caratula')) msg = ''; sv(); draw()
   }

   function cp(b) {
      const inp = $('#car-in'); if (!inp) return;
      inp.value = LISTA[+b.dataset.i][1]; const s = $('#car-sug'); if (s) s.innerHTML = ''; inp.focus()
   }

   function cr() { delete CARGA[P()]; draw() }

   function pista() {
      if (R('caratula')) return;
      const p = prog('ca'); ini(p); if (p.h >= 3) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; msg = ''; sv(); draw()
   }

   function rendirse() {
      if (R('caratula')) return;
      const p = prog('ca'); fin('caratula', { st: 'lost', t: Date.now() - (p.t0 || Date.now()), f: 0 }); sv(); draw()
   }

   /* Sugerencias al escribir: se actualizan a mano (sin repintar la pantalla, para no perder el foco del campo). */
   document.addEventListener('input', e => {
      if (e.target.id != 'car-in') return;
      const box = $('#car-sug'), q = norm(e.target.value); if (!box) return;
      if (q.length < 2) { box.innerHTML = ''; return }
      const p = prog('ca'), out = []; ini(p);
      LISTA.forEach((f, k) => { if (NOMS[k].some(n => n.includes(q)) && !p.g.includes(k)) out.push(k) });
      box.innerHTML = out.slice(0, 6).map(k => `<button type="button" class="carsg" data-a="cp" data-i="${k}">${esc(LISTA[k][1])} <small>${LISTA[k][2]}</small></button>`).join('')
   });
   document.addEventListener('keydown', e => {
      if (e.target.id == 'car-in' && e.key == 'Enter') { e.preventDefault(); const b = $('[data-a="cg"]'); b && b.click() }
   });

   DailyArcade.register({
      id: 'caratula', name: 'Carátula', desc: 'Adivina la película por su póster pixelado.', color: '--sky', tag: 'Adivina la película por su póster',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="2.5" width="13" height="19" rx="1.5"/><path d="M8.5 6.5h7M8.5 9.5h7"/><circle cx="12" cy="15.5" r="2.6"/></svg>',
      how: ['Se enseña el <b>póster</b> de una película muy pixelado y dividido en <b>9 zonas</b>. Escribe el título y elige una de las sugerencias.', 'Cada <b>fallo</b> (o cada «Saltar») quita los píxeles de una zona y suma segundos. Con 6 fallos se acaba.', 'Si te atascas, la <b>pista</b> da el año, el género y la forma del título.'],
      demo: (() => {
         /* Escena inventada (cielo, sol y colina) en 3×3 zonas: pixelada, con 2 zonas nítidas y con 5, sin usar ningún póster real */
         const col = (u, v) => (u - .65) ** 2 + (v - .38) ** 2 < .03 ? '#f6c026' : v > .72 + .07 * Math.sin(u * 7) ? '#3f9d63' : `hsl(${215 - v * 150} 70% ${62 + v * 18}%)`;
         const zona = (z, nit) => { const n = nit ? 8 : 2, cx = z % 3, cy = Math.floor(z / 3);
            return `<b class="cz" style="--n:${n}">${Array.from({ length: n * n }, (_, k) => `<i style="background:${col((cx + ((k % n) + .5) / n) / 3, (cy + (Math.floor(k / n) + .5) / n) / 3)}"></i>`).join('')}</b>` };
         const pan = ab => `<span class="cd">${Array.from({ length: 9 }, (_, z) => zona(z, ab.includes(z))).join('')}</span>`;
         return `<p class="cap">La imagen empieza pixelada y cada fallo deja nítida una zona más:</p><div class="card-demo" aria-hidden="true">${[[], [4, 1], [4, 1, 6, 8, 2]].map(pan).join('')}</div>`
      })(),
      pk: 'ca',
      render: caratula,
      actions: { cg, ck, cp, cr, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? (r.f >= INTENTOS ? 'Sin intentos' : 'Rendida') : r ? `Resuelto · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
