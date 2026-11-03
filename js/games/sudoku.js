/* Juego: Sudoku mini — rellena el tablero 6×6 con los números del 1 al 6 sin repetirlos
   en ninguna fila, columna ni caja de 2×3. El tablero sale de la fecha: todo el mundo juega el mismo. */
(function () {
   const N = 6, T = N * N, caja = i => ((i / N | 0) >> 1) * 2 + (i % N < 3 ? 0 : 1);
   const TODAS = [...Array(T).keys()];
   const PE = TODAS.map(i => TODAS.filter(j => j != i && (j % N == i % N || (j / N | 0) == (i / N | 0) || caja(j) == caja(i)))); // casillas que "ve" cada casilla
   const PISTAS = [12, 18, 18, 16, 16, 14, 14][WD]; // casillas dadas: menos = más difícil (lunes y martes, el más fácil)
   const bits = m => { let c = 0; for (; m; m &= m - 1)c++; return c };

   /* Rellena un tablero completo al azar (con semilla). */
   function llenar(g, r, i = 0) {
      if (i == T) return true;
      for (const v of shuf([1, 2, 3, 4, 5, 6], r)) if (PE[i].every(j => g[j] != v)) { g[i] = v; if (llenar(g, r, i + 1)) return true; g[i] = 0 }
      return false
   }

   /* Cuenta soluciones (se para en lim). Sirve para asegurar que el tablero de hoy tiene UNA sola. */
   function cuenta(g, lim) {
      let n = 0;
      (function rec() {
         if (n >= lim) return;
         let bi = -1, bm = 0, bc = 9;
         for (let i = 0; i < T; i++) {
            if (g[i]) continue;
            let u = 0; for (const j of PE[i]) u |= 1 << g[j];
            const m = ~u & 0x7E, c = bits(m);
            if (!c) return;
            if (c < bc) { bc = c; bi = i; bm = m; if (c == 1) break }
         }
         if (bi < 0) { n++; return }
         for (let v = 1; v <= 6 && n < lim; v++)if (bm >> v & 1) { g[bi] = v; rec() }
         g[bi] = 0
      })();
      return n
   }

   function gen() {
      const r = rng(SD * 17 + 3), sol = Array(T).fill(0); llenar(sol, r);
      const giv = sol.slice(); let n = T;
      for (const i of shuf(TODAS.slice(), r)) {
         if (n <= PISTAS) break;
         const v = giv[i]; giv[i] = 0;
         if (cuenta(giv, 2) == 1) n--; else giv[i] = v
      }
      return { sol, giv }
   }
   const P = memoSD(gen); // se regenera si cambia la semilla (SD): reto del día o ronda de duelo

   const ini = p => { if (!p.g) p.g = P().giv.slice() };
   const choques = g => { const s = new Set(); g.forEach((v, i) => { if (v && PE[i].some(j => g[j] == v)) s.add(i) }); return s };
   const pl = (n, a, b) => n == 1 ? a : b;

   function sudoku() {
      const p = prog('s'); ini(p);
      const r = R('sudoku'), { giv, sol } = P(), g = r ? sol : p.g, cf = choques(g), s = r ? null : sel;
      let z = '';
      for (let i = 0; i < T; i++) {
         const x = i % N, y = i / N | 0, v = g[i];
         const c = ['sx', giv[i] ? 'g' : '', x == 2 ? 'vr' : '', y % 2 && y < N - 1 ? 'hr' : '', s === i ? 'sel' : '', s != null && v && v == g[s] ? 'eq' : '', !r && S.set.hl && cf.has(i) ? 'cf' : '', !r && p.bad && p.bad.includes(i) ? 'bd' : ''].filter(Boolean).join(' ');
         z += `<button class="${c}" data-a="sc" data-i="${i}"${r ? ' disabled' : ''} aria-label="Fila ${y + 1}, columna ${x + 1}, ${giv[i] ? 'número dado ' + v : v ? 'número ' + v : 'vacía'}">${v || ''}</button>`
      }
      let b = `<div class="sd" role="group" aria-label="Tablero de sudoku de 6 por 6">${z}</div>`;
      if (r && r.st == 'lost') b += resRendida('Sudoku'); else if (r) b += res(`¡Resuelto en ${mmss(r.t)}!`, 'Tablero de 6×6. Vuelve mañana para un reto nuevo.', `Daily Arcade · Sudoku #${DAY} · 6×6 · ${mmss(r.t)}${r.c ? ' · ' + r.c + pl(r.c, ' comprobación', ' comprobaciones') : ''}`);
      else b += `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, comprobar: 1, rendirme: 1 })}<div class="kb np"><div class="kr">${[1, 2, 3, 4, 5, 6].map(n => `<button class="k" data-a="k" data-k="${n}">${n}</button>`).join('')}<button class="k w" data-a="k" data-k="Del" aria-label="Borrar">⌫</button></div></div>`;
      return shell('Sudoku mini', b)
   }

   function sc(b) {
      if (R('sudoku')) return;
      const p = prog('s'); ini(p); p.t0 = p.t0 || Date.now();
      sel = +b.dataset.i; msg = ''; sv(); draw()
   }

   function poner(v) {
      const p = prog('s'); ini(p);
      if (R('sudoku')) return;
      if (sel == null) { msg = 'Toca primero una casilla.'; return draw() }
      if (P().giv[sel] || p.g[sel] == v) return;
      p.t0 = p.t0 || Date.now(); hist.push(p.g.slice()); p.g[sel] = v; p.bad = []; msg = '';
      if (p.g.every((x, i) => x == P().sol[i])) fin('sudoku', { st: 'completed', t: Date.now() - p.t0, c: p.c || 0 });
      sv(); draw()
   }

   function tecla(m) { if (m == 'Del') poner(0); else if (/^[1-6]$/.test(m)) poner(+m) }

   function undo() {
      const p = prog('s');
      if (R('sudoku') || !hist.length) return;
      p.g = hist.pop(); p.bad = []; msg = ''; sv(); draw()
   }

   function reiniciar() {
      const p = prog('s'); ini(p);
      if (R('sudoku')) return;
      const g = p.g.map((v, i) => P().giv[i] ? v : 0);
      if (g.every((v, i) => v == p.g[i])) return;
      hist.push(p.g.slice()); p.g = g; p.bad = []; msg = ''; sv(); draw()   // tiempo y comprobaciones siguen contando
   }

   function chk() {
      const p = prog('s'); ini(p);
      if (R('sudoku')) return;
      p.t0 = p.t0 || Date.now(); p.c = (p.c || 0) + 1;
      const { giv, sol } = P();
      p.bad = TODAS.filter(i => !giv[i] && p.g[i] && p.g[i] != sol[i]);
      msg = p.bad.length ? `${p.bad.length} ${pl(p.bad.length, 'casilla incorrecta', 'casillas incorrectas')}` : 'Todo lo que has puesto es correcto';
      sv(); draw()
   }

   function rendirse() {
      if (R('sudoku')) return;
      const p = prog('s'); fin('sudoku', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw()
   }

   DailyArcade.register({
      id: 'sudoku', name: 'Sudoku mini', desc: 'Rellena el tablero 6×6 sin repetir números.', color: '--mint', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',
      how: ["Rellena el tablero con los números del <b>1 al 6</b>.", "No repitas número en ninguna <b>fila</b>, <b>columna</b> ni <b>caja de 2×3</b>.", "Los números fijos no se cambian. Toca una casilla y elige un número."],
      demo: (() => { let z = ''; for (let i = 0; i < 36; i++) { const x = i % 6, y = i / 6 | 0, cj = y < 2 && x < 3; z += `<span class="sx${x == 2 ? ' vr' : ''}${y % 2 && y < 5 ? ' hr' : ''}${cj ? ' eq' : ''}">${cj ? y * 3 + x + 1 : ''}</span>` } return `<p class="cap">Cada caja de 2×3 (en azul) lleva del 1 al 6:</p><div class="sd">${z}</div>` })(),
      pk: 's',
      winLabel: 'resueltos',
      winStreak: false,       // no se puede perder: solo se resuelve
      digits: true,           // el teclado físico también envía los números 0-9
      render: sudoku,
      onKey: tecla,
      actions: { sc, undo, reiniciar, comprobar: chk, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Resuelto · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar'),
      stats: (e, w) => w.length ? kpi([[mmss(Math.min(...w.map(x => x.t))), 'mejor tiempo'], [mmss(avg(w.map(x => x.t))), 'tiempo medio']]) : ''
   });
})();
