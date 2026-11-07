/* Juego: País — se enseña la silueta de un país (sin nombres, ni fronteras vecinas) y hay que adivinar cuál es. Cada fallo (o cada «Saltar»)
   suma segundos y desvela una pista nueva, de la más vaga a la más clara: continente, letras del nombre, inicial, capital. Con 6 fallos
   se acaba. El reto sale de la fecha: se elige un país de la lista (content/paises.js, siluetas de Natural Earth, dominio público; los lunes
   y martes solo salen países muy conocidos). No usa ninguna API ni imagen. La victoria se comprueba por reglas: el nombre que se escribe es
   el del país del día (se compara por nombre normalizado, sin tildes ni mayúsculas, con sus alias). */
(function () {
   const LISTA = window.PAISES || [];
   if (LISTA.length < 30) { console.info('País: falta content/paises.js; el juego no se muestra.'); return }
   const INTENTOS = 6;
   const FACIL = WD == 1 || WD == 2;
   const pls = (n, a, b) => n == 1 ? a : b;
   const norm = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
   const NOMS = LISTA.map(f => [f[0], ...f[1]].map(norm));                  // nombres que valen para cada país
   const NOM = 0, CONT = 2, CAP = 3, W = 5, H = 6, D = 7;

   const P = memoSD(() => {                                                 // índice del país (se regenera si cambia la semilla SD)
      const pool = LISTA.map((_, i) => i).filter(i => !FACIL || LISTA[i][4]);
      return pool[Math.floor(rng(SD * 97 + 29)() * pool.length)]
   });

   /* Progreso: p.g = intentos fallidos (índice del país probado, o -1 si se saltó) · p.c = fallos. Las pistas dependen del número de fallos. */
   const ini = p => { if (!Array.isArray(p.g)) { p.g = []; p.c = 0 } };
   const letras = s => s.replace(/[^A-Za-zÀ-ÿ]/g, '').length;
   function pistas(i, f) {
      const [nom, , cont, cap] = LISTA[i], pal = nom.trim().split(/\s+/).length, out = [];
      if (f >= 1) out.push(`Continente: <b>${cont}</b>`);
      if (f >= 2) out.push(`Nombre: <b>${letras(nom)} letras</b> en ${pal} ${pls(pal, 'palabra', 'palabras')}`);
      if (f >= 3) out.push(`Empieza por <b>${esc(nom[0].toUpperCase())}</b>`);
      if (f >= 4) out.push(`Capital: <b>${esc(cap[0])}…</b> (${letras(cap)} letras)`);
      if (f >= 5) out.push(`Capital: <b>${esc(cap)}</b>`);
      return out
   }

   function pais() {
      const p = prog('pa'); ini(p);
      const r = R('pais'), i = P(), f = LISTA[i], fin_ = !!r, fallos = p.g.length;
      if (!r && !p.t0) { p.t0 = Date.now(); sv() }
      let b = `<div class="pas"><svg viewBox="0 0 ${f[W]} ${f[H]}" role="img" aria-label="${fin_ ? 'Silueta de ' + esc(f[NOM]) : 'Silueta de un país'}"><path d="${f[D]}" fill-rule="evenodd"/></svg></div>`;
      if (r) {
         b += `<p class="cart">${esc(f[NOM])} <small>(${esc(f[CAP])})</small></p>`;
         if (r.st == 'lost' && r.f >= INTENTOS) b += res('Sin más intentos', `Era ${esc(f[NOM])}, en ${f[CONT]}. Vuelve mañana para un reto nuevo.`, `Daily Arcade · País #${DAY} · ✕`);
         else if (r.st == 'lost') b += resRendida('País', `Era ${esc(f[NOM])}, en ${f[CONT]}. Vuelve mañana para un reto nuevo.`);
         else b += res(`¡Era ${esc(f[NOM])}! En ${mmss(r.t)}`, `${r.c ? r.c + pls(r.c, ' fallo', ' fallos') + ' antes de acertar' : 'A la primera'}. Vuelve mañana para un reto nuevo.`,
            `Daily Arcade · País #${DAY} · ${mmss(r.t)}${r.c ? ' · ' + r.c + pls(r.c, ' fallo', ' fallos') : ''}`)
      } else {
         b += `<p class="cap" style="text-align:center;margin:0" aria-live="polite">Intento <b>${fallos + 1}</b> de ${INTENTOS}. Cada fallo suma ${Duelo.coste('comprobar')} s y da una pista nueva.</p>`;
         if (fallos) b += `<ul class="carh" aria-label="Pistas">${pistas(i, fallos).map(x => `<li>${x}</li>`).join('')}</ul>`;
         if (fallos) b += `<ol class="carg" aria-label="Intentos fallidos">${p.g.map(k => `<li>${k < 0 ? 'Saltado' : esc(LISTA[k][NOM])}</li>`).join('')}</ol>`;
         b += `<div class="carf"><input id="pa-in" class="carin" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Escribe el país…" aria-label="Nombre del país" aria-controls="pa-sug"><div id="pa-sug" class="carsug" role="group" aria-label="Sugerencias"></div></div>`
            + `<div class="row ctl"><button class="btn pri" data-a="pg">Adivinar</button><button class="btn" data-a="pk">Saltar (+${Duelo.coste('comprobar')} s)</button></div>`
            + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ pista: 0, rendirme: 1 })}`
      }
      return shell('País', b)
   }

   /* Un fallo más: con INTENTOS fallos se pierde. */
   function falla(p, k) {
      p.g.push(k); p.c = p.g.length; Sfx.p('error');
      if (p.g.length >= INTENTOS) fin('pais', { st: 'lost', t: Date.now() - p.t0, c: p.c, f: p.g.length })
   }

   function pg() {
      if (R('pais')) return;
      const p = prog('pa'); ini(p); const inp = $('#pa-in'), t = norm(inp ? inp.value : '');
      if (!t) { msg = 'Escribe el nombre de un país.'; Sfx.p('error'); return draw() }
      const k = NOMS.findIndex(n => n.includes(t));
      if (k < 0) { msg = 'No la encuentro en la lista: elige una de las sugerencias.'; Sfx.p('error'); return draw() }
      if (p.g.includes(k)) { msg = 'Ese ya lo has probado.'; Sfx.p('error'); return draw() }
      p.t0 = p.t0 || Date.now(); msg = '';
      if (k == P()) { Sfx.p('acierto'); fin('pais', { st: 'completed', t: Date.now() - p.t0, c: p.g.length }) }
      else { falla(p, k); msg = R('pais') ? '' : `No es ${LISTA[k][NOM]}.` }
      sv(); draw()
   }

   function pk() {
      if (R('pais')) return;
      const p = prog('pa'); ini(p); p.t0 = p.t0 || Date.now(); msg = 'Pista nueva.'; falla(p, -1);
      if (R('pais')) msg = ''; sv(); draw()
   }

   function pp(b) {
      const inp = $('#pa-in'); if (!inp) return;
      inp.value = LISTA[+b.dataset.i][NOM]; const s = $('#pa-sug'); if (s) s.innerHTML = ''; inp.focus()
   }

   function rendirse() {
      if (R('pais')) return;
      const p = prog('pa'); fin('pais', { st: 'lost', t: Date.now() - (p.t0 || Date.now()), f: 0 }); sv(); draw()
   }

   /* Sugerencias al escribir: se actualizan a mano (sin repintar la pantalla, para no perder el foco del campo). */
   document.addEventListener('input', e => {
      if (e.target.id != 'pa-in') return;
      const box = $('#pa-sug'), q = norm(e.target.value); if (!box) return;
      if (q.length < 2) { box.innerHTML = ''; return }
      const p = prog('pa'), out = []; ini(p);
      LISTA.forEach((f, k) => { if (NOMS[k].some(n => n.includes(q)) && !p.g.includes(k)) out.push(k) });
      box.innerHTML = out.slice(0, 6).map(k => `<button type="button" class="carsg" data-a="pp" data-i="${k}">${esc(LISTA[k][NOM])}</button>`).join('')
   });
   document.addEventListener('keydown', e => {
      if (e.target.id == 'pa-in' && e.key == 'Enter') { e.preventDefault(); const b = $('[data-a="pg"]'); b && b.click() }
   });

   DailyArcade.register({
      id: 'pais', name: 'País', desc: 'Adivina el país por su silueta.', color: '--mint', tag: 'Adivina el país por su silueta',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l5 1.5 3-2 4 3-1.5 4 2.5 3.5-4.5 1-1 5-4-3-3.5 1 .5-5L3.5 9z"/></svg>',
      how: ['Se enseña la <b>silueta</b> de un país, sin nombres ni vecinos. Escribe su nombre y elige una de las sugerencias.', 'Cada <b>fallo</b> (o cada «Saltar») suma segundos y da una pista: continente, letras del nombre, inicial y capital. Con 6 fallos se acaba.', 'Todos los países salen con el norte arriba y sin girar.'],
      demo: `<p class="cap">Solo se ve la forma. Si no la reconoces, cada fallo da una pista:</p><div class="pas mini" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="M30 8L62 14L80 38L70 62L76 88L44 92L22 70L14 42Z"/></svg></div><ul class="carh" aria-hidden="true"><li>Continente: <b>…</b></li><li>Nombre: <b>… letras</b></li></ul>`,
      pk: 'pa',
      render: pais,
      actions: { pg, pk, pp, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? (r.f >= INTENTOS ? 'Sin intentos' : 'Rendida') : r ? `Resuelto · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
