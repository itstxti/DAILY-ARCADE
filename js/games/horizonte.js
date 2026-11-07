/* Juego: Horizonte — cuadrícula 4×4 de edificios con alturas del 1 al 4, sin repetir en ninguna fila ni columna.
   Los números del borde dicen cuántos edificios se ven desde ese lado: un edificio tapa a los más bajos que tiene detrás.
   El reto sale de la fecha (SD). Hay solo 576 cuadrados latinos de 4×4: se generan todos y se elige uno al azar. Se calculan sus 16 pistas
   (4 por lado) y se QUITAN pistas mientras SOLO UN cuadrado latino las cumpla (comprobado contra los 576), hasta dejar las que marca el día.
   La victoria se comprueba por reglas (todo lleno, sin repetidos y todas las pistas cumplidas), no contra la solución guardada. */
(function () {
   const N = 4, T = 16;
   const PISTAS = [9, 11, 11, 10, 9, 9, 8][WD];       // pistas que se dejan (más = más fácil; lunes y martes, el más fácil)
   const pls = (n, a, b) => n == 1 ? a : b;

   /* Los 576 cuadrados latinos de orden 4. */
   const LS = (() => {
      const a = [], g = Array(T).fill(0);
      (function rec(i) {
         if (i == T) { a.push(g.slice()); return }
         const x = i % N, y = i / N | 0;
         for (let v = 1; v <= N; v++) {
            let ok = true;
            for (let k = 0; k < x; k++) if (g[y * N + k] == v) ok = false;
            for (let k = 0; k < y; k++) if (g[k * N + x] == v) ok = false;
            if (ok) { g[i] = v; rec(i + 1) }
         }
         g[i] = 0
      })(0);
      return a
   })();

   /* Pista c (0–15): lado = c >> 2 (0 arriba, 1 abajo, 2 izquierda, 3 derecha) y línea = c & 3. Casillas de la línea, en el orden en que se mira desde ese lado. */
   const lin = c => { const s = c >> 2, k = c & 3, a = []; for (let j = 0; j < N; j++) a.push(s == 0 ? j * N + k : s == 1 ? (N - 1 - j) * N + k : s == 2 ? k * N + j : k * N + (N - 1 - j)); return a };
   const LIN = Array.from({ length: 16 }, (_, c) => lin(c));
   const visibles = a => { let m = 0, n = 0; for (const v of a) if (v > m) { m = v; n++ } return n };
   const CL = LS.map(g => LIN.map(l => visibles(l.map(i => g[i]))));              // pistas de cada cuadrado latino

   function gen() {
      const r = rng(SD * 43 + 7);
      const unico = (act, cl) => { let n = 0; for (let q = 0; q < LS.length; q++) if (act.every(c => CL[q][c] == cl[c]) && ++n > 1) return false; return n == 1 };
      for (let t = 0; t < 50; t++) {
         const q = Math.floor(r() * LS.length), sol = LS[q], cl = CL[q];
         let act = [...Array(16).keys()];
         if (!unico(act, cl)) continue;
         for (const c of shuf(act.slice(), r)) {
            if (act.length <= PISTAS) break;
            const b = act.filter(x => x != c);
            if (unico(b, cl)) act = b
         }
         return { sol, cl, act }
      }
      return { sol: LS[0], cl: CL[0], act: [...Array(16).keys()] }                 // reserva (nunca debería hacer falta)
   }
   const P = memoSD(gen);                                                          // se regenera si cambia la semilla (SD)

   /* Progreso: p.g = alturas puestas (0 = vacía) · p.lk = casillas fijadas por una pista · p.h = pistas · p.s = huella del reto. */
   const ini = p => { const z = P().act.join() + P().sol.join(); if (!Array.isArray(p.g) || p.s != z) { p.g = Array(T).fill(0); p.lk = []; p.h = 0; p.s = z } };
   const choques = g => { const s = new Set(); g.forEach((v, i) => { if (!v) return; const x = i % N, y = i / N | 0; for (let k = 0; k < N; k++) { if (k != x && g[y * N + k] == v) s.add(i); if (k != y && g[k * N + x] == v) s.add(i) } }); return s };
   /* Estado de una pista con lo que hay puesto: null si su línea aún no está llena; true si se cumple; false si no. */
   const estadoPista = (g, Z, c) => { const l = LIN[c].map(i => g[i]); return l.every(Boolean) ? visibles(l) == Z.cl[c] : null };
   const gana = (g, Z) => g.every(Boolean) && !choques(g).size && Z.act.every(c => estadoPista(g, Z, c) === true);
   const FLE = ['↓', '↑', '→', '←'];                                                // hacia dónde se mira desde cada lado
   const LADO = ['arriba', 'abajo', 'la izquierda', 'la derecha'];

   function horizonte() {
      const p = prog('hz'); ini(p);
      const r = R('horizonte'), Z = P(), lost = r && r.st == 'lost', g = lost ? Z.sol : p.g, cf = choques(g), s = r || lost ? null : sel;
      let z = '';
      for (let f = 0; f < 6; f++) for (let c = 0; c < 6; c++) {
         const bf = f == 0 || f == 5, bc = c == 0 || c == 5;
         if (bf && bc) { z += '<span></span>'; continue }
         if (bf || bc) {
            const k = bf ? (f == 0 ? 0 : 1) * 4 + c - 1 : (c == 0 ? 2 : 3) * 4 + f - 1;
            if (!Z.act.includes(k)) { z += '<span></span>'; continue }
            const e = estadoPista(g, Z, k);
            z += `<span class="hzc${e === true ? ' ok' : e === false ? ' bd' : ''}" role="img" aria-label="Se ven ${Z.cl[k]} ${pls(Z.cl[k], 'edificio', 'edificios')} desde ${LADO[k >> 2]}, ${(k >> 2) < 2 ? 'columna' : 'fila'} ${(k & 3) + 1}">${Z.cl[k]}<i aria-hidden="true">${FLE[k >> 2]}</i></span>`;
            continue
         }
         const i = (f - 1) * N + c - 1, v = g[i], x = c - 1, y = f - 1;
         const cl = ['hzx', p.lk.includes(i) && !r ? 'g' : '', s === i ? 'sel' : '', s != null && v && v == g[s] ? 'eq' : '', !r && S.set.hl && cf.has(i) ? 'cf' : ''].filter(Boolean).join(' ');
         z += `<button class="${cl}" style="--h:${v}" data-a="sc" data-i="${i}"${r ? ' disabled' : ''} aria-label="Fila ${y + 1}, columna ${x + 1}, ${p.lk.includes(i) && !r ? 'edificio fijado de altura ' + v : v ? 'altura ' + v : 'vacía'}">${v || ''}</button>`
      }
      let b = `<div class="hzb" data-rv="horizonte" role="group" aria-label="Tablero de Horizonte de 4 por 4 con pistas en el borde">${z}</div>`;
      if (lost) b += resRendida('Horizonte', 'Esta era la solución. Vuelve mañana para un reto nuevo.');
      else if (r) b += res(`¡Ciudad completada en ${mmss(r.t)}!`, 'Todas las pistas se cumplen. Vuelve mañana para un reto nuevo.',
         `Daily Arcade · Horizonte #${DAY} · ${mmss(r.t)}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}`);
      else b += `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, pista: 1, rendirme: 1 })}<div class="kb np"><div class="kr">${[1, 2, 3, 4].map(n => `<button class="k" data-a="k" data-k="${n}">${n}</button>`).join('')}<button class="k w" data-a="k" data-k="Del" aria-label="Borrar">⌫</button></div></div>`
         + `<p class="foot" style="margin-top:8px;text-align:center">Un número del borde indica cuántos edificios se ven desde ahí. Toca una casilla y elige su altura.</p>`;
      return shell('Horizonte', b)
   }

   function sc(b) {
      if (R('horizonte')) return;
      const p = prog('hz'); ini(p); p.t0 = p.t0 || Date.now();
      sel = +b.dataset.i; msg = ''; Sfx.p('tap'); sv(); draw()
   }
   function final(p) {
      if (!R('horizonte') && gana(p.g, P())) { Sfx.p('acierto'); fin('horizonte', { st: 'completed', t: Date.now() - p.t0, h: p.h || 0, c: 0 }); sv(); draw(); return true }
      return false
   }
   function poner(v) {
      const p = prog('hz'); ini(p);
      if (R('horizonte')) return;
      if (sel == null) { msg = 'Toca primero una casilla.'; Sfx.p('error'); return draw() }
      if (p.lk.includes(sel)) { msg = 'Esa casilla la fijó una pista.'; Sfx.p('error'); return draw() }
      if (p.g[sel] == v) return;
      p.t0 = p.t0 || Date.now(); hist.push(p.g.slice()); p.g[sel] = v; msg = ''; if (v) Sfx.p('pon', v); else Sfx.p('borra');
      if (!final(p)) { sv(); draw() }
   }
   function tecla(m) { if (m == 'Del' || m == '0') poner(0); else if (/^[1-4]$/.test(m)) poner(+m) }

   function undo() {
      const p = prog('hz'); ini(p);
      if (R('horizonte') || !hist.length) return;
      p.g = hist.pop(); msg = ''; sv(); draw()
   }
   function reiniciar() {
      const p = prog('hz'); ini(p);
      if (R('horizonte')) return;
      const g = p.g.map((v, i) => p.lk.includes(i) ? v : 0);
      if (g.every((v, i) => v == p.g[i])) return;
      hist.push(p.g.slice()); p.g = g; msg = ''; sv(); draw()               // el tiempo y las pistas siguen contando
   }
   /* Pista: pone y fija de verdad la altura correcta de una casilla (primero una que esté mal; si no, la primera vacía). */
   function pista() {
      const p = prog('hz'); ini(p); if (R('horizonte')) return;
      const Z = P(), t = [...Array(T).keys()].filter(i => !p.lk.includes(i) && p.g[i] != Z.sol[i]), i = t.find(j => p.g[j]) ?? t[0];
      if (i == null) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; hist.push(p.g.slice());
      p.g[i] = Z.sol[i]; p.lk.push(i); sel = i; msg = `Pista: en la fila ${(i / N | 0) + 1}, columna ${i % N + 1} va un ${Z.sol[i]}.`; Sfx.p('pista');
      if (!final(p)) { sv(); draw() }
   }
   function rendirse() { if (R('horizonte')) return; const p = prog('hz'); fin('horizonte', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw() }

   DailyArcade.register({
      id: 'horizonte', name: 'Horizonte', desc: 'Coloca edificios del 1 al 4 según cuántos se ven desde cada borde.', color: '--mint', tag: 'Cuenta los edificios que se ven',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V12h4v9M9 21V5h5v16M14 21v-7h5v7"/></svg>',
      how: ['Rellena la cuadrícula con edificios de altura <b>1 a 4</b>, sin repetir altura en ninguna <b>fila</b> ni <b>columna</b>.', 'Cada número del borde indica <b>cuántos edificios se ven</b> desde ese lado: uno alto <b>tapa</b> a los más bajos que tiene detrás.', 'Toca una casilla y elige su altura. Los números del borde se ponen en verde si se cumplen y en rojo si no.'],
      demo: '<p class="cap">Fila de 4 vista desde la izquierda: <b>1 3 2 4</b> → se ven 3 edificios (el 1, el 3 y el 4); el 2 queda tapado por el 3.</p>',
      pk: 'hz',
      digits: true,
      render: horizonte,
      onKey: tecla,
      actions: { sc, undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Completada · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
