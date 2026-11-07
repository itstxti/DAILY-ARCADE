/* Juego: Mezcla — hay que igualar un color objetivo mezclando gotas de 4 pinturas base (rojo, amarillo, azul y blanco).
   El color de la mezcla es la media de las gotas (cada gota pesa lo mismo), así que 2 rojas + 1 blanca = (2·rojo + blanco) / 3.
   El reto sale de la fecha: se mezclan unas gotas al azar para sacar el objetivo y se BUSCA POR FUERZA BRUTA (todas las
   combinaciones de hasta 12 gotas) la mezcla que lo iguala con menos gotas. Se gana al quedar a menos de TOL de distancia
   (a ojo no se distingue). La puntuación va por cercanía y por gotas: cada gota por encima del mínimo suma 3 s al tiempo.
   La victoria se comprueba por reglas (distancia ≤ TOL), no contra una solución guardada. */
(function () {
   const MAXG = 12, TOL = 12, TOPE = 200, EXTRA = 3000;                  // gotas máximas, distancia para ganar, distancia del 0 % y ms por gota de más
   const PINT = [['Rojo', [222, 48, 62]], ['Amarillo', [247, 199, 38]], ['Azul', [38, 98, 220]], ['Blanco', [250, 250, 250]]];
   const FACIL = WD == 1 || WD == 2;                                      // lunes y martes: 2 pinturas y pocas gotas
   const pls = (n, a, b) => n == 1 ? a : b;

   /* Color de una mezcla n (gotas de cada pintura): media ponderada. Con 0 gotas no hay color (null). */
   function mezcla(n) {
      const t = n.reduce((a, b) => a + b, 0); if (!t) return null;
      return [0, 1, 2].map(c => PINT.reduce((a, p, k) => a + p[1][c] * n[k], 0) / t)
   }
   const dist = (a, b) => a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : Infinity;
   const css = c => `rgb(${c.map(Math.round).join(',')})`;
   const cerca = d => Math.max(0, Math.min(100, Math.round(100 * (1 - d / TOPE))));

   /* La mezcla con menos gotas (y, a igualdad, la más cercana) que queda a menos de TOL del color obj. */
   function minima(obj) {
      let mejor = null;
      for (let a = 0; a <= MAXG; a++)for (let b = 0; a + b <= MAXG; b++)for (let c = 0; a + b + c <= MAXG; c++)for (let d = 0; a + b + c + d <= MAXG; d++) {
         const t = a + b + c + d; if (!t || (mejor && t > mejor.t)) continue;
         const e = dist(mezcla([a, b, c, d]), obj);
         if (e <= TOL && (!mejor || t < mejor.t || e < mejor.e)) mejor = { n: [a, b, c, d], t, e }
      }
      return mejor
   }

   function gen() {
      const r = rng(SD * 71 + 5);
      for (let t = 0; t < 500; t++) {
         const usa = shuf([0, 1, 2, 3], r).slice(0, FACIL ? 2 : 2 + Math.floor(r() * 2)), n = [0, 0, 0, 0];
         usa.forEach(k => n[k] = 1 + Math.floor(r() * (FACIL ? 3 : 4)));
         const obj = mezcla(n), m = minima(obj);
         if (m && m.t >= (FACIL ? 3 : 4)) return { obj, min: m.n, m: m.t }
      }
      const n = [2, 1, 0, 1]; return { obj: mezcla(n), min: n, m: 4 }      // reserva (nunca debería hacer falta)
   }
   const P = memoSD(gen); // se regenera si cambia la semilla (SD): reto del día o ronda de duelo

   /* Progreso: p.n[k] = gotas de la pintura k · p.fx[k] = 1 si una pista la fijó · p.h = pistas · p.c = comprobaciones. */
   const ini = p => { if (!Array.isArray(p.n)) { p.n = [0, 0, 0, 0]; p.fx = [0, 0, 0, 0]; p.h = 0; p.c = 0 } };
   const total = p => p.n.reduce((a, b) => a + b, 0);
   const gana = p => total(p) > 0 && dist(mezcla(p.n), P().obj) <= TOL;
   /* Tras deshacer o reiniciar, lo fijado por una pista vuelve a su valor. */
   const refija = p => p.fx.forEach((f, k) => { if (f) p.n[k] = P().min[k] });

   function mezclar() {
      const p = prog('mz'); ini(p);
      const r = R('mezcla'), Z = P(), lost = r && r.st == 'lost';
      const n = lost ? Z.min : p.n, mix = mezcla(n);
      const fila = (k) => {
         const fx = !r && p.fx[k];
         return `<div class="mzr"><span class="mzd" style="background:${css(PINT[k][1])}" aria-hidden="true"></span><b>${PINT[k][0]}${fx ? ' 🔒' : ''}</b>`
            + `<button class="mzb" data-a="mq" data-k="${k}" aria-label="Quitar una gota de ${PINT[k][0].toLowerCase()}"${r || fx || !n[k] ? ' disabled' : ''}>−</button>`
            + `<output class="mzn" aria-label="${n[k]} ${pls(n[k], 'gota', 'gotas')} de ${PINT[k][0].toLowerCase()}">${n[k]}</output>`
            + `<button class="mzb" data-a="mw" data-k="${k}" aria-label="Añadir una gota de ${PINT[k][0].toLowerCase()}"${r || fx || total({ n }) >= MAXG ? ' disabled' : ''}>+</button></div>`
      };
      let b = `<div class="mzs"><figure><div class="mzc" style="background:${css(Z.obj)}" role="img" aria-label="Color objetivo"></div><figcaption>Objetivo</figcaption></figure>`
         + `<figure><div class="mzc${mix ? '' : ' e'}"${mix ? ` style="background:${css(mix)}"` : ''} role="img" aria-label="${mix ? 'Tu mezcla' : 'Tu mezcla, todavía vacía'}"></div><figcaption>${lost ? 'Una solución' : 'Tu mezcla'}</figcaption></figure></div>`;
      b += `<div class="mzp" data-rv="mz-pint" role="group" aria-label="Pinturas">${PINT.map((_, k) => fila(k)).join('')}</div>`;
      b += `<p class="cap" style="text-align:center;margin:0">Gotas: <b>${total({ n })}</b> de ${MAXG} como máximo</p>`;
      if (lost) b += resRendida('Mezcla', `Así se igualaba el color con ${Z.m} ${pls(Z.m, 'gota', 'gotas')}. Vuelve mañana para un reto nuevo.`);
      else if (r) b += res(`¡Color igualado en ${mmss(r.t)}!`, `${r.g} ${pls(r.g, 'gota', 'gotas')}${r.g > r.m ? ` (con ${r.m} bastaba; cada una de más suma ${EXTRA / 1000} s)` : ', el mínimo posible'}. Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Mezcla #${DAY} · ${mmss(r.t)} · ${r.g} ${pls(r.g, 'gota', 'gotas')} (mín. ${r.m})${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}${r.c ? ' · ' + r.c + pls(r.c, ' comprobación', ' comprobaciones') : ''}`);
      else b += `<p class="cap" style="text-align:center;margin:0">Iguala el color con las menos gotas posibles: cada gota de más suma ${EXTRA / 1000} s.</p>`
         + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, comprobar: 1, pista: 1, rendirme: 1 })}`;
      return shell('Mezcla', b)
   }

   /* Después de cada cambio: ¿el color ya queda a menos de TOL del objetivo? */
   function revisa(p) {
      if (!gana(p)) return;
      const Z = P(), g = total(p);
      fin('mezcla', { st: 'completed', t: Date.now() - p.t0 + Math.max(0, g - Z.m) * EXTRA, h: p.h || 0, c: p.c || 0, g, m: Z.m })
   }

   function cambia(k, d) {
      if (R('mezcla')) return;
      const p = prog('mz'); ini(p); p.t0 = p.t0 || Date.now(); k = +k;
      if (p.fx[k]) { msg = 'Esa pintura la fijó una pista y no se puede cambiar.'; Sfx.p('error'); return draw() }
      if (d > 0 && total(p) >= MAXG) { msg = `Máximo ${MAXG} gotas.`; Sfx.p('error'); return draw() }
      if (d < 0 && !p.n[k]) return;
      hist.push(p.n.slice()); p.n[k] += d; msg = ''; Sfx.p(d > 0 ? 'pon' : 'borra', p.n[k] + 1);
      revisa(p); sv(); draw()
   }
   const mw = b => cambia(b.dataset.k, 1), mq = b => cambia(b.dataset.k, -1);

   function undo() {
      const p = prog('mz'); ini(p);
      if (R('mezcla') || !hist.length) return;
      p.n = hist.pop(); refija(p); msg = ''; sv(); draw()
   }

   function reiniciar() {
      const p = prog('mz'); ini(p);
      if (R('mezcla')) return;
      const n = p.n.map((v, k) => p.fx[k] ? v : 0);
      if (n.join() == p.n.join()) return;
      hist.push(p.n.slice()); p.n = n; msg = ''; sv(); draw()   // tiempo, pistas y comprobaciones siguen contando
   }

   /* Comprobar: dice lo cerca que está la mezcla (100 % = igual) y hacia dónde se desvía. */
   function comprobar() {
      const p = prog('mz'); ini(p);
      if (R('mezcla')) return;
      if (!total(p)) { msg = 'Echa alguna gota antes de comprobar.'; Sfx.p('error'); return draw() }
      p.t0 = p.t0 || Date.now(); p.c = (p.c || 0) + 1;
      const mix = mezcla(p.n), o = P().obj, d = dist(mix, o), df = [0, 1, 2].map(c => o[c] - mix[c]);
      const lum = 0.3 * df[0] + 0.59 * df[1] + 0.11 * df[2], mx = df.reduce((a, v, c) => Math.abs(v) > Math.abs(df[a]) ? c : a, 0);
      const tono = ['rojizo', 'verdoso', 'azulado'][mx];
      msg = `Cercanía ${cerca(d)} % (para ganar, ${cerca(TOL)} %). ` + (Math.abs(lum) > 14 ? `Tu mezcla es demasiado ${lum > 0 ? 'oscura' : 'clara'}.` : `Tira ${df[mx] > 0 ? 'poco' : 'demasiado'} a ${tono}.`);
      Sfx.p('tap'); sv(); draw()
   }

   /* Pista: fija una pintura con las gotas que lleva la mezcla mínima (primero la que más se aleja). */
   function pista() {
      const p = prog('mz'); ini(p);
      if (R('mezcla')) return;
      const Z = P(), k = [0, 1, 2, 3].filter(k => !p.fx[k] && p.n[k] != Z.min[k]).sort((a, b) => Math.abs(Z.min[b] - p.n[b]) - Math.abs(Z.min[a] - p.n[a]))[0];
      if (k == null) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; hist.push(p.n.slice());
      p.n[k] = Z.min[k]; p.fx[k] = 1;
      if (total(p) > MAXG) { p.n = p.n.map((v, j) => p.fx[j] ? v : 0) }
      msg = `Pista: lleva ${Z.min[k]} ${pls(Z.min[k], 'gota', 'gotas')} de ${PINT[k][0].toLowerCase()}.`;
      revisa(p); sv(); draw()
   }

   function rendirse() {
      if (R('mezcla')) return;
      const p = prog('mz'); fin('mezcla', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw()
   }

   DailyArcade.register({
      id: 'mezcla', name: 'Mezcla', desc: 'Iguala el color mezclando gotas de pintura.', color: '--pink', tag: 'Iguala el color',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c3 4 5.5 6.6 5.5 10a5.5 5.5 0 0 1-11 0c0-3.4 2.5-6 5.5-10z"/><path d="M9 14.5a3 3 0 0 0 3 3"/></svg>',
      how: ['Mezcla <b>gotas</b> de las 4 pinturas para igualar el color <b>objetivo</b>. Cada gota pesa lo mismo: el color es la media.', 'Se gana al quedar casi idéntico. Cada gota por encima del mínimo suma unos segundos, así que gana quien mezcla con pocas.', '<b>Comprobar</b> dice lo cerca que estás y hacia dónde te desvías; <b>Pista</b> fija una pintura.'],
      demo: `<p class="cap">Una gota de rojo y otra de blanco dan un rosa:</p><div class="mzs mini" aria-hidden="true"><div class="mzc" style="background:${css(mezcla([1, 0, 0, 0]))}"></div><span>+</span><div class="mzc" style="background:${css(mezcla([0, 0, 0, 1]))}"></div><span>=</span><div class="mzc" style="background:${css(mezcla([1, 0, 0, 1]))}"></div></div>`,
      pk: 'mz',
      render: mezclar,
      actions: { mw, mq, undo, reiniciar, comprobar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Igualado · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
