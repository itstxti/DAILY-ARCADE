/* Juego: Hielo — el suelo es de hielo: al moverte (arriba, abajo, izquierda o derecha) te deslizas hasta chocar con una roca o con el borde.
   Hay que pasar por TODAS las estrellas (da igual si pasas o te paras encima) y acabar parado en la bandera, que también te frena.
   El reto sale de la fecha (SD). Se ponen rocas al azar, se mira a qué casillas se puede llegar deslizando y se elige una meta y unas estrellas por las que
   se pasa en esos deslizamientos. Después se hace una anchura (BFS) sobre (casilla, estrellas recogidas) para sacar el MÍNIMO de movimientos, y solo se aceptan
   retos largos y en los que las estrellas obligan a dar rodeos (más que si no hubiese estrellas): así siempre tiene solución y no es trivial.
   La victoria se comprueba por reglas (parado en la meta con todas las estrellas), no contra la solución guardada. */
(function () {
   const FACIL = WD == 1 || WD == 2, N = FACIL ? 6 : 7, T = N * N, K = FACIL ? 2 : 3;
   const MIN = FACIL ? 7 : WD == 0 || WD == 6 ? 11 : 9;                 // mínimo de movimientos que se pide al reto
   const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
   const FL = { U: '↑', D: '↓', L: '←', R: '→' }, NOM = { U: 'arriba', D: 'abajo', L: 'la izquierda', R: 'la derecha' };
   const pls = (n, a, b) => n == 1 ? a : b;
   const pos = i => `fila ${(i / N | 0) + 1}, columna ${i % N + 1}`;

   /* ----- Reglas ----- */
   /* Desliza desde la casilla i hacia d con m = estrellas ya recogidas (máscara). Devuelve { i, m, n, de } (n = casillas recorridas; 0 = no te mueves). */
   function desliza(Z, i, d, m) {
      const [dx, dy] = DIRS[d]; let x = i % N, y = i / N | 0, n = 0;
      for (; ;) {
         const nx = x + dx, ny = y + dy;
         if (nx < 0 || ny < 0 || nx >= N || ny >= N || Z.R.has(ny * N + nx)) break;
         x = nx; y = ny; n++;
         const j = y * N + x, k = Z.st.indexOf(j);
         if (k >= 0) m |= 1 << k;
         if (j == Z.meta) break                                           // la bandera también frena
      }
      return { i: y * N + x, m, n, de: i }
   }
   const lleno = Z => (1 << Z.st.length) - 1;

   /* Anchura desde (i0, m0). Devuelve el camino más corto como texto de direcciones ('' si ya está; null si no se puede).
      libre = true ignora las estrellas (solo hay que llegar a la meta): da el mínimo «sin estrellas» para medir cuánto estorban. */
   function busca(Z, i0, m0, libre) {
      const F = libre ? 0 : lleno(Z), ant = new Int32Array(T << 4).fill(-2), dir = new Uint8Array(T << 4), cola = [];
      const cod = (i, m) => m * T + i;
      ant[cod(i0, m0)] = -1; cola.push(cod(i0, m0));
      for (let h = 0; h < cola.length; h++) {
         const c = cola[h], i = c % T, m = c / T | 0;
         if (i == Z.meta && (m & F) == F) {
            let s = '', q = c;
            while (ant[q] >= 0) { s = 'UDLR'[dir[q]] + s; q = ant[q] }
            return s
         }
         for (let d = 0; d < 4; d++) {
            const q = desliza(Z, i, 'UDLR'[d], m); if (!q.n) continue;
            const k = cod(q.i, q.m); if (ant[k] != -2) continue;
            ant[k] = c; dir[k] = d; cola.push(k)
         }
      }
      return null
   }

   /* ----- Generación ----- */
   function gen() {
      const r = rng(SD * 67 + 23), rnd = n => Math.floor(r() * n);
      for (let t = 0; t < 600; t++) {
         const minimo = MIN - (t > 250 ? 2 : 0) - (t > 450 ? 2 : 0);
         const R = new Set(), nr = Math.round(T * (.15 + .1 * r()));
         while (R.size < nr) R.add(rnd(T));
         const libres = []; for (let i = 0; i < T; i++) if (!R.has(i)) libres.push(i);
         const i0 = libres[rnd(libres.length)];
         // casillas donde se puede acabar un deslizamiento (alcanzables desde i0) y casillas por las que se pasa
         const Z0 = { R, st: [], meta: -1 }, dist = new Map([[i0, 0]]), cola = [i0], pasa = new Set();
         for (let h = 0; h < cola.length; h++) {
            const i = cola[h];
            for (const d of 'UDLR') {
               const q = desliza(Z0, i, d, 0); if (!q.n) continue;
               const [dx, dy] = DIRS[d];
               for (let s = 1; s <= q.n; s++) pasa.add((((i / N | 0) + dy * s) * N) + i % N + dx * s);
               if (!dist.has(q.i)) { dist.set(q.i, dist.get(i) + 1); cola.push(q.i) }
            }
         }
         const metas = [...dist].filter(([i, d]) => d >= 3 && i != i0).map(x => x[0]);
         if (!metas.length) continue;
         const meta = metas[rnd(metas.length)];
         const cand = [...pasa].filter(i => i != i0 && i != meta);
         if (cand.length < K) continue;
         const st = []; while (st.length < K) { const c = cand[rnd(cand.length)]; if (!st.includes(c)) st.push(c) }
         const Z = { R, i0, meta, st };
         const sol = busca(Z, i0, 0, false), lib = busca(Z, i0, 0, true);
         if (sol == null || lib == null || sol.length < minimo || sol.length < lib.length + 2) continue;
         return { R, i0, meta, st, sol }
      }
      // reserva (nunca debería hacer falta): sin rocas, una estrella en el camino y la meta al final de la fila
      const i0 = 0, meta = N - 1, Z = { R: new Set(), i0, meta, st: [2] };
      return { R: Z.R, i0, meta, st: Z.st, sol: busca(Z, i0, 0, false) }
   }
   const P = memoSD(gen);                                                // se regenera si cambia la semilla (SD)

   /* Progreso: p.m = movimientos hechos (texto de direcciones, para Deshacer) · p.n = movimientos contados (deshacer no los devuelve) · p.h = pistas · p.g = huella del reto. */
   const ini = p => { const Z = P(), g = Z.i0 + ',' + Z.meta + ',' + Z.st.join('.'); if (typeof p.m != 'string' || p.g != g) { p.m = ''; p.n = 0; p.h = 0; p.pd = null; p.g = g } };
   function estado(Z, m) {
      let s = { i: Z.i0, m: 0, ult: null };
      for (const d of m) { const q = desliza(Z, s.i, d, s.m); s = { i: q.i, m: q.m, ult: q.n ? [q.de, q.i] : null } }
      return s
   }

   /* ----- Dibujo ----- */
   const MS_BASE = 160, MS_CASILLA = 110;                                // duración del deslizamiento: base + por casilla recorrida
   let anim = null;                                                      // { de, a } del último movimiento, hasta que se pinta
   const estrella = (cx, cy, r) => { let s = ''; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; s += (k ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(3) + ' ' + (cy + rr * Math.sin(a)).toFixed(3) } return s + 'z' };
   function svgTablero(Z, s, meta) {
      const vis = k => s.m & 1 << k, abre = s.m == lleno(Z);
      let z = `<svg viewBox="0 0 ${N} ${N}" role="img" aria-label="Tablero de Hielo de ${N} por ${N}. Estás en ${pos(s.i)}." style="display:block;width:100%;height:auto">`;
      for (let i = 0; i < T; i++) {
         const x = i % N, y = i / N | 0;
         z += Z.R.has(i)
            ? `<rect x="${x + .04}" y="${y + .04}" width=".92" height=".92" rx=".14" style="fill:var(--line);stroke:var(--ink);stroke-width:.05"/><path d="M${x + .28} ${y + .68}l.16-.3.14.14.14-.28.1.44z" style="fill:var(--ink);opacity:.35"/>`
            : `<rect x="${x + .04}" y="${y + .04}" width=".92" height=".92" rx=".08" style="fill:color-mix(in srgb,var(--aqua) 16%,var(--card));stroke:color-mix(in srgb,var(--aqua) 45%,transparent);stroke-width:.03"/>`
      }
      if (s.ult) z += `<path d="M${s.ult[0] % N + .5} ${(s.ult[0] / N | 0) + .5}L${s.ult[1] % N + .5} ${(s.ult[1] / N | 0) + .5}" style="fill:none;stroke:var(--sky);stroke-width:.09;stroke-dasharray:.14 .12;stroke-linecap:round;opacity:.6"/>`;
      // meta (bandera): se pinta solo si la partida sigue o al rendirse
      const gx = Z.meta % N, gy = Z.meta / N | 0;
      z += `<rect x="${gx + .1}" y="${gy + .1}" width=".8" height=".8" rx=".12" style="fill:${abre ? 'color-mix(in srgb,var(--mint) 35%,var(--card))' : 'none'};stroke:var(--ink);stroke-width:.05;${abre ? '' : 'stroke-dasharray:.12 .1'}"/>`
         + `<path d="M${gx + .38} ${gy + .76}V${gy + .22}M${gx + .38} ${gy + .24}L${gx + .74} ${gy + .37}L${gx + .38} ${gy + .5}z" style="fill:var(--berry);stroke:var(--ink);stroke-width:.04;stroke-linejoin:round;stroke-linecap:round"/>`;
      Z.st.forEach((c, k) => {
         const x = c % N + .5, y = (c / N | 0) + .5;
         z += `<path d="${estrella(x, y, .34)}" style="fill:${vis(k) ? 'var(--mint)' : 'color-mix(in srgb,var(--sun) 55%,var(--card))'};stroke:var(--ink);stroke-width:.05;stroke-linejoin:round"/>`
      });
      const x = s.i % N + .5, y = (s.i / N | 0) + .5;
      let dat = ''; if (anim && !meta && anim.a == s.i) { dat = ` data-de="${anim.de}" data-a="${anim.a}"`; requestAnimationFrame(() => animar(0)) } anim = null;
      return z + `<g class="hjp"${dat}><circle cx="${x}" cy="${y}" r=".3" style="fill:var(--sky);stroke:var(--ink);stroke-width:.06"/><circle cx="${x - .1}" cy="${y - .06}" r=".06" style="fill:var(--card)"/><circle cx="${x + .1}" cy="${y - .06}" r=".06" style="fill:var(--card)"/></g></svg>`
   }

   /* Se lanza tras pintar: desliza al personaje desde la casilla anterior hasta la nueva (sin movimiento reducido no hay animación; el estado final ya está dibujado). */
   function animar(n) {
      const g = document.querySelector('.hjp[data-de]');
      if (!g) { if (n < 3) requestAnimationFrame(() => animar(n + 1)); return }
      const de = +g.dataset.de, a = +g.dataset.a; g.removeAttribute('data-de'); g.removeAttribute('data-a');
      if (!g.animate || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      const dx = de % N - a % N, dy = (de / N | 0) - (a / N | 0), c = Math.abs(dx) + Math.abs(dy);
      g.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }], { duration: MS_BASE + MS_CASILLA * c, easing: 'cubic-bezier(.3,.1,.3,1)' })
   }

   const bt = (d, p) => `<button class="btn ddd2${p.pd == d ? ' pista' : ''}" data-a="hm" data-d="${d}" aria-label="Deslizarte hacia ${NOM[d].replace('la ', '')}">${FL[d]}</button>`;
   function hielo() {
      const p = prog('hi'); ini(p);
      const r = R('hielo'), Z = P(), lost = r && r.st == 'lost', s = estado(Z, p.m), K = Z.st.length, rec = Z.st.filter((c, k) => s.m & 1 << k).length;
      const sh = lost ? { i: Z.meta, m: lleno(Z), ult: null } : s;           // al rendirse el personaje se muestra en la meta
      let b = `<div class="ddb" data-b="hielo">${svgTablero(Z, sh)}</div>`;
      b += `<span class="sr" role="status">Estás en ${pos(s.i)}. Estrellas recogidas: ${rec} de ${K}. La bandera está en ${pos(Z.meta)}.</span>`;
      if (lost) b += resRendida('Hielo', `Una solución de ${Z.sol.length} movimientos: ${[...Z.sol].map(d => FL[d]).join(' ')}. Vuelve mañana para un reto nuevo.`);
      else if (r) b += res(`¡Meta alcanzada en ${mmss(r.t)}!`, `${r.n} ${pls(r.n, 'movimiento', 'movimientos')} (el mínimo era ${Z.sol.length}). Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Hielo #${DAY} · ${N}×${N} · ${r.n}/${Z.sol.length} mov.${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''} · ${mmss(r.t)}`);
      else b += `<div class="ddp" role="group" aria-label="Deslizarte (también con las flechas del teclado)"><span></span>${bt('U', p)}<span></span>${bt('L', p)}${bt('D', p)}${bt('R', p)}</div>`
         + `<p class="cap" style="text-align:center;margin:0">Estrellas: <b>${rec} / ${K}</b> · Movimientos: <b>${p.n}</b></p>`
         + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, pista: 1, rendirme: 1 })}`
         + `<p class="foot" style="margin-top:8px;text-align:center">Te deslizas hasta chocar con una <b>roca</b> o el borde. La <b>bandera</b> también te frena. Pasa por todas las <b>estrellas</b> y termina en la bandera.</p>`;
      return shell('Hielo', b)
   }

   /* ----- Jugadas ----- */
   function mover(d) {
      if (R('hielo')) return;
      const p = prog('hi'); ini(p); const Z = P(), s = estado(Z, p.m), q = desliza(Z, s.i, d, s.m);
      if (!q.n) { msg = 'No te mueves: hay una roca o el borde justo al lado.'; Sfx.p('error'); return draw() }
      p.t0 = p.t0 || Date.now(); p.m += d; p.n++; p.pd = null; msg = ''; Sfx.p('tap', p.n % 5); anim = { de: s.i, a: q.i };
      if (q.i == Z.meta && q.m == lleno(Z)) { Sfx.p('acierto'); fin('hielo', { st: 'completed', t: Date.now() - p.t0, n: p.n, par: Z.sol.length, h: p.h || 0, c: 0 }) }
      sv(); draw()
   }
   function hm(b) { mover(b.dataset.d) }
   function undo() {
      const p = prog('hi'); ini(p);
      if (R('hielo') || !p.m) return;
      p.m = p.m.slice(0, -1); p.pd = null; msg = ''; sv(); draw()            // los movimientos ya hechos siguen contando
   }
   function reiniciar() {
      const p = prog('hi'); ini(p);
      if (R('hielo') || !p.m) return;
      p.m = ''; p.pd = null; msg = ''; sv(); draw()                          // el contador, el tiempo y las pistas siguen contando
   }
   /* Pista: dice cuál es el mejor siguiente movimiento desde donde estás (no lo hace por ti). */
   function pista() {
      const p = prog('hi'); ini(p); if (R('hielo')) return;
      const Z = P(), s = estado(Z, p.m), c = busca(Z, s.i, s.m, false);
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1;
      if (c == null) { msg = 'Pista: desde aquí no se llega. Reinicia.'; p.pd = null }
      else if (c == '') { msg = 'Pista: ya estás en la meta.'; p.pd = null }
      else { p.pd = c[0]; msg = `Pista: el mejor movimiento ahora es hacia ${NOM[c[0]]} (${c.length} ${pls(c.length, 'movimiento', 'movimientos')} para terminar).` }
      sv(); draw()
   }
   function rendirse() { if (R('hielo')) return; const p = prog('hi'); fin('hielo', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw() }

   /* Flechas del teclado (el juego se las queda: ver `flechas: true`). */
   document.addEventListener('keydown', e => {
      const g = typeof cur == 'function' && cur(); if (!g || g.id != 'hielo' || R('hielo') || e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest('input,textarea,select'))) return;
      const d = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' }[e.key]; if (!d) return;
      e.preventDefault(); mover(d)
   });

   DailyArcade.register({
      id: 'hielo', name: 'Hielo', desc: 'Deslízate por el hielo hasta la bandera pasando por todas las estrellas.', color: '--aqua', tag: 'Deslízate hasta la bandera', flechas: true,
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M9.5 4.7 12 7l2.5-2.3M9.5 19.3 12 17l2.5 2.3"/></svg>',
      how: ['El suelo es de <b>hielo</b>: cuando te mueves con las <b>flechas</b> o los botones, te deslizas hasta chocar con una <b>roca</b> o con el borde.', 'Hay que pasar por <b>todas las estrellas</b> (da igual si pasas o te paras encima) y acabar parado en la <b>bandera</b>, que también te frena.', 'Cuenta cada movimiento: intenta acercarte al <b>mínimo</b>.'],
      pk: 'hi',
      render: hielo,
      actions: { hm, undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Completada · ${r.n}/${r.par} movimientos · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
