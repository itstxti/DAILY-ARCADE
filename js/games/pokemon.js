/* Juego: Pokémon — se enseña la silueta negra de un Pokémon y hay que adivinar cuál es. Cada fallo (o cada «Saltar») suma segundos y
   desvela una pista nueva: generación, tipos, color, letras del nombre e inicial. Con 6 fallos se acaba. El reto sale de la fecha: se elige
   un Pokémon de la lista (content/pokemon.js, solo textos; los lunes y martes solo salen los de la primera generación) y su dibujo se carga
   EN DIRECTO desde el repositorio de sprites de PokeAPI (vía jsDelivr) al jugar: no se guarda ninguna imagen en este repositorio. La silueta
   se hace con un filtro de CSS (brightness(0)); al terminar se quita. La victoria se comprueba por reglas: el nombre que se escribe es el del
   Pokémon del día (se compara por nombre normalizado, sin tildes ni mayúsculas; vale también el nombre en inglés y sin espacios).
   Pokémon es marca de Nintendo, Game Freak y Creatures: proyecto de aficionados, sin relación con ellos. */
(function () {
   const LISTA = window.POKEMON || [];
   if (LISTA.length < 50) { console.info('Pokémon: falta content/pokemon.js; el juego no se muestra.'); return }
   const IMG = id => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${id}.png`;
   const INTENTOS = 6, FACIL = WD == 1 || WD == 2;
   const REGION = ['', 'Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia'];
   const pls = (n, a, b) => n == 1 ? a : b;
   const norm = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
   const NOMS = LISTA.map(f => [...new Set([f[1], ...f[5]].flatMap(n => [norm(n), norm(n).replace(/ /g, '')]))]);   // nombres que valen (con y sin espacios)
   const ID = 0, NOM = 1, GEN = 2, TIPOS = 3, COL = 4;

   const P = memoSD(() => {                                                // índice del Pokémon (se regenera si cambia la semilla SD)
      const pool = LISTA.map((_, i) => i).filter(i => !FACIL || LISTA[i][GEN] == 1);
      return pool[Math.floor(rng(SD * 101 + 7)() * pool.length)]
   });

   /* ---------- Dibujo (se pide al abrir el juego; si falla, se puede reintentar) ---------- */
   const CARGA = {};                                                       // índice → { est: 'cargando' | 'ok' | 'error' }
   function dato(i) {
      let c = CARGA[i];
      if (!c) {
         c = CARGA[i] = { est: 'cargando' };
         const im = new Image();
         im.onload = () => { c.est = 'ok'; ya() }; im.onerror = () => { c.est = 'error'; ya() }; im.src = IMG(LISTA[i][ID])
      }
      return c
   }
   const ya = () => { const g = cur(); if (g && g.id == 'pokemon') draw() };

   /* Progreso: p.g = intentos fallidos (índice del Pokémon probado, o -1 si se saltó) · p.c = fallos. Las pistas dependen del número de fallos. */
   const ini = p => { if (!Array.isArray(p.g)) { p.g = []; p.c = 0 } };
   const letras = s => s.replace(/[^A-Za-zÀ-ÿ]/g, '').length;
   function pistas(i, f) {
      const [, nom, gen, tipos, col] = LISTA[i], pal = nom.trim().split(/\s+/).length, out = [];
      if (f >= 1) out.push(`Generación: <b>${gen}</b> (${REGION[gen]})`);
      if (f >= 2) out.push(`${pls(tipos.length, 'Tipo', 'Tipos')}: <b>${tipos.join(' y ')}</b>`);
      if (f >= 3 && col) out.push(`Color: <b>${col}</b>`);
      if (f >= 4) out.push(`Nombre: <b>${letras(nom)} letras</b> en ${pal} ${pls(pal, 'palabra', 'palabras')}`);
      if (f >= 5) out.push(`Empieza por <b>${esc(nom[0].toUpperCase())}</b>`);
      return out
   }

   function pokemon() {
      const p = prog('pk'); ini(p);
      const r = R('pokemon'), i = P(), c = dato(i), f = LISTA[i], fallos = p.g.length;
      if (c.est == 'cargando') return shell('Pokémon', '<p class="cap" style="text-align:center">Cargando…</p>');
      if (c.est == 'error') return shell('Pokémon', `<p class="cap" style="text-align:center">No se ha podido cargar el dibujo de hoy (¿sin conexión?).</p><div class="row ctl"><button class="btn pri" data-a="pkr">Reintentar</button></div>`);
      if (!r && !p.t0) { p.t0 = Date.now(); sv() }
      let b = `<div class="pks${r ? ' on' : ''}"><img src="${IMG(f[ID])}" alt="${r ? 'Dibujo de ' + esc(f[NOM]) : 'Silueta de un Pokémon'}" width="475" height="475" decoding="async"></div>`;
      if (r) {
         b += `<p class="cart">${esc(f[NOM])} <small>(nº ${f[ID]})</small></p>`;
         if (r.st == 'lost' && r.f >= INTENTOS) b += res('Sin más intentos', `Era ${esc(f[NOM])}. Vuelve mañana para un reto nuevo.`, `Daily Arcade · Pokémon #${DAY} · ✕`);
         else if (r.st == 'lost') b += resRendida('Pokémon', `Era ${esc(f[NOM])}. Vuelve mañana para un reto nuevo.`);
         else b += res(`¡Era ${esc(f[NOM])}! En ${mmss(r.t)}`, `${r.c ? r.c + pls(r.c, ' fallo', ' fallos') + ' antes de acertar' : 'A la primera'}. Vuelve mañana para un reto nuevo.`,
            `Daily Arcade · Pokémon #${DAY} · ${mmss(r.t)}${r.c ? ' · ' + r.c + pls(r.c, ' fallo', ' fallos') : ''}`)
      } else {
         b += `<p class="cap" style="text-align:center;margin:0" aria-live="polite">Intento <b>${fallos + 1}</b> de ${INTENTOS}. Cada fallo suma ${Duelo.coste('comprobar')} s y da una pista nueva.</p>`;
         if (fallos) b += `<ul class="carh" aria-label="Pistas">${pistas(i, fallos).map(x => `<li>${x}</li>`).join('')}</ul>`;
         if (fallos) b += `<ol class="carg" aria-label="Intentos fallidos">${p.g.map(k => `<li>${k < 0 ? 'Saltado' : esc(LISTA[k][NOM])}</li>`).join('')}</ol>`;
         b += `<div class="carf"><input id="pk-in" class="carin" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Escribe el Pokémon…" aria-label="Nombre del Pokémon" aria-controls="pk-sug"><div id="pk-sug" class="carsug" role="group" aria-label="Sugerencias"></div></div>`
            + `<div class="row ctl"><button class="btn pri" data-a="pkg">Adivinar</button><button class="btn" data-a="pks">Saltar (+${Duelo.coste('comprobar')} s)</button></div>`
            + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ pista: 0, rendirme: 1 })}`
      }
      b += `<p class="cap carat">Dibujos: <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noopener">PokeAPI</a>. Pokémon es marca de Nintendo, Game Freak y Creatures; proyecto de aficionados sin relación con ellos.</p>`;
      return shell('Pokémon', b)
   }

   /* Un fallo más: con INTENTOS fallos se pierde. */
   function falla(p, k) {
      p.g.push(k); p.c = p.g.length; Sfx.p('error');
      if (p.g.length >= INTENTOS) fin('pokemon', { st: 'lost', t: Date.now() - p.t0, c: p.c, f: p.g.length })
   }

   function pkg() {
      if (R('pokemon')) return;
      const p = prog('pk'); ini(p); const inp = $('#pk-in'), t = norm(inp ? inp.value : '');
      if (!t) { msg = 'Escribe el nombre de un Pokémon.'; Sfx.p('error'); return draw() }
      const k = NOMS.findIndex(n => n.includes(t));
      if (k < 0) { msg = 'No lo encuentro en la lista: elige una de las sugerencias.'; Sfx.p('error'); return draw() }
      if (p.g.includes(k)) { msg = 'Ese ya lo has probado.'; Sfx.p('error'); return draw() }
      p.t0 = p.t0 || Date.now(); msg = '';
      if (k == P()) { Sfx.p('acierto'); fin('pokemon', { st: 'completed', t: Date.now() - p.t0, c: p.g.length }) }
      else { falla(p, k); msg = R('pokemon') ? '' : `No es ${LISTA[k][NOM]}.` }
      sv(); draw()
   }

   function pks() {
      if (R('pokemon')) return;
      const p = prog('pk'); ini(p); p.t0 = p.t0 || Date.now(); msg = 'Pista nueva.'; falla(p, -1);
      if (R('pokemon')) msg = ''; sv(); draw()
   }

   function pkp(b) {
      const inp = $('#pk-in'); if (!inp) return;
      inp.value = LISTA[+b.dataset.i][NOM]; const s = $('#pk-sug'); if (s) s.innerHTML = ''; inp.focus()
   }

   function pkr() { delete CARGA[P()]; draw() }

   function rendirse() {
      if (R('pokemon')) return;
      const p = prog('pk'); fin('pokemon', { st: 'lost', t: Date.now() - (p.t0 || Date.now()), f: 0 }); sv(); draw()
   }

   /* Sugerencias al escribir: se actualizan a mano (sin repintar la pantalla, para no perder el foco del campo). */
   document.addEventListener('input', e => {
      if (e.target.id != 'pk-in') return;
      const box = $('#pk-sug'), q = norm(e.target.value); if (!box) return;
      if (q.length < 2) { box.innerHTML = ''; return }
      const p = prog('pk'), out = []; ini(p);
      LISTA.forEach((f, k) => { if (NOMS[k].some(n => n.includes(q)) && !p.g.includes(k)) out.push(k) });
      box.innerHTML = out.slice(0, 6).map(k => `<button type="button" class="carsg" data-a="pkp" data-i="${k}">${esc(LISTA[k][NOM])} <small>nº ${LISTA[k][ID]}</small></button>`).join('')
   });
   document.addEventListener('keydown', e => {
      if (e.target.id == 'pk-in' && e.key == 'Enter') { e.preventDefault(); const b = $('[data-a="pkg"]'); b && b.click() }
   });

   DailyArcade.register({
      id: 'pokemon', name: 'Pokémon', desc: 'Adivina el Pokémon por su silueta.', color: '--berry', tag: 'Adivina el Pokémon por su silueta',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h5M15.5 12h5"/><circle cx="12" cy="12" r="3"/></svg>',
      how: ['Se enseña la <b>silueta</b> de un Pokémon. Escribe su nombre y elige una de las sugerencias.', 'Cada <b>fallo</b> (o cada «Saltar») suma segundos y da una pista: generación, tipos, color, letras del nombre e inicial. Con 6 fallos se acaba.', 'Salen los de las cinco primeras generaciones (los lunes y martes, solo los de Kanto).'],
      demo: `<p class="cap">Solo se ve la sombra. Si no lo reconoces, cada fallo da una pista:</p><div class="pks mini" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="M50 10C30 10 18 28 22 46C14 52 14 66 24 70C26 84 38 92 50 92C62 92 74 84 76 70C86 66 86 52 78 46C82 28 70 10 50 10Z"/></svg></div><ul class="carh" aria-hidden="true"><li>Generación: <b>…</b></li><li>Tipo: <b>…</b></li></ul>`,
      pk: 'pk',
      render: pokemon,
      actions: { pkg, pks, pkp, pkr, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? (r.f >= INTENTOS ? 'Sin intentos' : 'Rendida') : r ? `Resuelto · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
