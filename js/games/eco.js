/* Juego: Eco — dos tableros con rocas distintas: en el de la izquierda estás tú y en el de la derecha, tu Eco. Cada movimiento que haces lo repite el Eco
   EN ESPEJO: si tú vas a la izquierda, él va a la derecha; arriba y abajo son iguales para los dos. Si uno de los dos tropieza con una roca o el borde, se
   queda quieto mientras el otro sí se mueve. Hay que dejar a los dos a la vez sobre sus salidas (el aro de cada tablero).
   El reto sale de la fecha. Se colocan rocas al azar en los dos tableros, y se BUSCA POR ANCHURA sobre las parejas de posiciones (tú, Eco) el menor número de
   movimientos que lleva a los dos a la salida. Solo se aceptan retos que se pueden resolver, con un mínimo largo, y que no sean «cada uno por su lado»:
   el mínimo tiene que ser claramente mayor que lo que necesitaría cada uno por separado. Lunes y martes: 5×5; el resto, 6×6.
   La victoria se comprueba por reglas (los dos en su salida), no contra una solución guardada. */
(function () {
   const N = WD == 1 || WD == 2 ? 5 : 6, NN = N * N;
   const [KLO, KHI, RLO, RHI] = N == 5 ? [9, 16, 5, 8] : [12, 22, 7, 11];  // mínimo de movimientos (mín. y máx.) y rocas por tablero (mín. y máx.)
   const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }, FL = { U: '↑', D: '↓', L: '←', R: '→' }, NOM = { U: 'arriba', D: 'abajo', L: 'la izquierda', R: 'la derecha' };
   const pls = (n, a, b) => n == 1 ? a : b;

   /* Casilla a la que va el personaje i con las rocas B al mover en la dirección d (esp: el Eco, que refleja izquierda/derecha). Si no puede, se queda. */
   function mueve(B, i, d, esp) {
      const x = i % N, y = Math.floor(i / N), [dx, dy] = DIRS[d], nx = x + (esp ? -dx : dx), ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) return i;
      const j = ny * N + nx; return B.has(j) ? i : j
   }
   /* Anchura sobre las parejas (tú, Eco) desde a0, b0: devuelve el camino más corto como texto de direcciones ('' si ya están; null si no se puede). */
   function resolver(Z, a0, b0) {
      const meta = Z.e1 * NN + Z.e2, ant = new Int32Array(NN * NN).fill(-2), dir = new Array(NN * NN), cola = [a0 * NN + b0]; ant[cola[0]] = -1;
      for (let h = 0; h < cola.length; h++) {
         const s = cola[h]; if (s == meta) { let o = ''; for (let q = s; ant[q] >= 0; q = ant[q]) o = dir[q] + o; return o }
         const a = Math.floor(s / NN), b = s % NN;
         for (const d of 'UDLR') { const a2 = mueve(Z.B1, a, d, false), b2 = mueve(Z.B2, b, d, true), t = a2 * NN + b2; if (ant[t] == -2) { ant[t] = s; dir[t] = d; cola.push(t) } }
      }
      return null
   }
   /* Lo que tardaría un personaje él solo (esp: el Eco) en llegar a su salida. */
   function solo(B, s, e, esp) {
      const dist = new Map([[s, 0]]), cola = [s];
      for (let h = 0; h < cola.length; h++) { const a = cola[h]; if (a == e) return dist.get(a); for (const d of 'UDLR') { const q = mueve(B, a, d, esp); if (!dist.has(q)) { dist.set(q, dist.get(a) + 1); cola.push(q) } } }
      return Infinity
   }

   function gen() {
      const r = rng(SD * 53 + 29), rnd = n => Math.floor(r() * n);
      for (let t = 0; t < 6000; t++) {
         const tabla = () => { const rocas = shuf([...Array(NN).keys()], r), k = RLO + rnd(RHI - RLO + 1), libres = rocas.slice(k); return { B: new Set(rocas.slice(0, k)), s: libres[0], e: libres[1] } };
         const A = tabla(), E = tabla();
         if (A.s == A.e || E.s == E.e) continue;
         const Z = { n: N, B1: A.B, B2: E.B, s1: A.s, e1: A.e, s2: E.s, e2: E.e }, sol = resolver(Z, Z.s1, Z.s2);
         if (sol == null || sol.length < KLO || sol.length > KHI) continue;
         if (sol.length < Math.max(solo(Z.B1, Z.s1, Z.e1, false), solo(Z.B2, Z.s2, Z.e2, true)) + 3) continue;   // que haya que coordinar a los dos
         return { ...Z, sol }
      }
      // reserva (nunca debería hacer falta): sin rocas, cada uno a su salida
      const Z = { n: N, B1: new Set(), B2: new Set(), s1: 0, e1: NN - 1, s2: N - 1, e2: NN - N }; return { ...Z, sol: resolver(Z, Z.s1, Z.s2) }
   }
   const P = memoSD(gen);                                                    // se regenera si cambia la semilla (SD)

   /* Progreso: p.a = tu casilla · p.b = la del Eco · p.m = movimientos · p.h = pistas. */
   const ini = p => { const Z = P(); if (typeof p.a != 'number' || p.s1 !== Z.s1) { p.a = Z.s1; p.b = Z.s2; p.m = 0; p.h = 0; p.s1 = Z.s1 } };
   const pos = i => `fila ${Math.floor(i / N) + 1}, columna ${i % N + 1}`;

   /* Un tablero en SVG: rocas, salida (aro) y personaje. */
   function tab(B, e, i, cl, nombre, ult) {
      let s = '';
      for (let k = 0; k < NN; k++) { const x = k % N, y = Math.floor(k / N); s += `<rect class="${B.has(k) ? 'ecb' : 'ecq'}" x="${x + .04}" y="${y + .04}" width=".92" height=".92" rx="${B.has(k) ? .14 : .08}"/>` }
      const ex = e % N + .5, ey = Math.floor(e / N) + .5, ix = i % N + .5, iy = Math.floor(i / N) + .5;
      s += `<circle class="ece ${cl}${i == e ? ' ok' : ''}" cx="${ex}" cy="${ey}" r=".36"/><circle class="ect ${cl}" cx="${ix}" cy="${iy}" r=".27"/>${i == e ? `<path class="ecv" d="M${ix - .12} ${iy}l.09 .1l.17-.2"/>` : ''}`;
      const est = !ult ? '' : ult[0] ? `<span class="ecs">${FL[ult[1]]}</span>` : '<span class="ecs ecs-x">choca ✕</span>';
      return `<figure class="ecf"><svg viewBox="0 0 ${N} ${N}" role="img" aria-label="${nombre}: estás en ${pos(i)}; tu salida está en ${pos(e)}. ${B.size} rocas.">${s}</svg><figcaption>${nombre}${i == e ? ' <span class="ecs ecs-ok">en la salida</span>' : est}</figcaption></figure>`
   }

   function eco() {
      const p = prog('ec'); ini(p);
      const r = R('eco'), Z = P(), lost = r && r.st == 'lost';
      const L = p.l && !r ? p.l : null, du = L ? L[1] : null, de = L ? { L: 'R', R: 'L', U: 'U', D: 'D' }[L[1]] : null, en = (p.a == Z.e1) + (p.b == Z.e2);
      let b = `<div class="ddb eck"><div class="ecg"><span class="ecg-n" aria-live="polite">Movimientos <b>${p.m}</b> · ${r && !lost ? 2 : en}/2 en salida</span></div>`
         + `<div class="ecw">${tab(Z.B1, Z.e1, p.a, 'u1', 'Tú', L && [L[2], du])}${tab(Z.B2, Z.e2, p.b, 'u2', 'Eco', L && [L[3], de])}</div></div>`;
      if (lost) b += resRendida('Eco', `El mínimo eran ${Z.sol.length} movimientos: ${[...Z.sol].map(d => FL[d]).join(' ')}. Vuelve mañana para un reto nuevo.`);
      else if (r) b += res(`¡Los dos en la salida en ${mmss(r.t)}!`, `${r.m} ${pls(r.m, 'movimiento', 'movimientos')} (el mínimo era ${Z.sol.length}). Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Eco #${DAY} · ${mmss(r.t)} · ${r.m}/${Z.sol.length} mov.${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}`);
      else b += `<div class="ecp" role="group" aria-label="Mover (también con las flechas del teclado)"><span></span>${bt('U', Z, p)}<span></span>${bt('L', Z, p)}${bt('D', Z, p)}${bt('R', Z, p)}</div>`
         + `<p class="cap" style="text-align:center;margin:0">El Eco copia tus movimientos <b>en espejo</b>: si vas a la izquierda, él va a la derecha.</p>`
         + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, pista: 1, rendirme: 1 })}`;
      return shell('Eco', b)
   }
   const bt = (d, Z, p) => `<button class="btn ecd" data-a="ecm" data-d="${d}"${mueve(Z.B1, p.a, d, false) == p.a && mueve(Z.B2, p.b, d, true) == p.b ? ' disabled' : ''} aria-label="Mover hacia ${NOM[d].replace('la ', '')}">${FL[d]}</button>`;

   function mover(d) {
      if (R('eco')) return;
      const p = prog('ec'); ini(p); const Z = P(), a = mueve(Z.B1, p.a, d, false), b = mueve(Z.B2, p.b, d, true);
      if (a == p.a && b == p.b) { msg = 'Ninguno de los dos puede moverse en esa dirección.'; Sfx.p('error'); return draw() }
      p.t0 = p.t0 || Date.now(); hist.push([p.a, p.b, p.m]); p.l = [0, d, a != p.a, b != p.b]; p.a = a; p.b = b; p.m++; msg = ''; Sfx.p('tap', p.m % 5);
      if (a == Z.e1 && b == Z.e2) { Sfx.p('acierto'); fin('eco', { st: 'completed', t: Date.now() - p.t0, m: p.m, h: p.h || 0, c: 0 }) }
      sv(); draw()
   }
   function ecm(b) { mover(b.dataset.d) }
   function undo() { const p = prog('ec'); ini(p); if (R('eco') || !hist.length) return; [p.a, p.b, p.m] = hist.pop(); p.l = null; msg = ''; sv(); draw() }
   function reiniciar() { const p = prog('ec'); ini(p); if (R('eco') || !p.m) return; const Z = P(); hist.push([p.a, p.b, p.m]); p.a = Z.s1; p.b = Z.s2; p.m = 0; p.l = null; msg = ''; sv(); draw() }   // el tiempo y las pistas siguen contando
   /* Pista: dice cuál es el mejor siguiente movimiento desde donde estás (no lo hace por ti). Si desde aquí ya no se puede llegar, avisa de que hay que deshacer. */
   function pista() {
      const p = prog('ec'); ini(p); if (R('eco')) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1;
      const s = resolver(P(), p.a, p.b);
      msg = s == null ? 'Pista: desde aquí ya no se puede llegar. Deshaz o reinicia.' : `Pista: el mejor movimiento ahora es hacia ${NOM[s[0]]} (${s.length} ${pls(s.length, 'movimiento', 'movimientos')} para terminar).`;
      sv(); draw()
   }
   function rendirse() { if (R('eco')) return; const p = prog('ec'); fin('eco', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw() }

   /* Flechas del teclado (el juego se las queda: ver `flechas: true`). */
   document.addEventListener('keydown', e => {
      const g = cur(); if (!g || g.id != 'eco' || R('eco') || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,select')) return;
      const d = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' }[e.key]; if (!d) return;
      e.preventDefault(); mover(d)
   });

   DailyArcade.register({
      id: 'eco', name: 'Eco', desc: 'Lleva a tu reflejo y a ti a la salida a la vez.', color: '--lav', tag: 'Tú y tu reflejo, a la salida', flechas: true,
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/><path d="M12 4v16" stroke-dasharray="2 3"/></svg>',
      how: ['Hay <b>dos tableros</b>: en el de la izquierda estás tú y en el de la derecha, tu <b>Eco</b>. Llega con los dos a la <b>salida</b> (el aro) a la vez.', 'Cada movimiento lo repite el Eco <b>en espejo</b>: si vas a la <b>izquierda</b>, él va a la <b>derecha</b>. Arriba y abajo son iguales.', 'Si uno choca con una <b>roca</b> o el borde, se queda quieto mientras el otro se mueve. Usa las flechas del teclado o los botones.'],
      /* Ejemplo: pulsas → con dos tableros 3×3. Tú avanzas a la derecha; el Eco iría a la izquierda pero choca con una roca y se queda. Mismas clases que los tableros (ecq, ecb, ece, ect). */
      demo: (() => {
         const f = "font-family:'Bricolage Grotesque',system-ui,sans-serif;text-anchor:middle";
         const tablero = (x, rocas, salida, yo, cl) => {
            let s = `<g transform="translate(${x} 0)"><rect x="-.04" y="-.04" width="3.08" height="3.08" rx=".18" style="fill:var(--card);stroke:var(--ink);stroke-width:.09"/>`;
            for (let k = 0; k < 9; k++) { const cx = k % 3, cy = k / 3 | 0; s += `<rect class="${rocas.includes(k) ? 'ecb' : 'ecq'}" x="${cx + .04}" y="${cy + .04}" width=".92" height=".92" rx="${rocas.includes(k) ? .14 : .08}"/>` }
            return s + `<circle class="ece" cx="${salida % 3 + .5}" cy="${(salida / 3 | 0) + .5}" r=".34"/><circle class="ect ${cl}" cx="${yo % 3 + .5}" cy="${(yo / 3 | 0) + .5}" r=".24"/></g>`
         };
         const fl = (x1, x2, y) => `<path d="M${x1} ${y}H${x2}M${x2 + (x2 > x1 ? -.2 : .2)} ${y - .17}L${x2} ${y}L${x2 + (x2 > x1 ? -.2 : .2)} ${y + .17}" style="fill:none;stroke:var(--ink);stroke-width:.09;stroke-linecap:round;stroke-linejoin:round"/>`;
         const lab = (x, t) => `<text x="${x}" y="3.82" style="${f};fill:var(--ink);font-weight:800;font-size:.55px">${t}</text>`;
         // tú: casilla 3 (fila 1, col. 0), salida 2 (arriba a la derecha), roca en 7 · Eco: casilla 5, salida 0 (arriba a la izquierda), rocas en 4 y 6
         const marco = (ya, eco, extra, lbl) => `<svg viewBox="-.1 -.1 7.4 4.1" role="img" aria-label="${lbl}">${tablero(0, [7], 2, ya, 'u1')}${tablero(4.2, [4, 6], 0, eco, 'u2')}${lab(1.5, 'Tú')}${lab(5.7, 'Eco')}${extra}</svg>`;
         const antes = marco(3, 5, fl(.95, 1.4, 1.5) + fl(6.35, 5.85, 1.5), 'Antes: tú estás en la casilla de la izquierda del tablero izquierdo y el Eco, a la derecha del tablero derecho, con una roca justo a su izquierda.');
         const despues = marco(4, 5, `<path d="M5.5 1.3l.4.4m0-.4l-.4.4" style="fill:none;stroke:var(--berry);stroke-width:.13;stroke-linecap:round"/>`, 'Después de pulsar la flecha derecha: tú has avanzado una casilla y el Eco no se ha movido porque chocaba con la roca.');
         return `<p class="cap">Pulsas <b>→</b>. Los dos tienen una salida (el aro).</p>`
            + `<div class="dmg" style="--c:2"><figure>${antes}<figcaption><b>Antes.</b> Tú irás a la derecha; el Eco, a la izquierda…</figcaption></figure>`
            + `<figure>${despues}<figcaption><b>Después.</b> Tú avanzas, pero el Eco choca con la <b>roca</b> y se queda</figcaption></figure></div>`
      })(),
      pk: 'ec',
      render: eco,
      actions: { ecm, undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Resuelto · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
