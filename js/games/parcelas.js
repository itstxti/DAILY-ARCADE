/* Juego: Parcelas — divide el tablero 6×6 en rectángulos («parcelas»). Cada parcela lleva UN solo número y ese número es
   su superficie (cuántas casillas tiene). Entre todas tienen que cubrir el tablero entero, sin huecos y sin solaparse.
   El reto sale de la fecha (SD). Se parte el tablero en rectángulos al azar, se pone el número de cada uno en una casilla suya
   y se COMPRUEBA POR FUERZA BRUTA que solo hay una forma de repartirlo; si hay más de una, se recolocan los números y, si no basta, se cambia el reparto.
   Así el reto tiene una única solución y es justo.
   Solo se aceptan rectángulos que ya cumplen su regla local (un número, superficie correcta): el reto está en que encajen todos.
   La victoria se comprueba por reglas (todas las casillas cubiertas con parcelas válidas), no contra la solución guardada. */
(function () {
   const N = 6, T = N * N, MAXA = 8;
   const COL = ['var(--sky)', 'var(--mint)', 'var(--coral)', 'var(--lav)', 'var(--sun)', 'var(--aqua)', 'var(--pink)', 'var(--lime)', 'var(--orange)'];
   const pls = (n, a, b) => n == 1 ? a : b;
   /* Un rectángulo es [x0, y0, x1, y1] (esquinas incluidas). */
   const area = q => (q[2] - q[0] + 1) * (q[3] - q[1] + 1);
   const en = (q, i) => { const x = i % N, y = Math.floor(i / N); return x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3] };
   const solapa = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
   const rect = (a, b) => [Math.min(a % N, b % N), Math.min(Math.floor(a / N), Math.floor(b / N)), Math.max(a % N, b % N), Math.max(Math.floor(a / N), Math.floor(b / N))];
   const igual = (a, b) => a.every((v, k) => v == b[k]);

   /* ----- Generación ----- */
   /* Reparte el tablero en rectángulos: siempre se parte de la primera casilla libre (fila a fila) y se elige uno al azar que quepa.
      Se evitan los de 1 casilla salvo que no quede otra, y pesa más lo grande. */
   function particion(r) {
      const lib = Array(T).fill(1), rs = [];
      for (let i = 0; i < T; i++) {
         if (!lib[i]) continue;
         const x = i % N, y = Math.floor(i / N), op = [];
         for (let h = 1; y + h <= N; h++) for (let w = 1; x + w <= N; w++) {
            if (w * h > MAXA) break;
            let ok = true;
            for (let yy = y; yy < y + h && ok; yy++) for (let xx = x; xx < x + w; xx++) if (!lib[yy * N + xx]) { ok = false; break }
            if (ok) op.push([w, h])
         }
         const may = op.filter(o => o[0] * o[1] > 1), el = may.length ? may : op, pe = o => Math.pow(o[0] * o[1], 1.5);
         let u = r() * el.reduce((s, o) => s + pe(o), 0), ch = el[el.length - 1];
         for (const o of el) { u -= pe(o); if (u < 0) { ch = o; break } }
         for (let yy = y; yy < y + ch[1]; yy++) for (let xx = x; xx < x + ch[0]; xx++) lib[yy * N + xx] = 0;
         rs.push([x, y, x + ch[0] - 1, y + ch[1] - 1])
      }
      return rs
   }

   /* Para cada número, todos los rectángulos de su superficie que lo contienen y no contienen ningún otro número. */
   function candidatos(cl) {
      const hay = new Set(cl.map(c => c.i));
      return cl.map(c => {
         const o = [], x0 = c.i % N, y0 = Math.floor(c.i / N);
         for (let w = 1; w <= c.n; w++) {
            if (c.n % w) continue;
            const h = c.n / w;
            for (let xa = Math.max(0, x0 - w + 1); xa <= Math.min(x0, N - w); xa++) for (let ya = Math.max(0, y0 - h + 1); ya <= Math.min(y0, N - h); ya++) {
               let ok = true;
               for (let yy = ya; yy < ya + h && ok; yy++) for (let xx = xa; xx < xa + w; xx++) { const j = yy * N + xx; if (j != c.i && hay.has(j)) { ok = false; break } }
               if (ok) o.push([xa, ya, xa + w - 1, ya + h - 1])
            }
         }
         return o
      })
   }

   /* Cuenta las soluciones (se corta en 2). La primera casilla sin cubrir (fila a fila) tiene que ser la esquina de arriba a la izquierda
      de su parcela, así que solo se prueban rectángulos que empiecen ahí. Devuelve { n, sol } con sol[k] = rectángulo del número k. */
   function resuelve(cl) {
      const C = candidatos(cl), cub = Array(T).fill(0), usada = Array(cl.length).fill(0), sel = Array(cl.length);
      let n = 0, sol = null;
      (function marcha() {
         if (n > 1) return;
         const i = cub.indexOf(0);
         if (i < 0) { n++; if (!sol) sol = sel.map(q => q.slice()); return }
         const x = i % N, y = Math.floor(i / N);
         for (let c = 0; c < cl.length; c++) {
            if (usada[c]) continue;
            for (const q of C[c]) {
               if (q[0] != x || q[1] != y) continue;
               let ok = true;
               for (let yy = q[1]; yy <= q[3] && ok; yy++) for (let xx = q[0]; xx <= q[2]; xx++) if (cub[yy * N + xx]) { ok = false; break }
               if (!ok) continue;
               for (let yy = q[1]; yy <= q[3]; yy++) for (let xx = q[0]; xx <= q[2]; xx++) cub[yy * N + xx] = 1;
               usada[c] = 1; sel[c] = q;
               marcha();
               for (let yy = q[1]; yy <= q[3]; yy++) for (let xx = q[0]; xx <= q[2]; xx++) cub[yy * N + xx] = 0;
               usada[c] = 0;
               if (n > 1) return
            }
         }
      })();
      return { n, sol }
   }

   function gen() {
      const r = rng(SD * 53 + 9), rnd = n => Math.floor(r() * n);
      for (let t = 0; t < 300; t++) {
         const rs = particion(r);
         if (rs.length < 6 || rs.length > 12 || rs.filter(q => area(q) == 1).length > 3) continue;
         for (let k = 0; k < 40; k++) {
            const cl = rs.map(q => { const w = q[2] - q[0] + 1, h = q[3] - q[1] + 1; return { i: (q[1] + rnd(h)) * N + q[0] + rnd(w), n: w * h } }).sort((a, b) => a.i - b.i);
            const s = resuelve(cl);
            if (s.n == 1) return { cl, sol: s.sol }
         }
      }
      // reserva (nunca debería hacer falta): seis franjas de 1×6 con el número en la primera columna (única solución)
      return { cl: Array.from({ length: N }, (_, y) => ({ i: y * N, n: N })), sol: Array.from({ length: N }, (_, y) => [0, y, N - 1, y]) }
   }
   const P = memoSD(gen);                                                    // se regenera si cambia la semilla (SD)

   /* Progreso: p.r = parcelas colocadas · p.u = pasos para Deshacer · p.h = pistas · p.g = huella del reto. */
   const ini = p => { const g = P().cl.map(c => c.i).join(); if (!Array.isArray(p.r) || p.g != g) { p.r = []; p.u = []; p.h = 0; p.g = g } };
   const pistas = (Z, q) => Z.cl.reduce((a, c, k) => en(q, c.i) ? a.concat(k) : a, []);
   const valido = (Z, q) => { const a = pistas(Z, q); return a.length == 1 && Z.cl[a[0]].n == area(q) ? a[0] : -1 };    // índice de su número, o -1
   const cubierto = rs => { const c = Array(T).fill(-1); rs.forEach((q, k) => { for (let y = q[1]; y <= q[3]; y++) for (let x = q[0]; x <= q[2]; x++) c[y * N + x] = k }); return c };
   const gana = (Z, rs) => cubierto(rs).every(k => k >= 0) && rs.every(q => valido(Z, q) >= 0);
   const info = (Z, rs) => `${rs.length} / ${Z.cl.length} parcelas · ${cubierto(rs).filter(k => k >= 0).length} / ${T} casillas`;
   const pasa = p => { (p.u = p.u || []).push(p.r.map(q => q.slice())); if (p.u.length > 15) p.u.shift() };

   /* ----- Dibujo ----- */
   let ancla = null, cur = null, ka = null, kc = 0;   // ratón/dedo: casilla donde empezó el arrastre y casilla actual · teclado: esquina marcada y cursor
   function svgTablero(Z, rs, dis) {
      const prev = ancla != null ? rect(ancla, cur) : ka != null ? rect(ka, kc) : null;
      let s = `<svg viewBox="0 0 ${N} ${N}" role="img" aria-label="Tablero de Parcelas de ${N} por ${N}. ${rs.length} de ${Z.cl.length} parcelas colocadas." style="display:block;width:100%;height:auto">`;
      for (let i = 0; i < T; i++) s += `<rect x="${i % N}" y="${Math.floor(i / N)}" width="1" height="1" style="fill:var(--card);stroke:var(--line);stroke-width:.03"/>`;
      rs.forEach(q => {
         const k = valido(Z, q), c = COL[(k < 0 ? 0 : k) % COL.length];
         s += `<rect x="${q[0] + .05}" y="${q[1] + .05}" width="${q[2] - q[0] + .9}" height="${q[3] - q[1] + .9}" rx=".12" style="fill:color-mix(in srgb,${c} 38%,var(--card));stroke:var(--ink);stroke-width:.07"/>`
      });
      if (prev && !dis) {
         const ok = valido(Z, prev) >= 0;
         s += `<rect x="${prev[0] + .08}" y="${prev[1] + .08}" width="${prev[2] - prev[0] + .84}" height="${prev[3] - prev[1] + .84}" rx=".12" style="fill:color-mix(in srgb,${ok ? 'var(--sky)' : 'var(--berry)'} 22%,transparent);stroke:${ok ? 'var(--sky)' : 'var(--berry)'};stroke-width:.09;stroke-dasharray:.18 .14"/>`
      }
      Z.cl.forEach(c => {
         s += `<text x="${c.i % N + .5}" y="${Math.floor(c.i / N) + .53}" text-anchor="middle" dominant-baseline="central" style="fill:var(--ink);font:800 .46px 'Bricolage Grotesque',system-ui,sans-serif;pointer-events:none">${c.n}</text>`
      });
      if (!dis && document.activeElement && document.activeElement.id == 'pcb') s += `<rect x="${kc % N + .06}" y="${Math.floor(kc / N) + .06}" width=".88" height=".88" rx=".12" fill="none" style="stroke:${ka != null ? 'var(--sky)' : 'var(--ink)'};stroke-width:.09"/>`;
      return s + '</svg>'
   }
   function pinta() {
      const p = prog('pc'); ini(p);
      const b = $('#pcb'); if (b) b.innerHTML = svgTablero(P(), p.r, false);
      const c = $('#pcc'); if (c) c.textContent = info(P(), p.r);
      const m = $('#pcm'); if (m) m.textContent = msg
   }

   function parcelas() {
      const p = prog('pc'); ini(p); const r = R('parcelas'), Z = P(), lost = r && r.st == 'lost', K = Z.cl.length;
      let b = `<div id="pcb" class="cm" data-b="parcelas"${r ? '' : ' tabindex="0" role="application" aria-label="Tablero de Parcelas. Flechas para mover el cursor, Enter para marcar una esquina y de nuevo Enter en la esquina contraria, Supr para borrar la parcela del cursor, Esc para cancelar."'} style="${r ? '' : 'touch-action:none;'}max-width:var(--bw,372px);margin:12px auto;border:3px solid var(--ink);border-radius:var(--r-md);overflow:hidden;user-select:none;-webkit-user-select:none">${svgTablero(Z, lost ? Z.sol : p.r, !!r)}</div>${r ? '' : '<span class="sr" id="pcl" aria-live="polite"></span>'}`;
      if (lost) b += resRendida('Parcelas', 'Así se repartía el tablero: una parcela por número, sin huecos. Vuelve mañana para un reto nuevo.');
      else if (r) b += res(`¡Parcelas completadas en ${mmss(r.t)}!`, `Las ${K} parcelas encajan sin dejar huecos. Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Parcelas #${DAY} · ${mmss(r.t)}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}`);
      else b += `${S.set.tm ? tmHtml(p) : ''}<p class="cap" id="pcc" style="text-align:center;margin:0">${info(Z, p.r)}</p><p class="msg" id="pcm" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, pista: 1, rendirme: 1 })}`
         + `<p class="foot" style="margin-top:8px;text-align:center">Arrastra para dibujar un rectángulo. Toca una parcela para borrarla. Con teclado: <b>Tab</b> hasta el tablero, <b>flechas</b> y <b>Enter</b> en dos esquinas.</p>`;
      return shell('Parcelas', b)
   }

   /* ----- Jugadas ----- */
   /* Dibuja la parcela entre las casillas a y b; si a == b es un toque: borra la parcela que hay ahí (o pone un 1 suelto). Devuelve si algo cambió. */
   function comete(p, a, b) {
      const Z = P();
      if (a == b) {
         const k = p.r.findIndex(q => en(q, a));
         if (k >= 0) { pasa(p); p.r.splice(k, 1); msg = ''; Sfx.p('borra'); return true }
         if (!Z.cl.some(c => c.i == a && c.n == 1)) { msg = 'Arrastra para dibujar un rectángulo que contenga un número.'; Sfx.p('error'); return false }
      }
      const q = rect(a, b), pk = pistas(Z, q);
      if (pk.length != 1) { msg = pk.length ? 'Una parcela solo puede llevar un número.' : 'Cada parcela tiene que llevar un número.'; Sfx.p('error'); return false }
      const n = Z.cl[pk[0]].n;
      if (area(q) != n) { msg = `Ese número pide ${n} ${pls(n, 'casilla', 'casillas')} y el rectángulo tiene ${area(q)}.`; Sfx.p('error'); return false }
      if (p.r.some(x => igual(x, q))) { msg = ''; return false }
      pasa(p); p.r = p.r.filter(x => !solapa(x, q)); p.r.push(q); msg = ''; Sfx.p('pon', p.r.length);
      return true
   }
   function final(p) {
      const Z = P();
      if (!R('parcelas') && gana(Z, p.r)) { fin('parcelas', { st: 'completed', t: Date.now() - p.t0, h: p.h || 0, c: 0, n: Z.cl.length }); sv(); draw(); return true }
      return false
   }

   /* ----- Interacción con el puntero ----- */
   const casilla = (e, el) => { const q = el.getBoundingClientRect(), x = Math.floor((e.clientX - q.left) / q.width * N), y = Math.floor((e.clientY - q.top) / q.height * N); return x < 0 || y < 0 || x >= N || y >= N ? -1 : y * N + x };
   const A = $('#app');
   A.addEventListener('pointerdown', e => {
      if (V != 'parcelas' || R('parcelas')) return;
      const b = e.target.closest('#pcb'); if (!b) return;
      const i = casilla(e, b); if (i < 0) return;
      const p = prog('pc'); ini(p); e.preventDefault();
      try { b.setPointerCapture(e.pointerId) } catch (x) { }
      p.t0 = p.t0 || Date.now(); msg = ''; ka = null; ancla = cur = i; pinta()
   });
   A.addEventListener('pointermove', e => {
      if (ancla == null || V != 'parcelas' || R('parcelas')) return;
      const b = $('#pcb'); if (!b) return;
      const i = casilla(e, b); if (i < 0 || i == cur) return;
      cur = i; pinta()
   });
   A.addEventListener('pointerup', () => {
      if (ancla == null) return;
      const a = ancla, b = cur; ancla = cur = null;
      if (V != 'parcelas' || R('parcelas')) return;
      const p = prog('pc'); ini(p);
      const ok = comete(p, a, b);
      if (!final(p)) { if (ok) sv(); pinta() }
   });
   A.addEventListener('pointercancel', () => { if (ancla == null) return; ancla = cur = null; if (V == 'parcelas' && !R('parcelas')) pinta() });

   /* ----- Teclado: flechas mueven el cursor; Enter marca una esquina y, en la esquina contraria, coloca la parcela; Supr borra la del cursor; Esc cancela ----- */
   const DK = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
   const nombre = i => { const p = prog('pc'), c = P().cl.find(x => x.i == i); return `Fila ${Math.floor(i / N) + 1}, columna ${i % N + 1}: ` + (c ? `número ${c.n}` : 'vacía') + (p.r.some(q => en(q, i)) ? ', dentro de una parcela' : '') };
   A.addEventListener('keydown', e => {
      if (V != 'parcelas' || R('parcelas') || e.target.id != 'pcb' || e.ctrlKey || e.metaKey || e.altKey) return;
      const p = prog('pc'), k = e.key; ini(p);
      if (DK[k]) {
         e.preventDefault();
         const x = kc % N + DK[k][0], y = Math.floor(kc / N) + DK[k][1]; if (x < 0 || y < 0 || x >= N || y >= N) return;
         kc = y * N + x; pinta(); Teclado.anuncia('pcl', nombre(kc))
      } else if (k == 'Enter' || k == ' ') {
         e.preventDefault(); p.t0 = p.t0 || Date.now();
         if (ka == null) { ka = kc; msg = ''; pinta(); Teclado.anuncia('pcl', 'Esquina marcada. Mueve el cursor a la esquina contraria y pulsa Enter.'); return }
         const a = ka; ka = null; const ok = comete(p, a, kc);
         if (!final(p)) { if (ok) sv(); pinta(); Teclado.anuncia('pcl', msg || (ok ? 'Hecho' : '')) }
      } else if (k == 'Escape' && ka != null) { e.preventDefault(); ka = null; pinta(); Teclado.anuncia('pcl', 'Cancelado') }
      else if (k == 'Delete' || k == 'Backspace') {
         e.preventDefault(); const j = p.r.findIndex(q => en(q, kc));
         if (j >= 0) { pasa(p); p.r.splice(j, 1); ka = null; msg = ''; Sfx.p('borra'); sv(); pinta(); Teclado.anuncia('pcl', 'Parcela borrada') }
      }
   });
   A.addEventListener('focusin', e => { if (V == 'parcelas' && e.target.id == 'pcb') pinta() });
   A.addEventListener('focusout', e => { if (V == 'parcelas' && e.target.id == 'pcb') setTimeout(() => { if (V == 'parcelas' && !R('parcelas')) { ka = null; pinta() } }, 0) });

   function undo() {
      const p = prog('pc'); ini(p);
      if (R('parcelas') || !(p.u && p.u.length)) return;
      p.r = p.u.pop(); ka = null; msg = ''; sv(); draw()
   }
   function reiniciar() {
      const p = prog('pc'); ini(p);
      if (R('parcelas') || !p.r.length) return;
      pasa(p); p.r = []; ka = null; msg = ''; sv(); draw()          // el tiempo y las pistas siguen contando
   }
   /* Pista: coloca de verdad la primera parcela de la solución que aún no está puesta (quitando las que le estorban). */
   function pista() {
      const p = prog('pc'); ini(p); if (R('parcelas')) return;
      const Z = P(), k = Z.sol.findIndex(q => !p.r.some(x => igual(x, q)));
      if (k < 0) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; pasa(p);
      const q = Z.sol[k]; p.r = p.r.filter(x => !solapa(x, q)); p.r.push(q.slice());
      const c = Z.cl[k]; msg = `Pista: el ${c.n} de la fila ${Math.floor(c.i / N) + 1}, columna ${c.i % N + 1} va en un rectángulo de ${q[2] - q[0] + 1}×${q[3] - q[1] + 1}.`;
      ka = null; if (!final(p)) { sv(); draw() }
   }
   function rendirse() { if (R('parcelas')) return; const p = prog('pc'); fin('parcelas', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw() }

   DailyArcade.register({
      id: 'parcelas', name: 'Parcelas', desc: 'Divide el tablero en rectángulos: cada uno lleva un número y tiene tantas casillas como indica.', color: '--orange',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M11 4v16M11 13h9"/></svg>',
      how: ['Divide el tablero en <b>rectángulos</b>: cada uno lleva <b>un solo número</b>.', 'El número es la <b>cantidad de casillas</b> de su rectángulo. Entre todos tienen que <b>cubrir el tablero</b> sin huecos ni solaparse.', 'Arrastra para dibujar un rectángulo. Si dibujas sobre otros, los sustituyes. Toca una parcela para <b>borrarla</b>. Con teclado: <b>Tab</b> hasta el tablero, <b>flechas</b> y <b>Enter</b> en dos esquinas.'],
      demo: (() => {
         const rs = [[0, 0, 2, 0, 3], [0, 1, 1, 2, 4], [2, 1, 2, 2, 2]], cl = [[1, 0, 3], [0, 2, 4], [2, 1, 2]], cc = ['var(--sky)', 'var(--mint)', 'var(--coral)'];
         let s = `<svg viewBox="0 0 3 3" style="display:block;width:120px;margin:6px auto;border:3px solid var(--ink);border-radius:var(--r-sm)">`;
         for (let i = 0; i < 9; i++) s += `<rect x="${i % 3}" y="${Math.floor(i / 3)}" width="1" height="1" style="fill:var(--card);stroke:var(--line);stroke-width:.03"/>`;
         rs.forEach((q, k) => { s += `<rect x="${q[0] + .06}" y="${q[1] + .06}" width="${q[2] - q[0] + .88}" height="${q[3] - q[1] + .88}" rx=".12" style="fill:color-mix(in srgb,${cc[k]} 38%,var(--card));stroke:var(--ink);stroke-width:.07"/>` });
         cl.forEach(c => { s += `<text x="${c[0] + .5}" y="${c[1] + .53}" text-anchor="middle" dominant-baseline="central" style="fill:var(--ink);font:800 .46px sans-serif">${c[2]}</text>` });
         return `<p class="cap">Ejemplo en 3×3: tres parcelas de 3, 4 y 2 casillas cubren las 9 casillas.</p>${s}</svg>`
      })(),
      pk: 'pc',
      render: parcelas,
      actions: { undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Completada · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
