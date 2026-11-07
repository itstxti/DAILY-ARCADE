/* Juego: Intruso — 5 rondas. En cada una hay 9 patrones (forma + color + giro) y todos menos uno cumplen una regla
   ("misma forma", "mismo color", "mismo giro"; en los días difíciles, a partir de la ronda 3, la regla combina dos cosas).
   Hay que tocar el que la rompe. Cada fallo suma segundos (como una comprobación) y la pista dice por qué va la regla.
   El reto sale de la fecha. Cada ronda se genera al azar y se COMPRUEBA por fuerza bruta que ninguna otra regla posible
   (las 3 sencillas y las 3 dobles) deja a otro patrón como intruso: solo hay una respuesta válida.
   La victoria se comprueba por reglas: se han acertado las 5 rondas. */
(function () {
   const RONDAS = 5, TIPOS = 4;
   const FORMAS = ['triángulo', 'semicírculo', 'letra L', 'flecha'];
   /* Contornos asimétricos (así el giro se ve siempre) dentro de un cuadro de 40×40 */
   const PATH = ['M20 7L33 31H7Z', 'M7 27A13 13 0 0 1 33 27Z', 'M11 8H20V23H31V32H11Z', 'M20 6L32 20H25V33H15V20H8Z'];
   const COLS = [['rojo', '--berry'], ['azul', '--sky'], ['amarillo', '--sun'], ['verde', '--mint']];
   const GIROS = [0, 90, 180, 270];
   const NOM = ['la forma', 'el color', 'el giro'];
   const REGLAS = [[0], [1], [2], [0, 1], [0, 2], [1, 2]];            // todas las reglas posibles
   const pls = (n, a, b) => n == 1 ? a : b;
   const FACIL = WD == 1 || WD == 2;                                 // lunes y martes: siempre una sola cosa

   /* ¿La regla dims deja al patrón i como intruso? Los otros 8 coinciden en dims y el patrón i difiere en alguna. */
   function encaja(pats, i, dims) {
      const o = pats.filter((_, j) => j != i), ref = o[0];
      return o.every(q => dims.every(d => q[d] == ref[d])) && dims.some(d => pats[i][d] != ref[d])
   }
   /* Todos los (regla, patrón) que encajan: si todos señalan al mismo patrón, la respuesta es única. */
   const intrusos = pats => { const s = new Set(); REGLAS.forEach(dims => pats.forEach((_, i) => { if (encaja(pats, i, dims)) s.add(i) })); return [...s] };

   function ronda(r, doble) {
      const rnd = n => Math.floor(r() * n);
      for (let t = 0; t < 2000; t++) {
         const dims = doble ? REGLAS[3 + rnd(3)] : REGLAS[rnd(3)], base = [rnd(TIPOS), rnd(TIPOS), rnd(TIPOS)], intr = rnd(9);
         const pats = Array.from({ length: 9 }, (_, i) => {
            const q = [rnd(TIPOS), rnd(TIPOS), rnd(TIPOS)];
            if (i != intr) dims.forEach(d => q[d] = base[d]);
            return q
         });
         // el intruso rompe la regla en una de sus partes (o en las dos) y cumple el resto
         const rotas = dims.length == 1 ? dims : [[dims[0]], [dims[1]], dims][rnd(3)];
         dims.forEach(d => { pats[intr][d] = rotas.includes(d) ? (base[d] + 1 + rnd(TIPOS - 1)) % TIPOS : base[d] });
         const u = intrusos(pats);
         if (u.length == 1 && u[0] == intr) return { pats, intr, dims }
      }
      return { pats: Array.from({ length: 9 }, (_, i) => [0, 0, i == 4 ? 1 : 0]), intr: 4, dims: [2] }   // reserva (nunca debería hacer falta)
   }

   function gen() {
      const r = rng(SD * 67 + 3);
      return Array.from({ length: RONDAS }, (_, k) => ronda(r, !FACIL && k >= 2))
   }
   const P = memoSD(gen); // se regenera si cambia la semilla (SD): reto del día o ronda de duelo

   /* Progreso: p.r = ronda actual · p.bad = casillas descartadas en esta ronda · p.hr = ronda de la última pista · p.h = pistas · p.c = fallos. */
   const ini = p => { if (typeof p.r != 'number') { p.r = 0; p.bad = []; p.hr = -1; p.h = 0; p.c = 0 } };

   const svg = q => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="${PATH[q[0]]}" transform="rotate(${GIROS[q[2]]} 20 20)" style="fill:var(${COLS[q[1]][1]})"/></svg>`;
   const nombre = q => `${FORMAS[q[0]]} ${COLS[q[1]][0]}, girado ${GIROS[q[2]]} grados`;

   function intruso() {
      const p = prog('in'); ini(p);
      const r = R('intruso'), lost = r && r.st == 'lost';
      let b = '';
      if (lost) b += resRendida('Intruso', 'Así eran las 5 rondas: en cada una, un patrón rompía la regla. Vuelve mañana para un reto nuevo.');
      else if (r) b += res(`¡Intrusos cazados en ${mmss(r.t)}!`, 'Las 5 rondas resueltas. Vuelve mañana para un reto nuevo.',
         `Daily Arcade · Intruso #${DAY} · ${mmss(r.t)}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}${r.c ? ' · ' + r.c + pls(r.c, ' fallo', ' fallos') : ''}`);
      else {
         const Z = P()[p.r];
         b += `<p class="inr" aria-live="polite"><b>Ronda ${p.r + 1} de ${RONDAS}</b> · Toca el que rompe la regla</p>`
            + `<div class="inb" data-rv="in-tab" role="group" aria-label="Patrones de la ronda ${p.r + 1}">${Z.pats.map((q, i) => {
               const x = p.bad.includes(i);
               return `<button class="inc${x ? ' x' : ''}" data-a="ip" data-i="${i}"${x ? ' disabled' : ''} aria-label="Patrón ${i + 1}: ${nombre(q)}${x ? '. Descartado.' : ''}">${svg(q)}</button>`
            }).join('')}</div>`
            + `<p class="cap" style="text-align:center;margin:0">Cada fallo suma ${Duelo.coste('comprobar')} s.${p.hr == p.r ? ` <b>Pista:</b> la regla va por ${Z.dims.map(d => NOM[d]).join(' y ')}.` : ''}</p>`
            + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ pista: 1, rendirme: 1 })}`
      }
      return shell('Intruso', b)
   }

   function ip(b) {
      if (R('intruso')) return;
      const p = prog('in'); ini(p); p.t0 = p.t0 || Date.now();
      const i = +b.dataset.i, Z = P()[p.r];
      if (p.bad.includes(i)) return;
      if (i != Z.intr) { p.bad.push(i); p.c = (p.c || 0) + 1; msg = `Ese cumple la regla. +${Duelo.coste('comprobar')} s`; Sfx.p('error'); sv(); return draw() }
      p.r++; p.bad = []; msg = ''; Sfx.p('acierto');
      if (p.r >= RONDAS) fin('intruso', { st: 'completed', t: Date.now() - p.t0, h: p.h || 0, c: p.c || 0 });
      sv(); draw()
   }

   /* Pista: dice en qué se fija la regla de la ronda (la forma, el color, el giro o dos a la vez). */
   function pista() {
      if (R('intruso')) return;
      const p = prog('in'); ini(p);
      if (p.hr == p.r) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; p.hr = p.r; msg = ''; sv(); draw()
   }

   function rendirse() {
      if (R('intruso')) return;
      const p = prog('in'); fin('intruso', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw()
   }

   DailyArcade.register({
      id: 'intruso', name: 'Intruso', desc: 'Encuentra el patrón que rompe la regla.', color: '--coral', tag: 'Encuentra el que rompe la regla',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="5" height="5" rx="1"/><rect x="9.5" y="3.5" width="5" height="5" rx="1"/><rect x="15.5" y="3.5" width="5" height="5" rx="1"/><rect x="3.5" y="9.5" width="5" height="5" rx="1"/><path d="M12 9.5l2.8 5h-5.6z"/><rect x="15.5" y="9.5" width="5" height="5" rx="1"/><rect x="3.5" y="15.5" width="5" height="5" rx="1"/><rect x="9.5" y="15.5" width="5" height="5" rx="1"/><rect x="15.5" y="15.5" width="5" height="5" rx="1"/></svg>',
      how: ['En cada ronda hay <b>9 patrones</b>. Todos menos uno siguen una regla: misma forma, mismo color o mismo giro.', 'Toca el <b>intruso</b>, el que la rompe. Hay 5 rondas y cada fallo suma segundos.', 'Si te atascas, la <b>pista</b> dice en qué se fija la regla. Más adelante pueden ser dos cosas a la vez.'],
      demo: `<p class="cap">Si todos son triángulos rojos menos uno azul, el intruso es el azul:</p><div class="inb mini" aria-hidden="true">${[[0, 0, 0], [0, 0, 0], [0, 1, 0], [0, 0, 0]].map(q => `<span class="inc">${svg(q)}</span>`).join('')}</div>`,
      pk: 'in',
      render: intruso,
      actions: { ip, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Resuelto · ${mmss(r.t)}` : (p && p.t0 ? `Ronda ${Math.min((p.r || 0) + 1, RONDAS)} de ${RONDAS}` : 'Sin jugar')
   });
})();
