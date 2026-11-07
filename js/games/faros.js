/* Juego: Faros — tablero con casillas libres y muros (los negros). Hay que colocar faros para que TODAS las casillas libres queden iluminadas.
   Un faro ilumina en línea recta, en las cuatro direcciones, hasta que choca con un muro o con el borde. Dos faros no pueden verse entre sí.
   Los muros con número indican cuántos faros tienen tocándolos (arriba, abajo, izquierda o derecha); los muros sin número no dicen nada.
   El reto sale de la fecha (SD). Se colocan muros y faros al azar (cada faro se pone en una casilla aún a oscuras, así que nunca se ven entre sí),
   se numeran los muros con los faros que tienen al lado y se QUITAN NÚMEROS mientras la solución siga siendo ÚNICA, comprobado por fuerza bruta.
   Lunes y martes: 5×5; el resto, 6×6. La victoria se comprueba por reglas (todo iluminado, sin faros que se vean, números exactos), no contra la solución guardada. */
(function () {
   const N = WD == 1 || WD == 2 ? 5 : 6, T = N * N;
   const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
   const MINNUM = 3;                                   // números que se dejan como mínimo
   const pls = (n, a, b) => n == 1 ? a : b;
   /* Casilla libre = -2 · muro sin número = -1 · muro con número = 0…4 */
   const muro = v => v >= -1;
   const vec = i => DIRS.map(([dx, dy]) => [i % N + dx, (i / N | 0) + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N).map(([x, y]) => y * N + x);
   const VEC = Array.from({ length: T }, (_, i) => vec(i));

   /* Para cada casilla libre, las casillas que ilumina un faro puesto en ella (incluida ella misma). */
   function luz(B) {
      const L = Array(T).fill(null);
      for (let i = 0; i < T; i++) {
         if (muro(B[i])) continue;
         const a = [i];
         for (const [dx, dy] of DIRS) { let x = i % N + dx, y = (i / N | 0) + dy; while (x >= 0 && y >= 0 && x < N && y < N && !muro(B[y * N + x])) { a.push(y * N + x); x += dx; y += dy } }
         L[i] = a
      }
      return L
   }

   /* Cuenta soluciones (se corta en lim). Se decide casilla a casilla (fila a fila): faro o no.
      Se poda si un faro ve a otro, si un número ya no puede cumplirse o si una casilla se queda sin ninguna luz posible. */
   function cuenta(B, L, lim) {
      const W = []; for (let i = 0; i < T; i++) if (!muro(B[i])) W.push(i);
      const pos = Array(T).fill(-1); W.forEach((c, k) => { pos[c] = k });
      const cierra = W.map(() => []); W.forEach(c => { cierra[Math.max(...L[c].map(j => pos[j]))].push(c) });   // casillas que se «cierran» al decidir la k
      const nums = W.map(c => VEC[c].filter(j => B[j] >= 0));
      const lamp = new Uint8Array(T), dec = new Uint8Array(T);
      let n = 0, sol = null;
      (function rec(k) {
         if (n >= lim) return;
         if (k == W.length) { n++; if (!sol) sol = Array.from(lamp); return }
         const c = W[k];
         for (let v = 0; v < 2; v++) {
            if (v && L[c].some(j => lamp[j])) continue;
            lamp[c] = v; dec[c] = 1;
            let ok = true;
            for (const b of nums[k]) {
               let a = 0, u = 0;
               for (const j of VEC[b]) if (B[j] == -2) { if (dec[j]) a += lamp[j]; else u++ }
               if (a > B[b] || a + u < B[b]) { ok = false; break }
            }
            if (ok) for (const w of cierra[k]) if (!L[w].some(j => lamp[j])) { ok = false; break }
            if (ok) rec(k + 1);
            lamp[c] = 0; dec[c] = 0;
            if (n >= lim) return
         }
      })(0);
      return { n, sol }
   }

   function gen() {
      const r = rng(SD * 71 + 13); let ult = null;
      for (let t = 0; t < 300; t++) {
         const B = Array(T).fill(-2), nb = Math.round(T * (.17 + r() * .1));
         shuf([...Array(T).keys()], r).slice(0, nb).forEach(i => { B[i] = -1 });
         const L = luz(B), W = []; for (let i = 0; i < T; i++) if (!muro(B[i])) W.push(i);
         const M = []; for (let i = 0; i < T; i++) if (muro(B[i])) M.push(i);
         if (W.length < T * .6 || M.length < 4) continue;
         // faros: cada uno en una casilla que aún no recibe luz de otro, así nunca se ven entre sí y al final todo queda iluminado
         const sol = Array(T).fill(0), lit = Array(T).fill(0);
         for (const i of shuf(W.slice(), r)) if (!lit[i]) { sol[i] = 1; L[i].forEach(j => { lit[j] = 1 }) }
         const BB = B.slice(); M.forEach(b => { BB[b] = VEC[b].filter(j => sol[j]).length });
         ult = { B: BB, L, sol, W, M };
         if (cuenta(BB, L, 2).n != 1) continue;
         // quita números mientras la solución siga siendo única
         let num = M.length;
         for (const b of shuf(M.slice(), r)) {
            if (num <= MINNUM) break;
            const v = BB[b]; BB[b] = -1;
            if (cuenta(BB, L, 2).n == 1) num--; else BB[b] = v
         }
         return { B: BB, L, sol, W, M, ok: 1 }
      }
      // reserva (casi imposible): el último reparto, con todos los números; vale igual porque la victoria se comprueba por reglas
      if (ult) return ult;
      const B = Array(T).fill(-2), L = luz(B), sol = Array(T).fill(0); for (let i = 0; i < N; i++) sol[i * (N + 1)] = 1;   // sin muros: una diagonal de faros ilumina todo y no se ven
      return { B, L, sol, W: [...Array(T).keys()], M: [] }
   }
   const P = memoSD(gen);                                                    // se regenera si cambia la semilla (SD)

   /* Progreso: p.s = estado de cada casilla (0 vacía, 1 faro, 2 marca «aquí no») · p.h = pistas · p.g = huella del reto. */
   const ini = p => { const g = P().B.join(); if (!Array.isArray(p.s) || p.g != g) { p.s = Array(T).fill(0); p.h = 0; p.g = g } };
   /* Qué casillas están iluminadas y qué faros se ven entre sí. */
   function vista(Z, s) {
      const lit = Array(T).fill(0), cf = new Set();
      s.forEach((v, i) => { if (v == 1) Z.L[i].forEach(j => { lit[j] = 1; if (j != i && s[j] == 1) cf.add(i) }) });
      return { lit, cf }
   }
   const ad = (s, b) => VEC[b].filter(j => s[j] == 1).length;               // faros tocando el muro b
   const libres = (s, b) => VEC[b].filter(j => s[j] == 0).length;           // casillas vacías junto al muro b (aún pueden recibir faro)
   const gana = (Z, s) => { const v = vista(Z, s); return Z.W.every(i => v.lit[i]) && !v.cf.size && Z.M.every(b => Z.B[b] < 0 || ad(s, b) == Z.B[b]) };
   const pos = i => `fila ${(i / N | 0) + 1}, columna ${i % N + 1}`;

   const ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3.3M12 18.2v3.3M2.5 12h3.3M18.2 12h3.3M5.3 5.3l2.3 2.3M16.4 16.4l2.3 2.3M18.7 5.3l-2.3 2.3M7.6 16.4l-2.3 2.3"/></svg>';

   function faros() {
      const p = prog('fr'); ini(p);
      const r = R('faros'), Z = P(), lost = r && r.st == 'lost', s = lost ? Z.sol.map(v => v ? 1 : 0) : p.s, { lit, cf } = vista(Z, s);
      const ncub = Z.W.filter(i => lit[i]).length, nf = s.filter(v => v == 1).length;
      let z = '';
      for (let i = 0; i < T; i++) {
         const v = Z.B[i];
         if (muro(v)) {
            const c = v < 0 ? '' : ad(s, i) > v || ad(s, i) + libres(s, i) < v ? ' bd' : ad(s, i) == v ? ' ok' : '';
            z += `<span class="fw${c}" role="img" aria-label="Muro${v < 0 ? ' sin número' : ' con el número ' + v + ', ' + ad(s, i) + pls(ad(s, i), ' faro al lado', ' faros al lado')}, ${pos(i)}">${v < 0 ? '' : v}</span>`
         } else {
            const f = s[i] == 1, c = ['fc', lit[i] ? 'lit' : '', f ? 'lamp' : '', s[i] == 2 ? 'mk' : '', !r && cf.has(i) ? 'cf' : ''].filter(Boolean).join(' ');
            z += `<button class="${c}" data-a="fr" data-i="${i}"${r ? ' disabled' : ''} aria-label="${pos(i)}, ${f ? 'faro' + (cf.has(i) ? ' que ve a otro faro' : '') : s[i] == 2 ? 'marcada sin faro' : lit[i] ? 'iluminada' : 'a oscuras'}">${f ? ICO : ''}</button>`
         }
      }
      let b = `<div class="frb" data-rv="faros" role="group" aria-label="Tablero de faros de ${N} por ${N}" style="grid-template-columns:repeat(${N},1fr)">${z}</div>`;
      if (lost) b += resRendida('Faros', 'Así se iluminaba todo: estos son los faros de la solución. Vuelve mañana para un reto nuevo.');
      else if (r) b += res(`¡Todo iluminado en ${mmss(r.t)}!`, `${r.n} ${pls(r.n, 'faro', 'faros')} en un tablero de ${N}×${N}. Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Faros #${DAY} · ${N}×${N} · ${mmss(r.t)}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}`);
      else b += `${S.set.tm ? tmHtml(p) : ''}<p class="cap" style="text-align:center;margin:0">${ncub} / ${Z.W.length} casillas iluminadas · ${nf} ${pls(nf, 'faro', 'faros')}</p><p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, pista: 1, rendirme: 1 })}`
         + `<p class="foot" style="margin-top:8px;text-align:center">Toca una casilla para poner un faro; otra vez, para marcarla como «aquí no»; y otra, para vaciarla. Con teclado: <b>Enter</b> pone o quita el faro y <b>X</b> marca.</p>`;
      return shell('Faros', b)
   }

   /* ----- Jugadas ----- */
   function final(p) {
      if (!R('faros') && gana(P(), p.s)) { Sfx.p('acierto'); fin('faros', { st: 'completed', t: Date.now() - p.t0, n: p.s.filter(v => v == 1).length, h: p.h || 0, c: 0 }); sv(); draw(); return true }
      return false
   }
   function poner(i, v) {
      const p = prog('fr'); ini(p);
      if (R('faros') || P().B[i] != -2) return;
      p.t0 = p.t0 || Date.now(); hist.push(p.s.slice()); if (hist.length > 40) hist.shift();
      p.s[i] = v; msg = ''; if (v == 1) Sfx.p('pon', 4); else if (v == 2) Sfx.p('tap'); else Sfx.p('borra');
      if (!final(p)) { sv(); draw() }
   }
   function fr(b) { const p = prog('fr'); ini(p); const i = +b.dataset.i; poner(i, (p.s[i] + 1) % 3) }
   function undo() {
      const p = prog('fr'); ini(p);
      if (R('faros') || !hist.length) return;
      p.s = hist.pop(); msg = ''; sv(); draw()
   }
   function reiniciar() {
      const p = prog('fr'); ini(p);
      if (R('faros') || !p.s.some(v => v)) return;
      hist.push(p.s.slice()); p.s = Array(T).fill(0); msg = ''; sv(); draw()          // el tiempo y las pistas siguen contando
   }
   /* Pista: si hay un faro que no está en la solución, lo quita; si no, pone de verdad un faro de la solución que falte. */
   function pista() {
      const p = prog('fr'); ini(p); if (R('faros')) return;
      const Z = P(), mal = Z.W.find(i => p.s[i] == 1 && !Z.sol[i]), falta = Z.W.find(i => Z.sol[i] && p.s[i] != 1);
      if (mal == null && falta == null) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; hist.push(p.s.slice());
      if (mal != null) { p.s[mal] = 0; msg = `Pista: sobraba el faro de la ${pos(mal)}.` }
      else { p.s[falta] = 1; msg = `Pista: va un faro en la ${pos(falta)}.` }
      if (!final(p)) { sv(); draw() }
   }
   function rendirse() { if (R('faros')) return; const p = prog('fr'); fin('faros', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw() }

   /* Teclado: X (o punto) marca la casilla enfocada como «aquí no»; clic derecho, lo mismo. Enter/Espacio y los toques ya cambian de estado. */
   document.addEventListener('keydown', e => {
      const g = typeof cur == 'function' && cur(); if (!g || g.id != 'faros' || R('faros') || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target; if (!t || !t.dataset || t.dataset.a != 'fr') return;
      if (e.key == 'x' || e.key == 'X' || e.key == '.') { e.preventDefault(); const i = +t.dataset.i, p = prog('fr'); ini(p); poner(i, p.s[i] == 2 ? 0 : 2) }
   });
   document.addEventListener('contextmenu', e => {
      const g = typeof cur == 'function' && cur(); if (!g || g.id != 'faros' || R('faros')) return;
      const t = e.target && e.target.closest && e.target.closest('[data-a="fr"]'); if (!t) return;
      e.preventDefault(); const i = +t.dataset.i, p = prog('fr'); ini(p); poner(i, p.s[i] == 2 ? 0 : 2)
   });

   DailyArcade.register({
      id: 'faros', name: 'Faros', desc: 'Coloca faros para iluminar todas las casillas sin que se vean entre sí.', color: '--sun',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 21h7M10 21l1-11h2l1 11M10.5 10h3M11 7h2v3M12 3.8v1.7M6.8 6.2l1.4 1M17.2 6.2l-1.4 1"/></svg>',
      how: ['Ilumina <b>todas las casillas libres</b> colocando faros. Un faro alumbra en línea recta hasta un muro o el borde.', 'Dos faros <b>no pueden verse</b> entre sí. Un muro con número indica <b>cuántos faros lo tocan</b> (arriba, abajo, izquierda o derecha).', 'Toca una casilla: <b>faro</b> → <b>marca «aquí no»</b> → vacía. Con teclado: <b>Enter</b> y <b>X</b>.'],
      demo: (() => {
         const c = ['', 'L', '', 'L', 'W', '', '', '', 'L'], lit = [1, 1, 1, 1, 0, 1, 1, 1, 1];
         const z = c.map((v, i) => v == 'W' ? '<span class="fw ok">2</span>' : `<span class="fc${lit[i] ? ' lit' : ''}${v == 'L' ? ' lamp' : ''}">${v == 'L' ? ICO : ''}</span>`).join('');
         return `<p class="cap">Ejemplo en 3×3: el muro con un 2 tiene dos faros al lado; los tres faros iluminan todo y ninguno ve a otro.</p><div class="frb" style="grid-template-columns:repeat(3,1fr);width:132px;margin:6px auto">${z}</div>`
      })(),
      pk: 'fr',
      render: faros,
      actions: { fr, undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Completada · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
