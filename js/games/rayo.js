/* Juego: Rayo — un láser sale del emisor (a la izquierda) y hay que colocar espejos en una cuadrícula de 6×6 para que pase
   por todas las gemas y salga por la salida. Hay una cantidad limitada de espejos (la mínima que permite lograrlo) y algunos
   bloques que absorben el rayo. Un toque pone un espejo «/», otro lo gira a «\» y otro lo quita. El rayo se dibuja al momento.
   El reto sale de la fecha. Se colocan espejos al azar, se traza el láser, se ponen gemas en su camino y la salida donde
   termina; después se BUSCA POR FUERZA BRUTA (siguiendo el rayo y probando en cada casilla «nada», «/» o «\») la cantidad
   mínima de espejos que lo resuelve y todas las formas de hacerlo con ese mínimo: solo se aceptan retos con pocas soluciones.
   La victoria se comprueba por reglas (el rayo enciende todas las gemas, sale por la salida y no sobran espejos),
   no contra una solución guardada. */
(function () {
   const NG = 6, NN = NG * NG, LIM = 300000;                              // lado, casillas y tope de nodos de la búsqueda
   const FACIL = WD == 1 || WD == 2;                                       // lunes y martes: menos espejos, menos gemas y menos bloques
   const [MLO, MHI, GLO, GHI, BLQ] = FACIL ? [3, 4, 2, 3, 3] : [4, 5, 3, 4, 4];   // espejos (mín. y máx.), gemas y bloques
   const pls = (n, a, b) => n == 1 ? a : b;

   /* Dirección tras un espejo: «/» (1) y «\» (2). El eje y crece hacia abajo. */
   const rebota = (k, dx, dy) => k == 1 ? [-dy, -dx] : [dy, dx];
   const lado = (dx, dy) => dx > 0 ? 'E' : dx < 0 ? 'W' : dy > 0 ? 'S' : 'N';

   /* Traza el láser de la situación Z (n, r0 = fila del emisor, walls, gems) con los espejos m (m[i] = 0, 1 o 2).
      Devuelve los puntos del rayo (en unidades de casilla), las casillas que toca y por dónde sale (null si lo absorbe un bloque). */
   function trazar(Z, m) {
      const n = Z.n, B = new Set(Z.walls), pts = [[0, Z.r0 + .5]], vis = new Set();
      let x = 0, y = Z.r0, dx = 1, dy = 0, salida = null;
      for (let s = 0; s < 4 * n * n; s++) {
         vis.add(y * n + x);
         if (m[y * n + x]) { pts.push([x + .5, y + .5]);[dx, dy] = rebota(m[y * n + x], dx, dy) }
         const nx = x + dx, ny = y + dy;
         if (nx < 0 || ny < 0 || nx >= n || ny >= n) { pts.push([x + .5 + dx * .5, y + .5 + dy * .5]); salida = { s: lado(dx, dy), i: dx ? y : x }; break }
         if (B.has(ny * n + nx)) { pts.push([x + .5 + dx * .5, y + .5 + dy * .5]); break }
         x = nx; y = ny
      }
      return { pts, vis, salida }
   }
   const llega = (T, Z) => !!T.salida && T.salida.s == Z.exit.s && T.salida.i == Z.exit.i;
   const todas = (T, Z) => Z.gems.every(g => T.vis.has(g));

   /* Búsqueda por fuerza bruta: sigue el rayo y en cada casilla nueva prueba «nada», «/» y «\» (los espejos gastan presupuesto).
      Va subiendo el presupuesto K de espejos: el primero que tiene soluciones es el mínimo. Devuelve { K, sols } (todas las
      formas de lograrlo con K espejos) o null si no hay solución con hasta kmax o la búsqueda se pasa de tope. */
   function resolver(Z, kmax) {
      const n = Z.n, B = new Set(Z.walls), G = new Map(Z.gems.map((g, k) => [g, 1 << k])), full = (1 << Z.gems.length) - 1;
      let nodos = 0;
      for (let K = 0; K <= kmax; K++) {
         const dec = Array(n * n).fill(-1), sols = []; let corta = false;
         (function marcha(x, y, dx, dy, usados, mask, pasos) {
            if (corta) return;
            if (++nodos > LIM) { corta = true; return }
            if (pasos > 4 * n * n) return;
            const i = y * n + x; if (G.has(i)) mask |= G.get(i);
            const sigue = (ax, ay, u) => {
               const nx = x + ax, ny = y + ay;
               if (nx < 0 || ny < 0 || nx >= n || ny >= n) { if (mask == full && lado(ax, ay) == Z.exit.s && (ax ? y : x) == Z.exit.i) sols.push(dec.map(v => v > 0 ? v : 0)); return }
               if (B.has(ny * n + nx)) return;
               marcha(nx, ny, ax, ay, u, mask, pasos + 1)
            };
            if (dec[i] >= 0) { if (!dec[i]) sigue(dx, dy, usados); else { const [ax, ay] = rebota(dec[i], dx, dy); sigue(ax, ay, usados) } return }
            dec[i] = 0; sigue(dx, dy, usados);
            if (usados < K) { for (const k of [1, 2]) { dec[i] = k; const [ax, ay] = rebota(k, dx, dy); sigue(ax, ay, usados + 1) } }
            dec[i] = -1
         })(0, Z.r0, 1, 0, 0, 0, 0);
         if (corta) return null;
         if (sols.length) return { K, sols }
      }
      return null
   }

   function gen() {
      const r = rng(SD * 83 + 13), rnd = n => Math.floor(r() * n), n = NG;
      for (let t = 0; t < 4000; t++) {
         // 1) espejos al azar y rayo resultante (sin bloques ni gemas todavía)
         const m = Array(NN).fill(0), r0 = rnd(n), quiere = MLO + rnd(MHI - MLO + 1);
         shuf([...Array(NN).keys()], r).slice(0, quiere + 3).forEach((i, k) => { m[i] = 1 + rnd(2) });
         const base = { n, r0, walls: [], gems: [] }, T = trazar(base, m);
         if (!T.salida || (T.salida.s == 'W' && T.salida.i == r0)) continue;
         // 2) solo cuentan los espejos que toca el rayo
         for (let i = 0; i < NN; i++)if (!T.vis.has(i)) m[i] = 0;
         const usados = m.filter(v => v).length; if (usados < MLO || usados > MHI || T.vis.size < 10) continue;
         // 3) gemas sobre casillas del camino sin espejo y fuera de la recta inicial del láser (así ninguna empieza encendida); bloques fuera del camino
         const T0 = trazar(base, Array(NN).fill(0)), camino = shuf([...T.vis].filter(i => !m[i] && !T0.vis.has(i)), r), fuera = shuf([...Array(NN).keys()].filter(i => !T.vis.has(i)), r), g = GLO + rnd(GHI - GLO + 1);
         if (camino.length < g || fuera.length < BLQ) continue;
         const Z = { n, r0, exit: T.salida, gems: camino.slice(0, g).sort((a, b) => a - b), walls: fuera.slice(0, BLQ).sort((a, b) => a - b) };
         // 4) mínimo de espejos y soluciones por fuerza bruta
         const R = resolver(Z, usados);
         if (R && R.K >= MLO && R.sols.length <= 3) return { ...Z, K: R.K, sols: R.sols }
      }
      // reserva (nunca debería hacer falta): un espejo y una gema
      const Z = { n, r0: 1, exit: { s: 'N', i: 2 }, gems: [2], walls: [] }, R = resolver(Z, 2); return { ...Z, K: R.K, sols: R.sols }
   }
   const P = memoSD(gen); // se regenera si cambia la semilla (SD): reto del día o ronda de duelo

   /* Progreso: p.m[i] = espejo en la casilla i (0 nada, 1 «/», 2 «\») · p.lk = { casilla: espejo } fijados por una pista · p.h = pistas. */
   const ini = p => { if (!Array.isArray(p.m)) { p.m = Array(NN).fill(0); p.lk = {}; p.h = 0 } };
   const usados = m => m.filter(v => v).length;
   const refija = p => Object.entries(p.lk).forEach(([i, v]) => p.m[i] = v);

   const GEMA = '<svg class="ryk" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.2L8.8 5L5 8.8L1.2 5Z"/><path class="ryb2" d="M5 3.2L6.8 5L5 6.8L3.2 5Z"/></svg>';
   const ESPEJO = k => `<svg class="rym" viewBox="0 0 10 10" aria-hidden="true"><path d="${k == 1 ? 'M2 8L8 2' : 'M2 2L8 8'}"/></svg>`;

   /* Dibuja un tablero n×n de la situación Z con los espejos m. Si vivo, las casillas son botones. */
   function tablero(Z, m, vivo, lk) {
      const n = Z.n, T = trazar(Z, m), V = n + 2, B = new Set(Z.walls), G = new Set(Z.gems), ok = llega(T, Z);
      const celda = i => {
         const y = Math.floor(i / n), x = i % n, k = m[i], pos = `Fila ${y + 1}, columna ${x + 1}`;
         if (B.has(i)) return vivo ? `<button class="ryc" disabled aria-label="${pos}: bloque que absorbe el rayo"><span class="ryw"></span></button>` : `<span class="ryc"><span class="ryw"></span></span>`;
         if (G.has(i)) { const on = T.vis.has(i); return vivo ? `<button class="ryc${on ? ' lit' : ''}" disabled aria-label="${pos}: gema ${on ? 'encendida' : 'apagada'}">${GEMA}</button>` : `<span class="ryc${on ? ' lit' : ''}">${GEMA}</span>` }
         const fx = vivo && lk[i] ? ' fx' : '';
         return vivo ? `<button class="ryc${fx}" data-a="rc" data-i="${i}" aria-label="${pos}: ${k ? 'espejo ' + (k == 1 ? '/' : '\\') : 'vacío'}${fx ? ', fijado por una pista' : ''}">${k ? ESPEJO(k) : ''}</button>` : `<span class="ryc">${k ? ESPEJO(k) : ''}</span>`
      };
      const e = Z.exit, cx = e.s == 'E' ? n + 1.5 : e.s == 'W' ? .5 : e.i + 1.5, cy = e.s == 'N' ? .5 : e.s == 'S' ? n + 1.5 : e.i + 1.5;
      const ult = T.pts[T.pts.length - 1], ext = T.salida ? { E: [.2, 0], W: [-.2, 0], S: [0, .2], N: [0, -.2] }[T.salida.s] : [0, 0];
      const pts = [[-.18, Z.r0 + .5], ...T.pts, ...(T.salida ? [[ult[0] + ext[0], ult[1] + ext[1]]] : [])].map(([x, y]) => `${(x + 1).toFixed(2)},${(y + 1).toFixed(2)}`).join(' ');
      return `<div class="ryb" role="group" aria-label="Tablero de ${n} por ${n}. El láser sale por la izquierda en la fila ${Z.r0 + 1}; la salida está en el lado ${{ E: 'derecho', W: 'izquierdo', N: 'de arriba', S: 'de abajo' }[e.s]}, posición ${e.i + 1}.">`
         + `<div class="ryg" style="--n:${n}">${Array.from({ length: n * n }, (_, i) => celda(i)).join('')}</div>`
         + `<svg class="ryo" viewBox="0 0 ${V} ${V}" aria-hidden="true"><polyline class="ryl" points="${pts}"/>`
         + `<rect class="rye" x=".1" y="${Z.r0 + 1.18}" width=".66" height=".64" rx=".14"/><circle class="ryx${ok ? ' ok' : ''}" cx="${cx}" cy="${cy}" r=".3"/><circle class="ryx2${ok ? ' ok' : ''}" cx="${cx}" cy="${cy}" r=".11"/></svg></div>`
   }

   function rayo() {
      const p = prog('ry'); ini(p);
      const r = R('rayo'), Z = P(), lost = r && r.st == 'lost', m = lost ? Z.sols[0] : p.m, T = trazar(Z, m);
      const enc = Z.gems.filter(g => T.vis.has(g)).length;
      let b = `<div data-rv="ry-tab">${tablero(Z, m, !r, p.lk)}</div>`;
      b += `<p class="cap" style="text-align:center;margin:0" aria-live="polite">Espejos: <b>${usados(m)}</b> de ${Z.K} · Gemas encendidas: <b>${enc}</b> de ${Z.gems.length}</p>`;
      if (lost) b += resRendida('Rayo', `Así pasaba el láser por todas las gemas con ${Z.K} espejos. Vuelve mañana para un reto nuevo.`);
      else if (r) b += res(`¡Rayo en la salida en ${mmss(r.t)}!`, `Todas las gemas encendidas con ${Z.K} espejos, el mínimo. Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Rayo #${DAY} · ${mmss(r.t)}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}`);
      else b += `<p class="cap" style="text-align:center;margin:0">Toca una casilla: espejo «/», espejo «\\» o vacía. Las gemas se encienden cuando las toca el rayo; la salida, cuando llega.</p>`
         + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, pista: 1, rendirme: 1 })}`;
      return shell('Rayo', b)
   }

   /* Después de cada cambio: ¿el rayo enciende todas las gemas, sale por la salida y no hay más espejos de los permitidos? */
   function revisa(p) {
      const Z = P(), T = trazar(Z, p.m);
      if (llega(T, Z) && todas(T, Z) && usados(p.m) <= Z.K) fin('rayo', { st: 'completed', t: Date.now() - p.t0, h: p.h || 0, c: 0 })
   }

   function rc(b) {
      if (R('rayo')) return;
      const p = prog('ry'); ini(p); p.t0 = p.t0 || Date.now(); const i = +b.dataset.i, Z = P();
      if (p.lk[i]) { msg = 'Ese espejo lo fijó una pista y no se puede mover.'; Sfx.p('error'); return draw() }
      const k = (p.m[i] + 1) % 3;
      if (!p.m[i] && usados(p.m) >= Z.K) { msg = `Solo tienes ${Z.K} espejos: quita alguno para poner otro.`; Sfx.p('error'); return draw() }
      hist.push(p.m.slice()); p.m[i] = k; msg = ''; Sfx.p(k ? 'pon' : 'borra', k + 1);
      revisa(p); sv(); draw()
   }

   function undo() {
      const p = prog('ry'); ini(p);
      if (R('rayo') || !hist.length) return;
      p.m = hist.pop(); refija(p); msg = ''; sv(); draw()
   }

   function reiniciar() {
      const p = prog('ry'); ini(p);
      if (R('rayo')) return;
      const antes = p.m.slice(); p.m = Array(NN).fill(0); refija(p);
      if (antes.join('') == p.m.join('')) return;
      hist.push(antes); msg = ''; sv(); draw()   // el tiempo y las pistas siguen contando
   }

   /* Pista: pone y fija un espejo de la solución más parecida a lo que ya hay (quitando antes uno que sobre si no quedan espejos). */
   function pista() {
      const p = prog('ry'); ini(p);
      if (R('rayo')) return;
      const Z = P(), ok = s => Object.entries(p.lk).every(([i, v]) => s[i] == v), cand = Z.sols.filter(ok), lista = cand.length ? cand : Z.sols;
      const afin = s => s.reduce((a, v, i) => a + (v && v == p.m[i] ? 1 : 0), 0), sol = lista.reduce((a, s) => afin(s) > afin(a) ? s : a, lista[0]);
      const i = sol.findIndex((v, k) => v && p.m[k] != v);
      if (i < 0) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; hist.push(p.m.slice());
      if (!p.m[i] && usados(p.m) >= Z.K) { const j = p.m.findIndex((v, k) => v && !sol[k] && !p.lk[k]); if (j >= 0) p.m[j] = 0 }
      p.m[i] = sol[i]; p.lk[i] = sol[i];
      msg = `Pista: va un espejo «${sol[i] == 1 ? '/' : '\\'}» en la fila ${Math.floor(i / NG) + 1}, columna ${i % NG + 1}.`;
      revisa(p); sv(); draw()
   }

   function rendirse() {
      if (R('rayo')) return;
      const p = prog('ry'); fin('rayo', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw()
   }

   /* Ejemplo de «Cómo se juega»: tablero de 4×4, un espejo «/» en la fila 2 y una gema encima; el rayo sube y sale por arriba. */
   const EJ = { n: 4, r0: 1, exit: { s: 'N', i: 2 }, gems: [2], walls: [] }, EJM = Array(16).fill(0); EJM[6] = 1;

   DailyArcade.register({
      id: 'rayo', name: 'Rayo', desc: 'Guía el láser con espejos por todas las gemas.', color: '--sun', tag: 'Guía el láser con espejos',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="14.5" width="3" height="5" rx="1"/><path d="M5.5 17h9.5V4"/><path d="M11.5 20.5l7-7"/></svg>',
      how: ['Un <b>láser</b> sale del emisor, a la izquierda. Coloca <b>espejos</b> para que pase por todas las <b>gemas</b> y llegue a la <b>salida</b>.', 'Toca una casilla: espejo <b>/</b>, espejo <b>\\</b> o vacía. Los <b>bloques</b> negros absorben el rayo y tienes un número limitado de espejos.', 'El rayo se dibuja mientras juegas. Si te atascas, la <b>pista</b> coloca y fija un espejo.'],
      demo: `<div class="ryd" aria-hidden="true">${tablero(EJ, EJM, false, {})}</div><p class="cap">El láser entra por la izquierda, rebota en el espejo, enciende la gema y sale por la salida: con <b>1 espejo</b>.</p>`,
      pk: 'ry',
      render: rayo,
      actions: { rc, undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Resuelto · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
