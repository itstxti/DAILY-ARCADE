/* Juego: Dado rodante — un dado recorre el tablero rodando casilla a casilla (arriba, abajo, izquierda, derecha). En un dado, las caras opuestas suman 7.
   Algunas casillas llevan un número: solo se puede pisar con ESE número en la cara de arriba. Hay que pisarlas TODAS (en el orden que quieras)
   y, después, llegar a la meta. Las rocas bloquean el paso. El dado puede volver sobre sus pasos: rodar hacia atrás deja las caras como estaban.
   El reto sale de la fecha (SD). Se hace un paseo al azar con el dado, se eligen como casillas con número algunas por las que pasó (con la cara que llevaba arriba)
   y la meta es donde acaba. Después se BUSCA POR ANCHURA sobre (casilla, orientación del dado, casillas con número ya pisadas) el menor número de movimientos:
   solo se aceptan retos que se pueden resolver, con un mínimo largo y en los que las caras del dado obligan a dar rodeos (más que si no hubiese números).
   La victoria se comprueba por reglas (todas pisadas y el dado en la meta), no contra una solución guardada. Lunes y martes: 5×5 con 2 números; el resto, 6×6 con 3.
   El dado se dibuja como un cubo 3D de verdad (CSS, con sus puntos) encima del tablero SVG: ver «Dado 3D» más abajo y css/dado.css. */
(function () {
   const FACIL = WD == 1 || WD == 2, N = FACIL ? 5 : 6, T = N * N, K = FACIL ? 2 : 3;
   const [LO, HI] = FACIL ? [8, 16] : [11, 22];                      // mínimo de movimientos aceptado (mín. y máx.)
   const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }, OPU = { U: 'D', D: 'U', L: 'R', R: 'L' };
   const FL = { U: '↑', D: '↓', L: '←', R: '→' }, NOM = { U: 'arriba', D: 'abajo', L: 'la izquierda', R: 'la derecha' };
   const pls = (n, a, b) => n == 1 ? a : b;
   const O0 = [1, 2, 3];                                              // el dado empieza con el 1 arriba, el 2 al norte y el 3 al este

   /* Orientación = [arriba, norte, este]; sur = 7 - norte, oeste = 7 - este, abajo = 7 - arriba. Devuelve la orientación tras rodar hacia d. */
   function rueda(o, d) {
      const [t, n, e] = o;
      if (d == 'R') return [7 - e, n, t];
      if (d == 'L') return [e, n, 7 - t];
      if (d == 'U') return [7 - n, t, e];
      return [n, 7 - t, e]
   }
   const cod = (i, o, m) => ((i * 216 + (o[0] - 1) * 36 + (o[1] - 1) * 6 + (o[2] - 1)) << 4) | m;

   /* Intenta rodar desde s = { i, o, m } hacia d. Devuelve { s } si se puede o { no: motivo } (borde, roca o número que no coincide). */
   function paso(Z, s, d) {
      const x = s.i % N + DIRS[d][0], y = (s.i / N | 0) + DIRS[d][1];
      if (x < 0 || y < 0 || x >= N || y >= N) return { no: 'borde' };
      const j = y * N + x; if (Z.R.has(j)) return { no: 'roca' };
      const o = rueda(s.o, d), k = Z.ck[j];
      if (k >= 0 && Z.cp[k].n != o[0]) return { no: 'num', n: Z.cp[k].n, t: o[0] };
      return { s: { i: j, o, m: k >= 0 ? s.m | 1 << k : s.m } }
   }

   /* Anchura desde s0 hasta la meta con todas las casillas con número pisadas. Devuelve el camino más corto como texto ('' si ya está; null si no se puede).
      libre = true ignora la regla de los números (solo hay que pisarlas): da el mínimo «sin dado» para medir cuánto estorban las caras. */
   function buscar(Z, s0, libre) {
      const ant = new Int32Array(T * 216 * 16).fill(-2), dir = new Uint8Array(T * 216 * 16), cola = [s0], cs = [cod(s0.i, s0.o, s0.m)]; ant[cs[0]] = -1;
      for (let h = 0; h < cola.length; h++) {
         const s = cola[h], c = cs[h];
         if (s.i == Z.meta && s.m == full(Z)) { let o = ''; for (let q = c; ant[q] >= 0; q = ant[q]) o = 'UDLR'[dir[q]] + o; return o }
         for (const d of 'UDLR') {
            const q = libre ? (() => { const x = s.i % N + DIRS[d][0], y = (s.i / N | 0) + DIRS[d][1]; if (x < 0 || y < 0 || x >= N || y >= N || Z.R.has(y * N + x)) return null; const j = y * N + x, k = Z.ck[j]; return { s: { i: j, o: [1, 1, 1], m: k >= 0 ? s.m | 1 << k : s.m } } })() : paso(Z, s, d);
            if (!q || !q.s) continue;
            const t = cod(q.s.i, q.s.o, q.s.m);
            if (ant[t] == -2) { ant[t] = c; dir[t] = 'UDLR'.indexOf(d); cola.push(q.s); cs.push(t) }
         }
      }
      return null
   }

   function gen() {
      const r = rng(SD * 59 + 21), rnd = n => Math.floor(r() * n);
      for (let t = 0; t < 1500; t++) {
         const R = new Set(shuf([...Array(T).keys()], r).slice(0, 3 + rnd(4)));
         let i0 = rnd(T); while (R.has(i0)) i0 = rnd(T);
         // paseo al azar con el dado (sin volver enseguida sobre sus pasos)
         let i = i0, o = O0, ud = '', L = LO + rnd(HI - LO - 2); const vis = new Map(), orden = [];
         for (let k = 0; k < L; k++) {
            const op = [...'UDLR'].filter(d => { const x = i % N + DIRS[d][0], y = (i / N | 0) + DIRS[d][1]; return x >= 0 && y >= 0 && x < N && y < N && !R.has(y * N + x) && d != OPU[ud] });
            if (!op.length) break;
            const d = op[rnd(op.length)]; i = ((i / N | 0) + DIRS[d][1]) * N + i % N + DIRS[d][0]; o = rueda(o, d); ud = d;
            if (i != i0 && !vis.has(i)) { vis.set(i, o[0]); orden.push(i) }
         }
         const meta = i; if (meta == i0) continue;
         const cand = orden.filter(c => c != meta); if (cand.length < K) continue;
         const cp = shuf(cand.slice(), r).slice(0, K).map(c => ({ i: c, n: vis.get(c) })), ck = Array(T).fill(-1); cp.forEach((c, k) => { ck[c.i] = k });
         const Z = { R, i0, meta, cp, ck }, s0 = { i: i0, o: O0, m: 0 }, sol = buscar(Z, s0, false);
         if (sol == null || sol.length < LO || sol.length > HI) continue;
         const lib = buscar(Z, s0, true);
         if (lib == null || sol.length < lib.length + 3) continue;           // que las caras del dado obliguen a dar rodeos
         return { ...Z, sol }
      }
      // reserva (nunca debería hacer falta): sin rocas ni números, de una esquina a la opuesta
      const Z = { R: new Set(), i0: 0, meta: T - 1, cp: [], ck: Array(T).fill(-1) };
      return { ...Z, sol: buscar(Z, { i: 0, o: O0, m: 0 }, false) }
   }
   const P = memoSD(gen);                                                    // se regenera si cambia la semilla (SD)
   const full = Z => (1 << Z.cp.length) - 1;

   /* Progreso: p.m = movimientos hechos (texto de direcciones) · p.n = rodadas contadas (deshacer también cuenta) · p.h = pistas · p.g = huella del reto. */
   const ini = p => { const Z = P(), g = Z.i0 + ',' + Z.meta + ',' + Z.cp.map(c => c.i + ':' + c.n).join(); if (typeof p.m != 'string' || p.g != g) { p.m = ''; p.n = 0; p.h = 0; p.g = g; p.pd = null } };
   /* Estado actual: se parte del inicio y se repiten los movimientos. */
   const estado = (Z, m) => { let s = { i: Z.i0, o: O0, m: 0 }; for (const d of m) { const q = paso(Z, s, d); if (q.s) s = q.s } return s };
   const pos = i => `fila ${(i / N | 0) + 1}, columna ${i % N + 1}`;

   /* ----- Dado 3D -----
      Un cubo de verdad hecho con CSS (6 caras con sus puntos) que se coloca encima del tablero SVG, en la casilla del dado.
      · La orientación [arriba, norte, este] fija una matriz 3D (matriz): es la única fuente de verdad, no se acumulan giros.
      · Al rodar una casilla (también al deshacer) se anima un giro de 90° sobre el eje de esa dirección, un deslizamiento y un pequeño salto.
        Como el giro de la animación es el mismo que hace rueda() con las caras, el dado termina exactamente en la orientación nueva.
      · La vista está inclinada para que se vean TRES caras: arriba, delante (sur) y derecha (este). Las otras tres son sus opuestas (suman 7).
      El estado final siempre está dibujado de base; la animación solo lo recorre desde la casilla anterior (sin movimiento reducido, no hay animación). */
   const DIR = { 1: [0, 0, 1], 2: [0, -1, 0], 3: [1, 0, 0], 4: [-1, 0, 0], 5: [0, 1, 0], 6: [0, 0, -1] };   // dónde está cada cara en el dado inicial O0 (x este, y sur, z arriba)
   const PIPS = { 1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [1, 3], [3, 1], [3, 3]], 5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]], 6: [[1, 1], [2, 1], [3, 1], [1, 3], [2, 3], [3, 3]] };
   const CARAS = [1, 2, 3, 4, 5, 6].map(v => `<b class="dzf dzf${v}">${PIPS[v].map(([r, c]) => `<i style="grid-area:${r}/${c}"></i>`).join('')}</b>`).join('');
   const DUR = 320, EJE = { U: 'rotateX(90deg)', D: 'rotateX(-90deg)', R: 'rotateY(90deg)', L: 'rotateY(-90deg)' };
   let ultimo = null, rodada = null;                                         // ultimo = lo último que se dibujó · rodada = animación en curso (por si se repinta a mitad)

   /* Matriz CSS (por columnas) que deja el dado con la orientación o: lleva la cara de arriba hacia +z, la del norte hacia −y y la del este hacia +x. */
   function matriz(o) {
      const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (const [w, d] of [[[0, 0, 1], DIR[o[0]]], [[0, -1, 0], DIR[o[1]]], [[1, 0, 0], DIR[o[2]]]])
         for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) M[r][c] += w[r] * d[c];
      return `matrix3d(${M[0][0]},${M[1][0]},${M[2][0]},0,${M[0][1]},${M[1][1]},${M[2][1]},0,${M[0][2]},${M[1][2]},${M[2][2]},0,0,0,0,1)`
   }

   function dado3d(s, g) {
      const x = s.i % N, y = s.i / N | 0, oc = s.o.join(''), ahora = performance.now();
      if (ultimo && ultimo.g == g && (ultimo.i != s.i || ultimo.o != oc)) {
         // ¿viene de la casilla de al lado con una sola rodada? (mover y deshacer sí; reiniciar o rendirse no: ahí no se anima)
         for (const d of 'UDLR')
            if (ultimo.i % N + DIRS[d][0] == x && (ultimo.i / N | 0) + DIRS[d][1] == y && rueda([...ultimo.o].map(Number), d).join('') == oc) {
               rodada = { g, i: s.i, o: oc, d, fo: ultimo.o, t0: ahora }; break
            }
      }
      ultimo = { g, i: s.i, o: oc };
      let an = '';
      if (rodada && rodada.g == g && rodada.i == s.i && rodada.o == oc && ahora - rodada.t0 < DUR) {
         // si se repinta mientras rueda (p. ej. por el cronómetro), la animación sigue por donde iba
         an = ` data-rd="${rodada.d}" data-rm="${rodada.fo}" data-rt="${Math.round(ahora - rodada.t0)}"`;
         requestAnimationFrame(() => animar(0))
      }
      return `<div class="dzw" style="left:${x * 100 / N}%;top:${y * 100 / N}%;width:${100 / N}%;height:${100 / N}%"${an} aria-hidden="true">`
         + `<div class="dz3"><div class="dzv"><div class="dzc" style="transform:${matriz(s.o)}">${CARAS}</div></div></div></div>`
   }

   /* Se lanza tras dibujar (el HTML aún no está en la página cuando se llama a dado()): busca el dado marcado y lo anima desde la casilla anterior. */
   function animar(n) {
      const w = document.querySelector('.dzw[data-rd]');
      if (!w) { if (n < 3) requestAnimationFrame(() => animar(n + 1)); return }
      const d = w.dataset.rd, fo = w.dataset.rm.split('').map(Number), t = +w.dataset.rt || 0;
      w.removeAttribute('data-rd'); w.removeAttribute('data-rm'); w.removeAttribute('data-rt');
      if (!w.animate || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      const c = w.querySelector('.dzc'), m = matriz(fo), o = { duration: DUR, easing: 'cubic-bezier(.4,.1,.3,1)' };
      [
         w.animate([{ translate: `${-DIRS[d][0] * 100}% ${-DIRS[d][1] * 100}%` }, { translate: '0% 0%' }], o),                                   // desliza desde la casilla anterior
         c.animate([{ transform: `${EJE[d].replace(/-?90deg/, '0deg')} ${m}` }, { transform: `${EJE[d]} ${m}` }], o),                           // gira 90° desde la orientación anterior
         c.animate([{ translate: '0px 0px 0px' }, { translate: `0px 0px ${c.offsetWidth * .3}px`, offset: .5 }, { translate: '0px 0px 0px' }], o)  // salta un poco
      ].forEach(a => { a.currentTime = t })
   }

   /* ----- Dibujo ----- */
   function svgTablero(Z, s, p) {
      const F = full(Z), vis = m => s.m & 1 << m, abre = s.m == F;
      let z = `<svg viewBox="0 0 ${N} ${N}" role="img" aria-label="Tablero del dado de ${N} por ${N}. El dado está en ${pos(s.i)} con el ${s.o[0]} arriba." style="display:block;width:100%;height:auto">`;
      for (let i = 0; i < T; i++) {
         const x = i % N, y = i / N | 0;
         z += `<rect class="${Z.R.has(i) ? 'ddr' : 'ddq'}" x="${x + .04}" y="${y + .04}" width=".92" height=".92" rx="${Z.R.has(i) ? .14 : .08}"/>`
      }
      // marca de salida
      z += `<circle class="ddi" cx="${Z.i0 % N + .5}" cy="${(Z.i0 / N | 0) + .5}" r=".08"/>`;
      // casillas con número
      Z.cp.forEach((c, k) => {
         const x = c.i % N, y = c.i / N | 0;
         z += `<rect class="ddn${vis(k) ? ' ok' : ''}" x="${x + .1}" y="${y + .1}" width=".8" height=".8" rx=".12"/><text class="ddt" x="${x + .5}" y="${y + .54}">${c.n}</text>`;
         if (vis(k)) z += `<path class="ddv" d="M${x + .7} ${y + .18}l.07.09.13-.18"/>`
      });
      // meta
      const gx = Z.meta % N, gy = Z.meta / N | 0;
      z += `<rect class="ddm${abre ? ' ok' : ''}" x="${gx + .1}" y="${gy + .1}" width=".8" height=".8" rx=".12"/><path class="ddf" d="M${gx + .38} ${gy + .76}V${gy + .22}M${gx + .38} ${gy + .24}L${gx + .74} ${gy + .37}L${gx + .38} ${gy + .5}z"/>`;
      // el dado ya no se dibuja aquí: es un cubo 3D encima del tablero (dado3d)
      return z + '</svg>'
   }

   const bt = (d, p) => `<button class="btn ddd2${p.pd == d ? ' pista' : ''}" data-a="ddm" data-d="${d}" aria-label="Rodar hacia ${NOM[d].replace('la ', '')}">${FL[d]}</button>`;
   function dado() {
      const p = prog('dd'); ini(p);
      const r = R('dado'), Z = P(), lost = r && r.st == 'lost', s = estado(Z, p.m), F = full(Z), vistas = Z.cp.filter((c, k) => s.m & 1 << k).length;
      const sh = lost ? { i: Z.meta, o: s.o, m: F } : s;                    // al rendirse el dado se muestra en la meta
      let b = `<div class="ddb" data-b="dado" style="--n:${N}">${svgTablero(Z, sh, p)}${dado3d(sh, p.g)}</div>`;
      b += `<span class="sr" role="status">Dado en ${pos(s.i)}: arriba ${s.o[0]}, norte ${s.o[1]}, sur ${7 - s.o[1]}, este ${s.o[2]}, oeste ${7 - s.o[2]}. Casillas con número pisadas: ${vistas} de ${Z.cp.length}.</span>`;
      if (lost) b += resRendida('Dado rodante', `Una solución de ${Z.sol.length} movimientos: ${[...Z.sol].map(d => FL[d]).join(' ')}. Vuelve mañana para un reto nuevo.`);
      else if (r) b += res(`¡Meta alcanzada en ${mmss(r.t)}!`, `${r.n} ${pls(r.n, 'movimiento', 'movimientos')} (el mínimo era ${Z.sol.length}). Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Dado #${DAY} · ${N}×${N} · ${r.n}/${Z.sol.length} mov.${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''} · ${mmss(r.t)}`);
      else b += `<div class="ddp" role="group" aria-label="Rodar el dado (también con las flechas del teclado)"><span></span>${bt('U', p)}<span></span>${bt('L', p)}${bt('D', p)}${bt('R', p)}</div>`
         + `<p class="cap" style="text-align:center;margin:0">Casillas con número pisadas: <b>${vistas} / ${Z.cp.length}</b> · Movimientos: <b>${p.n}</b></p>`
         + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, pista: 1, rendirme: 1 })}`
         + `<p class="foot" style="margin-top:8px;text-align:center">El dado enseña tres caras: <b>arriba</b>, <b>delante</b> (sur) y <b>derecha</b> (este). Las que no ves son sus opuestas: suman 7.</p>`;
      return shell('Dado rodante', b)
   }

   function mover(d) {
      if (R('dado')) return;
      const p = prog('dd'); ini(p); const Z = P(), q = paso(Z, estado(Z, p.m), d);
      if (!q.s) {
         msg = q.no == 'num' ? `Esa casilla exige un ${q.n} arriba y con ese movimiento saldría un ${q.t}.` : q.no == 'roca' ? 'Ahí hay una roca.' : 'No puedes salir del tablero.';
         Sfx.p('error'); return draw()
      }
      p.t0 = p.t0 || Date.now(); p.m += d; p.n++; p.pd = null; msg = ''; Sfx.p('tap', p.n % 5);
      if (q.s.i == Z.meta && q.s.m == full(Z)) { Sfx.p('acierto'); fin('dado', { st: 'completed', t: Date.now() - p.t0, n: p.n, par: Z.sol.length, h: p.h || 0, c: 0 }) }
      sv(); draw()
   }
   function ddm(b) { mover(b.dataset.d) }
   /* Deshacer = rodar hacia atrás: cuenta como un movimiento más (no se regala nada). */
   function undo() {
      const p = prog('dd'); ini(p);
      if (R('dado') || !p.m) return;
      p.m = p.m.slice(0, -1); p.n++; p.pd = null; msg = ''; sv(); draw()
   }
   function reiniciar() {
      const p = prog('dd'); ini(p);
      if (R('dado') || !p.m) return;
      p.m = ''; p.pd = null; msg = ''; sv(); draw()                       // el contador de movimientos, el tiempo y las pistas siguen contando
   }
   /* Pista: dice cuál es el mejor siguiente movimiento desde donde estás (no lo hace por ti). */
   function pista() {
      const p = prog('dd'); ini(p); if (R('dado')) return;
      const Z = P(), s = estado(Z, p.m), c = buscar(Z, s, false);
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1;
      if (!c) { msg = 'Pista: desde aquí no se llega. Reinicia.'; p.pd = null }
      else { p.pd = c[0]; msg = `Pista: el mejor movimiento ahora es hacia ${NOM[c[0]]} (${c.length} ${pls(c.length, 'movimiento', 'movimientos')} para terminar).` }
      sv(); draw()
   }
   function rendirse() { if (R('dado')) return; const p = prog('dd'); fin('dado', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw() }

   /* Flechas del teclado (el juego se las queda: ver `flechas: true`). */
   document.addEventListener('keydown', e => {
      const g = typeof cur == 'function' && cur(); if (!g || g.id != 'dado' || R('dado') || e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest('input,textarea,select'))) return;
      const d = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' }[e.key]; if (!d) return;
      e.preventDefault(); mover(d)
   });

   DailyArcade.register({
      id: 'dado', name: 'Dado rodante', desc: 'Haz rodar el dado por el tablero cumpliendo las casillas con número hasta llegar a la meta.', color: '--sky', tag: 'Rueda el dado hasta la meta', flechas: true,
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
      how: ['Haz rodar el dado por el tablero con las <b>flechas</b> o los botones. En un dado, las caras opuestas suman <b>7</b>.', 'Una casilla con número solo se pisa con <b>ese número arriba</b>. Hay que pisar <b>todas</b> (en cualquier orden) y después llegar a la <b>bandera</b>.', 'Las <b>rocas</b> bloquean el paso. Cuenta cada movimiento: intenta acercarte al <b>mínimo</b>.'],
      /* Ejemplo: el dado (1 arriba, 5 delante, 3 a la derecha) rueda dos veces a la derecha. Las caras salen de rueda(): 1 → 4 → 6, y pisa las casillas «4» y «6». */
      demo: (() => {
         const f = "font-family:'Bricolage Grotesque',system-ui,sans-serif;text-anchor:middle", S = 38, D = 15;
         const pips = v => PIPS[v].map(([r, c]) => `<circle cx="${((c * 2 - 1) / 6).toFixed(3)}" cy="${((r * 2 - 1) / 6).toFixed(3)}" r=".1" style="fill:var(--on-sky)"/>`).join('');
         // un cubo oblicuo con tres caras visibles: arriba, delante (sur) y derecha (este); x, y = esquina superior izquierda de la cara de delante
         const cubo = (x, y, [t, n, e]) => {
            const cara = (m, v, sombra) => `<g transform="matrix(${m})"><rect width="1" height="1" style="fill:var(--sky);stroke:var(--ink);stroke-width:${(2 / S).toFixed(3)};stroke-linejoin:round"/>`
               + (sombra ? `<rect width="1" height="1" style="fill:${sombra}"/>` : '') + pips(v) + '</g>';
            return cara(`${S} 0 ${-D} ${D} ${x + D} ${y - D}`, t, 'rgb(255 255 255 / .22)')                 // arriba
               + cara(`${S} 0 0 ${S} ${x} ${y}`, 7 - n)                                                       // delante (sur = 7 − norte)
               + cara(`${D} ${-D} 0 ${S} ${x + S} ${y}`, e, 'rgb(0 0 0 / .16)')                               // derecha
         };
         const O1 = rueda(O0, 'R'), PASOS = [O0, O1, rueda(O1, 'R')];                                         // [1,2,3] → [4,2,1] → [6,2,4]
         const celda = (i, num) => {
            const x0 = 8 + i * 110, y0 = 14, ok = i > 0;
            let s = `<rect x="${x0}" y="${y0}" width="84" height="84" rx="9" style="fill:${ok ? 'color-mix(in srgb,var(--mint) 30%,var(--card))' : 'var(--card)'};stroke:${ok ? 'var(--mint)' : 'var(--edge)'};stroke-width:${ok ? 3 : 2}${ok ? '' : ';stroke-dasharray:5 4'}"/>`;
            if (num) s += `<circle cx="${x0 + 14}" cy="${y0 + 14}" r="11" style="fill:var(--card);stroke:var(--ink);stroke-width:2"/><text x="${x0 + 14}" y="${y0 + 19}" style="${f};fill:var(--ink);font-weight:800;font-size:14px">${num}</text>`;
            return s + cubo(x0 + (84 - S - D) / 2, y0 + (84 - S - D) / 2 + D + 2, PASOS[i])
         };
         const fl = x => `<path d="M${x} 56h16m-6-6l6 6-6 6" style="fill:none;stroke:var(--ink);stroke-width:3;stroke-linecap:round;stroke-linejoin:round"/>`;
         const z = `<svg viewBox="0 0 320 112" role="img" aria-label="Ejemplo del dado rodante. El dado empieza con el 1 arriba y el 3 a la derecha. Al rodar a la derecha queda el 4 arriba y pisa la casilla 4. Al rodar otra vez a la derecha queda el 6 arriba y pisa la casilla 6." style="display:block;width:100%;max-width:330px;margin:4px auto">`
            + celda(0) + fl(94) + celda(1, 4) + fl(204) + celda(2, 6) + '</svg>';
         return `<p class="cap">Ejemplo: el dado rueda <b>dos veces a la derecha</b>.</p>${z}`
            + `<p class="cap">Al rodar a la derecha, la cara de la <b>izquierda</b> pasa arriba (es la opuesta a la de la derecha: <b>7 − 3 = 4</b>). Por eso puedes pisar la casilla <b>4</b> y, después, la <b>6</b>.</p>`
      })(),
      pk: 'dd',
      render: dado,
      actions: { ddm, undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Completada · ${r.n}/${r.par} movimientos · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
