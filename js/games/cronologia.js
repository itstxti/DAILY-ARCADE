/* Juego: Cronología — 5 rondas. En cada una salen 4 sucesos históricos mezclados y hay que tocarlos del más antiguo al más reciente.
   Cada acierto fija el suceso en su sitio y enseña su año; cada fallo suma segundos (como una comprobación). La pista dice de qué
   siglo es el más antiguo que queda. El reto sale de la fecha: los sucesos salen de content/eventos.js (todos con año distinto) y en
   cada ronda se exige una separación mínima entre años (más amplia los lunes y martes y en las primeras rondas), así que el orden
   correcto es siempre único. La victoria se comprueba por reglas: se han ordenado las 5 rondas. */
(function () {
   const LISTA = window.EVENTOS || [];
   if (LISTA.length < 40) { console.info('Cronología: falta content/eventos.js; el juego no se muestra.'); return }
   const RONDAS = 5, N = 4;
   const FACIL = WD == 1 || WD == 2;                                     // lunes y martes: años muy separados
   const HUECO = k => FACIL ? 60 : [45, 35, 25, 15, 8][k];               // separación mínima (años) entre sucesos de la ronda k
   const pls = (n, a, b) => n == 1 ? a : b;
   const anyo = y => y < 0 ? `${-y} a. C.` : String(y);
   const ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
   const siglo = y => y < 0 ? 'antes de Cristo' : `del siglo ${ROM[Math.ceil(y / 100)]}`;

   function ronda(r, k, usados) {
      const rnd = n => Math.floor(r() * n);
      for (let t = 0; t < 4000; t++) {
         const hueco = t < 3000 ? HUECO(k) : 1;                           // (reserva: si no hay manera, se relaja la separación)
         const ix = []; while (ix.length < N) { const j = rnd(LISTA.length); if (!ix.includes(j) && !usados.has(j)) ix.push(j) }
         const ys = ix.map(j => LISTA[j][0]).sort((a, b) => a - b);
         if (ys.some((y, i) => i && y - ys[i - 1] < hueco)) continue;
         ix.forEach(j => usados.add(j));
         const ord = [...ix].sort((a, b) => LISTA[a][0] - LISTA[b][0]);   // orden correcto (índices en LISTA); ix ya está mezclado
         return { ix, ord }
      }
      throw new Error('sin ronda')
   }

   function gen() {
      const r = rng(SD * 71 + 11), usados = new Set();
      return Array.from({ length: RONDAS }, (_, k) => ronda(r, k, usados))
   }
   const P = memoSD(gen); // se regenera si cambia la semilla (SD): reto del día o ronda de duelo

   /* Progreso: p.r = ronda actual · p.o = sucesos ya colocados en esta ronda (índices de LISTA, en orden) · p.bad = descartados en este paso
      · p.hr = ronda de la última pista · p.h = pistas · p.c = fallos. */
   const ini = p => { if (typeof p.r != 'number') { p.r = 0; p.o = []; p.bad = []; p.hr = -1; p.h = 0; p.c = 0 } };

   /* Resumen final: las 5 rondas con su orden correcto y sus años. */
   const resumen = () => `<div class="crs" aria-label="Soluciones de las 5 rondas">${P().map((z, k) => `<ol class="crl" aria-label="Ronda ${k + 1}">${z.ord.map(j => `<li><b>${anyo(LISTA[j][0])}</b> ${esc(LISTA[j][1])}</li>`).join('')}</ol>`).join('')}</div>`;

   function cronologia() {
      const p = prog('cn'); ini(p);
      const r = R('cronologia'), lost = r && r.st == 'lost';
      let b = '';
      if (lost) b += resRendida('Cronología', 'Así era el orden en las 5 rondas. Vuelve mañana para un reto nuevo.') + resumen();
      else if (r) b += res(`¡Historia en orden en ${mmss(r.t)}!`, 'Las 5 rondas ordenadas. Vuelve mañana para un reto nuevo.',
         `Daily Arcade · Cronología #${DAY} · ${mmss(r.t)}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}${r.c ? ' · ' + r.c + pls(r.c, ' fallo', ' fallos') : ''}`) + resumen();
      else {
         const Z = P()[p.r], sig = Z.ord.find(j => !p.o.includes(j));
         b += `<p class="inr" aria-live="polite"><b>Ronda ${p.r + 1} de ${RONDAS}</b> · Toca el más <b>antiguo</b> de los que quedan</p><ol class="crl crp">`
            + p.o.map((j, n) => `<li class="ok"><b>${anyo(LISTA[j][0])}</b> ${esc(LISTA[j][1])}</li>`).join('') + `</ol>`
            + `<div class="crb" role="group" aria-label="Sucesos por ordenar">${Z.ix.filter(j => !p.o.includes(j)).map(j => {
               const x = p.bad.includes(j);
               return `<button class="crc${x ? ' x' : ''}" data-a="cq" data-j="${j}"${x ? ' disabled' : ''}>${esc(LISTA[j][1])}${x ? ' <small>(no es el más antiguo)</small>' : ''}</button>`
            }).join('')}</div>`
            + `<p class="cap" style="text-align:center;margin:0">Cada fallo suma ${Duelo.coste('comprobar')} s.${p.hr == p.r ? ` <b>Pista:</b> el más antiguo es ${LISTA[sig][0] < 0 ? 'de ' : ''}${siglo(LISTA[sig][0])}.` : ''}</p>`
            + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ pista: 1, rendirme: 1 })}`
      }
      return shell('Cronología', b)
   }

   function cq(b) {
      if (R('cronologia')) return;
      const p = prog('cn'); ini(p); p.t0 = p.t0 || Date.now();
      const j = +b.dataset.j, Z = P()[p.r], sig = Z.ord.find(k => !p.o.includes(k));
      if (p.o.includes(j) || p.bad.includes(j)) return;
      if (j != sig) { p.bad.push(j); p.c = (p.c || 0) + 1; msg = `Hay uno más antiguo. +${Duelo.coste('comprobar')} s`; Sfx.p('error'); sv(); return draw() }
      p.o.push(j); p.bad = []; msg = ''; Sfx.p('acierto');
      if (p.o.length == N - 1) p.o.push(Z.ord[N - 1]);                   // el último queda solo: se coloca solo
      if (p.o.length >= N) {
         p.r++; p.o = []; p.hr = -1;
         if (p.r >= RONDAS) fin('cronologia', { st: 'completed', t: Date.now() - p.t0, h: p.h || 0, c: p.c || 0 })
      }
      sv(); draw()
   }

   /* Pista: dice de qué siglo es el suceso más antiguo de los que quedan. */
   function pista() {
      if (R('cronologia')) return;
      const p = prog('cn'); ini(p);
      if (p.hr == p.r) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; p.hr = p.r; msg = ''; sv(); draw()
   }

   function rendirse() {
      if (R('cronologia')) return;
      const p = prog('cn'); fin('cronologia', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw()
   }

   DailyArcade.register({
      id: 'cronologia', name: 'Cronología', desc: 'Ordena sucesos históricos del más antiguo al más reciente.', color: '--sun', tag: 'Ordena los sucesos por fecha',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18"/><circle cx="6" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="18" cy="12" r="2.2"/><path d="M6 9V5M12 15v4M18 9V5"/></svg>',
      how: ['En cada ronda hay <b>4 sucesos</b> de la historia, mezclados.', 'Toca siempre el <b>más antiguo</b> de los que quedan. Si aciertas, se coloca y se ve su año; si no, suma segundos.', 'Son 5 rondas. Si dudas, la <b>pista</b> dice de qué siglo es el más antiguo.'],
      demo: `<p class="cap">Se tocan de más antiguo a más reciente y cada uno enseña su año:</p><ol class="crl crm" aria-hidden="true"><li class="ok"><b>1492</b> Colón llega a América</li><li class="ok"><b>1789</b> Toma de la Bastilla</li><li class="ok"><b>1969</b> El hombre pisa la Luna</li></ol>`,
      pk: 'cn',
      render: cronologia,
      actions: { cq, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Resuelto · ${mmss(r.t)}` : (p && p.t0 ? `Ronda ${Math.min((p.r || 0) + 1, RONDAS)} de ${RONDAS}` : 'Sin jugar')
   });
})();
