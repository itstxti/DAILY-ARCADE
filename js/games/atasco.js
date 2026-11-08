/* Juego: Atasco — tablero 6×6 lleno de coches (de 2 casillas) y camiones (de 3). Cada vehículo solo se desliza en línea recta, hacia delante o hacia atrás, y no puede
   atravesar a los demás. Hay que sacar el coche ROJO por la salida (a la derecha de su fila). Deslizar un vehículo cualquier número de casillas cuenta como UN movimiento.
   El reto sale de la fecha (SD). Se colocan vehículos al azar y se explora, con una anchura (BFS), TODA la componente de posiciones a las que se puede llegar moviéndolos
   (como mover es reversible, sirve para ir y para volver). Desde todas las posiciones con el rojo en la salida se hace otra anchura hacia atrás y así se sabe, para cada
   posición, cuántos movimientos faltan como mínimo. El reto es una posición alejada de la salida: siempre se puede resolver y el mínimo es exacto.
   La victoria se comprueba por reglas (el rojo en la salida), no contra la solución guardada. */
(function () {
   const N = 6, T = N * N, SAL = N - 2, TOPE = 25000;               // SAL = columna donde queda el rojo al salir · TOPE = máximo de posiciones que se exploran por tablero
   const DIF = WD == 1 || WD == 2 ? [7, 9] : WD == 0 || WD == 6 ? [11, 15] : [9, 12];   // [mínimo aceptado, mínimo que se busca] de movimientos
   const ROJO = '#DC2626';                                           // el coche rojo es rojo de verdad (sin mezclar con el fondo)
   const COL = [ROJO, 'var(--sky)', 'var(--mint)', 'var(--sun)', 'var(--lav)', 'var(--orange)', 'var(--aqua)', 'var(--pink)', 'var(--lime)', 'var(--coral)', 'color-mix(in srgb,var(--sky) 50%,var(--ink))', 'color-mix(in srgb,var(--mint) 50%,var(--sun))'];
   const NOMC = ['rojo', 'azul', 'verde', 'amarillo', 'lila', 'naranja', 'turquesa', 'rosa', 'lima', 'coral', 'azul oscuro', 'oliva'];
   const pls = (n, a, b) => n == 1 ? a : b;
   const clave = pos => pos.join('');                                // las posiciones son de 0 a 5: una cifra por vehículo

   /* Un vehículo es { h: horizontal?, l: largo, c: fila (si h) o columna (si no) } y su posición es la casilla donde empieza, a lo largo de su línea. */
   const celda = (v, p, q) => v.h ? v.c * N + p + q : (p + q) * N + v.c;
   function ocupa(ve, pos, salvo) {
      const g = new Int8Array(T).fill(-1);
      ve.forEach((v, k) => { if (k != salvo) for (let q = 0; q < v.l; q++) g[celda(v, pos[k], q)] = k });
      return g
   }
   /* Llama a f(k, q) por cada sitio q al que puede llegar deslizando el vehículo k (todas las casillas intermedias libres). */
   function vecinos(ve, pos, f) {
      const g = ocupa(ve, pos, -1);
      ve.forEach((v, k) => {
         const p = pos[k];
         for (let q = p - 1; q >= 0 && g[celda(v, q, 0)] < 0; q--) f(k, q);
         for (let q = p + 1; q + v.l <= N && g[celda(v, q, v.l - 1)] < 0; q++) f(k, q)
      })
   }
   /* Cuántas casillas libres tiene el vehículo k hacia atrás (neg) y hacia delante (pos) sin contar a sí mismo. */
   function holgura(ve, pos, k) {
      const g = ocupa(ve, pos, k), v = ve[k], p = pos[k]; let neg = 0, mas = 0;
      while (p - neg - 1 >= 0 && g[celda(v, p - neg - 1, 0)] < 0) neg++;
      while (p + mas + v.l < N && g[celda(v, p + mas + 1, v.l - 1)] < 0) mas++;
      return [neg, mas]
   }

   /* ----- Generación ----- */
   /* Explora todas las posiciones alcanzables desde pos0 y calcula, para cada una, los movimientos que faltan hasta tener el rojo en la salida.
      Devuelve { ids, lista, dist } o null si hay demasiadas posiciones o el rojo no puede salir nunca. */
   function componente(ve, pos0) {
      const n = ve.length, pot = ve.map((v, k) => Math.pow(N, k)), g = new Int8Array(T);
      const cl = pos => pos.reduce((a, x, k) => a + x * pot[k], 0);
      const ids = new Map([[cl(pos0), 0]]), lista = [pos0.slice()], claves = [cl(pos0)], ady = [];
      for (let h = 0; h < lista.length; h++) {
         if (lista.length > TOPE) return null;
         const pos = lista[h], key = claves[h], vs = []; g.fill(-1);
         for (let k = 0; k < n; k++) { const v = ve[k], p = pos[k]; for (let q = 0; q < v.l; q++) g[celda(v, p, q)] = k }
         for (let k = 0; k < n; k++) {
            const v = ve[k], p = pos[k], paso = v.h ? 1 : N, ini = v.h ? v.c * N : v.c;     // ini + paso * x = casilla en la posición x
            for (let dir = -1; dir <= 1; dir += 2) {
               for (let q = p + dir; q >= 0 && q + v.l <= N; q += dir) {
                  if (g[ini + paso * (dir < 0 ? q : q + v.l - 1)] >= 0) break;             // la casilla que se pisa de nuevo está ocupada
                  const kn = key + (q - p) * pot[k]; let id = ids.get(kn);
                  if (id == null) { id = lista.length; ids.set(kn, id); const nueva = pos.slice(); nueva[k] = q; lista.push(nueva); claves.push(kn) }
                  vs.push(id)
               }
            }
         }
         ady.push(vs)
      }
      const dist = new Int16Array(lista.length).fill(-1), cola = [];
      lista.forEach((s, i) => { if (s[0] == SAL) { dist[i] = 0; cola.push(i) } });
      if (!cola.length) return null;
      for (let h = 0; h < cola.length; h++) for (const j of ady[cola[h]]) if (dist[j] < 0) { dist[j] = dist[cola[h]] + 1; cola.push(j) }
      return { ids, lista, dist, cl }
   }

   function gen() {
      const r = rng(SD * 79 + 11), rnd = n => Math.floor(r() * n), [MIN, QUIERO] = DIF;
      let mejor = null;
      for (let t = 0; t < 80; t++) {
         const ve = [{ h: true, l: 2, c: 2 }], pos = [rnd(3)], g = new Int8Array(T).fill(-1);
         for (let q = 0; q < 2; q++) g[2 * N + pos[0] + q] = 0;
         const nv = 8 + rnd(4); let camiones = 0;
         for (let i = 0; i < 100 && ve.length < nv; i++) {
            const bloqueo = ve.length < 4;                                     // los primeros vehículos son verticales y cruzan la fila del rojo, a su derecha
            const h = bloqueo ? false : r() < .5, l = r() < .28 && camiones < 3 ? 3 : 2, c = bloqueo ? pos[0] + 2 + rnd(N - pos[0] - 2) : rnd(N), p = bloqueo ? Math.max(0, Math.min(N - l, 2 - rnd(l))) : rnd(N - l + 1), v = { h, l, c };
            let ok = true; for (let q = 0; q < l; q++) if (g[celda(v, p, q)] >= 0) ok = false;
            if (!ok) continue;
            for (let q = 0; q < l; q++) g[celda(v, p, q)] = ve.length;
            ve.push(v); pos.push(p); if (l == 3) camiones++
         }
         const C = componente(ve, pos); if (!C) continue;
         let mx = 0; for (const d of C.dist) if (d > mx) mx = d;
         if (mx < MIN) { if (!mejor || mx > mejor.mx) mejor = { ve, C, mx }; continue }
         const d = Math.min(mx, QUIERO), op = []; C.dist.forEach((x, i) => { if (x == d) op.push(i) });
         const i = op[rnd(op.length)];
         return { ve, pos: C.lista[i], d, ids: C.ids, dist: C.dist, cl: C.cl }
      }
      // si ningún tablero llegó al mínimo, se usa el más difícil que salió (siempre se puede resolver)
      if (mejor) { const op = []; mejor.C.dist.forEach((x, i) => { if (x == mejor.mx) op.push(i) }); return { ve: mejor.ve, pos: mejor.C.lista[op[0]], d: mejor.mx, ids: mejor.C.ids, dist: mejor.C.dist, cl: mejor.C.cl } }
      // reserva (nunca debería hacer falta): el rojo con un solo coche vertical delante
      const ve = [{ h: true, l: 2, c: 2 }, { h: false, l: 2, c: 3 }], pos = [0, 1], C = componente(ve, pos);
      return { ve, pos, d: C.dist[0], ids: C.ids, dist: C.dist, cl: C.cl }
   }
   const P = memoSD(gen);                                            // se regenera si cambia la semilla (SD)
   const falta = (Z, pos) => { const i = Z.ids.get(Z.cl(pos)); return i == null ? -1 : Z.dist[i] };

   /* Progreso: p.pos = posiciones · p.m = movimientos [vehículo, de, a, teclado?] (para Deshacer) · p.n = movimientos contados (deshacer no los devuelve) · p.h = pistas · p.g = huella del reto. */
   const ini = p => {
      const Z = P(), g = clave(Z.pos) + Z.ve.map(v => (v.h ? 'h' : 'v') + v.l + v.c).join('');
      if (!Array.isArray(p.pos) || p.g != g) { p.pos = Z.pos.slice(); p.m = []; p.n = 0; p.h = 0; p.pd = p.pt = -1; p.g = g }
   };
   /* La solución completa desde la posición del reto (solo para enseñarla al rendirse): el tablero resuelto. */
   function resuelto(Z) {
      let pos = Z.pos.slice(), d = falta(Z, pos);
      while (d > 0) { let sig = null; vecinos(Z.ve, pos, (k, q) => { if (sig) return; const n = pos.slice(); n[k] = q; if (falta(Z, n) == d - 1) sig = n }); pos = sig; d-- }
      return pos
   }

   /* ----- Dibujo ----- */
   const W = N + .55;
   let kv = -1, arrastre = null;                                        // kv = vehículo marcado (toque o teclado) · arrastre = { k, g0, neg, mas, off }
   /* dis = partida terminada (no se dibujan marcas). Orden: casillas → carril del rojo → alcance del marcado / destino del arrastre / destino de la pista → vehículos → chevron de la pista.
      El alcance es la franja por la que puede deslizarse el vehículo marcado (con una flecha en cada extremo libre). */
   const caja = (v, q) => v.h ? [q, v.c, v.l, 1] : [v.c, q, 1, v.l];
   function svgTablero(Z, pos, p, dis) {
      let s = `<svg viewBox="0 0 ${W} ${N}" role="img" aria-label="Tablero de Atasco de ${N} por ${N}. Hay que sacar el coche rojo por la derecha." style="display:block;width:100%;height:auto">`;
      for (let i = 0; i < T; i++) s += `<rect x="${i % N}" y="${i / N | 0}" width="1" height="1" style="fill:var(--card);stroke:var(--line);stroke-width:.03"/>`;
      // carril del coche rojo (fila de la salida) con puntas de flecha hacia la salida
      s += `<rect x="0" y="2" width="${N}" height="1" style="fill:color-mix(in srgb,${ROJO} 10%,transparent)"/>`;
      for (let x = pos[0] + 2.35; x < N - .2; x += .55) s += `<path d="M${x} 2.36L${x + .2} 2.5L${x} 2.64" style="fill:none;stroke:${ROJO};stroke-width:.07;stroke-linecap:round;stroke-linejoin:round;opacity:.3"/>`;
      // borde del tablero con un hueco en la salida (fila 2, a la derecha)
      s += `<path d="M${N} 2V0H0V${N}H${N}V3" style="fill:none;stroke:var(--ink);stroke-width:.09;stroke-linejoin:round;stroke-linecap:round"/>`
         + `<path d="M${N + .12} 2.24 ${N + .46} 2.5 ${N + .12} 2.76z" style="fill:${dis && pos[0] == SAL ? 'var(--mint)' : ROJO};stroke:var(--ink);stroke-width:.05;stroke-linejoin:round"/>`;
      const ar = arrastre, cv = k => k ? COL[k % COL.length] : ROJO;
      if (!dis && kv >= 0 && Z.ve[kv]) {                                  // alcance del vehículo marcado
         const v = Z.ve[kv], [neg, mas] = holgura(Z.ve, pos, kv), q0 = pos[kv] - neg, [bx, by, bw, bh] = v.h ? [q0, v.c, v.l + neg + mas, 1] : [v.c, q0, 1, v.l + neg + mas];
         if (neg + mas) {
            s += `<rect x="${bx + .04}" y="${by + .04}" width="${bw - .08}" height="${bh - .08}" rx=".22" style="fill:color-mix(in srgb,var(--ink) 8%,transparent);stroke:var(--ink);stroke-width:.04;stroke-dasharray:.1 .08;opacity:.7"/>`;
            const fl = (cx, cy, dx, dy) => `<path d="M${cx - dy * .15 - dx * .08} ${cy + dx * .15 - dy * .08}L${cx + dx * .1} ${cy + dy * .1}L${cx + dy * .15 - dx * .08} ${cy - dx * .15 - dy * .08}" style="fill:none;stroke:var(--ink);stroke-width:.07;stroke-linecap:round;stroke-linejoin:round;opacity:.55"/>`;
            if (neg) s += v.h ? fl(bx + .3, by + .5, -1, 0) : fl(bx + .5, by + .3, 0, -1);
            if (mas) s += v.h ? fl(bx + bw - .3, by + .5, 1, 0) : fl(bx + .5, by + bh - .3, 0, 1)
         }
      }
      if (!dis && ar && Math.round(ar.off)) {                             // dónde se quedaría al soltar
         const v = Z.ve[ar.k], [gx, gy, gw, gh] = caja(v, pos[ar.k] + Math.round(ar.off));
         s += `<rect x="${gx + .07}" y="${gy + .07}" width="${gw - .14}" height="${gh - .14}" rx=".2" style="fill:color-mix(in srgb,${cv(ar.k)} 30%,transparent);stroke:var(--ink);stroke-width:.07;stroke-dasharray:.14 .1"/>`
      }
      const pt = !dis && p.pd >= 0 && p.pt >= 0 ? [p.pd, p.pt] : null;   // destino que aconseja la pista
      if (pt) { const [gx, gy, gw, gh] = caja(Z.ve[pt[0]], pt[1]); s += `<rect x="${gx + .05}" y="${gy + .05}" width="${gw - .1}" height="${gh - .1}" rx=".22" style="fill:color-mix(in srgb,var(--sky) 22%,transparent);stroke:var(--sky);stroke-width:.1"/>` }
      Z.ve.forEach((v, k) => {
         const off = ar && ar.k == k ? ar.off : 0, q = pos[k] + off;
         const x = v.h ? q : v.c, y = v.h ? v.c : q, w = v.h ? v.l : 1, h = v.h ? 1 : v.l, marca = k == kv && !dis, pista = pt && pt[0] == k;
         s += `<rect x="${x + .07}" y="${y + .07}" width="${w - .14}" height="${h - .14}" rx=".2" style="fill:${k ? `color-mix(in srgb,${COL[k % COL.length]} 70%,var(--card))` : ROJO};stroke:${pista ? 'var(--sky)' : marca ? 'var(--ink)' : 'color-mix(in srgb,var(--ink) 80%,transparent)'};stroke-width:${pista ? .14 : marca ? .13 : .06}"/>`;
         // brillo (da volumen) y faros/luna: dos rayas cortas en el sentido de la marcha para distinguir el coche del camión sin depender del color
         s += v.h ? `<rect x="${x + .2}" y="${y + .13}" width="${w - .4}" height=".1" rx=".05" style="fill:#fff;opacity:.3"/>` : `<rect x="${x + .13}" y="${y + .2}" width=".1" height="${h - .4}" rx=".05" style="fill:#fff;opacity:.3"/>`;
         const cx = x + w / 2, cy = y + h / 2;
         if (k) s += v.h ? `<path d="M${cx - .12} ${cy - .18}v.36M${cx + .12} ${cy - .18}v.36" style="stroke:var(--ink);stroke-width:.05;stroke-linecap:round;opacity:.45"/>` : `<path d="M${cx - .18} ${cy - .12}h.36M${cx - .18} ${cy + .12}h.36" style="stroke:var(--ink);stroke-width:.05;stroke-linecap:round;opacity:.45"/>`;
         if (k == 0) s += `<path d="M${cx - .22} ${cy}H${cx + .22}M${cx + .06} ${cy - .16}L${cx + .22} ${cy}L${cx + .06} ${cy + .16}" style="fill:none;stroke:var(--card);stroke-width:.08;stroke-linecap:round;stroke-linejoin:round"/>`
      });
      if (pt) {                                                           // chevron en el extremo del destino, en el sentido de la marcha
         const v = Z.ve[pt[0]], sg = Math.sign(pt[1] - pos[pt[0]]), [bx, by, bw, bh] = caja(v, pt[1]);
         const cx = v.h ? (sg > 0 ? bx + bw - .32 : bx + .32) : bx + .5, cy = v.h ? by + .5 : (sg > 0 ? by + bh - .32 : by + .32), dx = v.h ? sg : 0, dy = v.h ? 0 : sg;
         s += `<path d="M${cx - dy * .2 - dx * .12} ${cy + dx * .2 - dy * .12}L${cx + dx * .14} ${cy + dy * .14}L${cx + dy * .2 - dx * .12} ${cy - dx * .2 - dy * .12}" style="fill:none;stroke:var(--sky);stroke-width:.13;stroke-linecap:round;stroke-linejoin:round"/>`
      }
      return s + '</svg>'
   }
   function pinta() {
      const p = prog('ta'), Z = P(); ini(p);
      const b = $('#atb'); if (b) b.innerHTML = svgTablero(Z, p.pos, p, false);
      const c = $('#atc'); if (c) c.innerHTML = `Movimientos <b>${p.n}</b>`;
      const m = $('#atm'); if (m) m.textContent = msg
   }
   function atasco() {
      const p = prog('ta'); ini(p);
      const r = R('atasco'), Z = P(), lost = r && r.st == 'lost';
      const coche = `<svg viewBox="0 0 36 20" aria-hidden="true"><rect x="1.5" y="2.5" width="33" height="15" rx="6" style="fill:${ROJO};stroke:var(--ink);stroke-width:2"/><path d="M10 10H25M20 5.5 25 10 20 14.5" style="fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"/></svg>`;
      let b = `<div class="ddb atk"><div class="atg"><span class="atg-t">${coche}<span>Saca el <b>coche rojo</b> por la derecha</span></span><span id="atc" class="atg-n">Movimientos <b>${r && r.n != null ? r.n : p.n}</b></span></div>`
         + `<div class="atw"><div id="atb" data-b="atasco"${r ? '' : ` tabindex="0" role="application" aria-label="Tablero de Atasco. Enter para marcar el siguiente vehículo, flechas para deslizar el vehículo marcado una casilla."`} style="${r ? '' : 'touch-action:none;'}user-select:none;-webkit-user-select:none">${svgTablero(Z, lost ? resuelto(Z) : p.pos, p, !!r)}</div></div></div>`;
      if (!r) b += '<span class="sr" id="atl" aria-live="polite"></span>';
      if (lost) b += resRendida('Atasco', `Así se sacaba el coche rojo en ${Z.d} ${pls(Z.d, 'movimiento', 'movimientos')}. Vuelve mañana para un reto nuevo.`);
      else if (r) b += res(`¡Coche rojo fuera en ${mmss(r.t)}!`, `${r.n} ${pls(r.n, 'movimiento', 'movimientos')} (el mínimo era ${Z.d}). Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Atasco #${DAY} · ${r.n}/${Z.d} mov.${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''} · ${mmss(r.t)}`);
      else b += `${S.set.tm ? tmHtml(p) : ''}<p class="msg" id="atm" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, pista: 1, rendirme: 1 })}`
         + `<p class="foot" style="margin-top:8px;text-align:center"><b>Toca</b> un vehículo para ver hasta dónde puede llegar y <b>arrástralo</b> en línea recta. Deslizar uno varias casillas cuenta como <b>un movimiento</b>. Con teclado: <b>Tab</b> hasta el tablero, <b>Enter</b> para marcar un vehículo y las <b>flechas</b> para moverlo.</p>`;
      return shell('Atasco', b)
   }

   /* ----- Jugadas ----- */
   function final(p) {
      const Z = P();
      if (!R('atasco') && p.pos[0] == SAL) { Sfx.p('acierto'); fin('atasco', { st: 'completed', t: Date.now() - p.t0, n: p.n, par: Z.d, h: p.h || 0, c: 0 }); sv(); draw(); return true }
      return false
   }
   /* Desliza el vehículo k hasta la posición a (ya comprobado que el camino está libre). teclado = una casilla suelta con flechas: varias seguidas en el mismo sentido son un solo movimiento. */
   function coloca(p, k, a, teclado) {
      const de = p.pos[k], ult = p.m[p.m.length - 1];
      p.t0 = p.t0 || Date.now(); p.pd = p.pt = -1; msg = '';
      if (teclado && ult && ult[3] && ult[0] == k && Math.sign(ult[2] - ult[1]) == Math.sign(a - de)) ult[2] = a;
      else { p.m.push([k, de, a, teclado ? 1 : 0]); p.n++ }
      p.pos[k] = a; Sfx.p('tap', p.n % 5)
   }

   /* ----- Ratón y dedo: arrastrar un vehículo a lo largo de su línea ----- */
   const punto = (e, el) => { const q = el.getBoundingClientRect(); return [(e.clientX - q.left) / q.width * W, (e.clientY - q.top) / q.height * N] };
   const A = $('#app');
   A.addEventListener('pointerdown', e => {
      if (V != 'atasco' || R('atasco')) return;
      const b = e.target.closest('#atb'); if (!b) return;
      const [fx, fy] = punto(e, b), ix = Math.floor(fx), iy = Math.floor(fy);
      if (ix < 0 || iy < 0 || ix >= N || iy >= N) return;
      const p = prog('ta'); ini(p); const Z = P(), k = ocupa(Z.ve, p.pos, -1)[iy * N + ix];
      e.preventDefault(); try { b.setPointerCapture(e.pointerId) } catch (x) { }
      if (k < 0) { kv = -1; arrastre = null; return pinta() }
      const [neg, mas] = holgura(Z.ve, p.pos, k);
      if (neg + mas) msg = ''; else { msg = `El ${Z.ve[k].l == 3 ? 'camión' : 'coche'} ${NOMC[k % NOMC.length]} está bloqueado: mueve antes a quien lo tapa.`; Sfx.p('error') }
      kv = k; arrastre = { k, g0: Z.ve[k].h ? fx : fy, neg, mas, off: 0 }; pinta()
   });
   A.addEventListener('pointermove', e => {
      if (!arrastre || V != 'atasco' || R('atasco')) return;
      const b = $('#atb'); if (!b) return;
      const [fx, fy] = punto(e, b), Z = P(), a = arrastre, cur = Z.ve[a.k].h ? fx : fy;
      a.off = Math.max(-a.neg, Math.min(a.mas, cur - a.g0)); pinta()
   });
   A.addEventListener('pointerup', () => {
      if (!arrastre) return;
      const a = arrastre; arrastre = null;
      if (V != 'atasco' || R('atasco')) return;
      const p = prog('ta'), d = Math.round(a.off); ini(p);
      if (d) { coloca(p, a.k, p.pos[a.k] + d, false); if (final(p)) return; sv() }
      pinta()
   });
   A.addEventListener('pointercancel', () => { if (!arrastre) return; arrastre = null; if (V == 'atasco' && !R('atasco')) pinta() });

   /* ----- Teclado: Enter marca el siguiente vehículo (Mayús+Enter, el anterior); las flechas deslizan el marcado una casilla ----- */
   const DK = { ArrowLeft: [true, -1], ArrowRight: [true, 1], ArrowUp: [false, -1], ArrowDown: [false, 1] };
   const nombre = (Z, p, k) => `Vehículo ${NOMC[k % NOMC.length]}, ${Z.ve[k].l == 3 ? 'camión' : 'coche'} ${Z.ve[k].h ? 'horizontal' : 'vertical'}, ${Z.ve[k].h ? 'fila ' + (Z.ve[k].c + 1) + ', desde la columna ' + (p.pos[k] + 1) : 'columna ' + (Z.ve[k].c + 1) + ', desde la fila ' + (p.pos[k] + 1)}`;
   A.addEventListener('keydown', e => {
      if (V != 'atasco' || R('atasco') || e.target.id != 'atb' || e.ctrlKey || e.metaKey || e.altKey) return;
      const p = prog('ta'), Z = P(), k = e.key; ini(p);
      if (k == 'Enter' || k == ' ') {
         e.preventDefault(); const n = Z.ve.length; kv = kv < 0 ? (e.shiftKey ? n - 1 : 0) : (kv + (e.shiftKey ? n - 1 : 1)) % n;
         pinta(); Teclado.anuncia('atl', nombre(Z, p, kv))
      } else if (DK[k]) {
         e.preventDefault(); if (kv < 0) { kv = 0; pinta(); return Teclado.anuncia('atl', nombre(Z, p, kv)) }
         const [h, s] = DK[k], v = Z.ve[kv];
         if (v.h != h) { msg = `El vehículo ${NOMC[kv % NOMC.length]} solo se mueve ${v.h ? 'a izquierda y derecha' : 'arriba y abajo'}.`; Sfx.p('error'); pinta(); return Teclado.anuncia('atl', msg) }
         const [neg, mas] = holgura(Z.ve, p.pos, kv);
         if (s < 0 ? !neg : !mas) { msg = 'Ahí no se puede mover: hay otro vehículo o el borde.'; Sfx.p('error'); pinta(); return Teclado.anuncia('atl', msg) }
         coloca(p, kv, p.pos[kv] + s, true);
         if (!final(p)) { sv(); pinta(); Teclado.anuncia('atl', nombre(Z, p, kv)) }
      }
   });
   A.addEventListener('focusin', e => { if (V == 'atasco' && e.target.id == 'atb') pinta() });

   function undo() {
      const p = prog('ta'); ini(p);
      if (R('atasco') || !p.m.length) return;
      const [k, de] = p.m.pop(); p.pos[k] = de; p.pd = p.pt = -1; msg = ''; sv(); draw()      // los movimientos ya hechos siguen contando
   }
   function reiniciar() {
      const p = prog('ta'); ini(p);
      if (R('atasco') || !p.m.length) return;
      p.pos = P().pos.slice(); p.m = []; p.pd = p.pt = -1; kv = -1; msg = ''; sv(); draw()     // el contador, el tiempo y las pistas siguen contando
   }
   /* Pista: dice qué vehículo mover y hacia dónde para terminar en el mínimo de movimientos desde donde estás (no lo mueve por ti). */
   function pista() {
      const p = prog('ta'); ini(p); if (R('atasco')) return;
      const Z = P(), d = falta(Z, p.pos); let sig = null;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1;
      if (d > 0) vecinos(Z.ve, p.pos, (k, q) => { if (sig) return; const n = p.pos.slice(); n[k] = q; if (falta(Z, n) == d - 1) sig = [k, q] });
      if (!sig) { msg = 'Pista: no hay nada que mover.'; p.pd = p.pt = -1 }
      else {
         const [k, q] = sig, h = Z.ve[k].h, mas = q > p.pos[k], cuantas = Math.abs(q - p.pos[k]);
         p.pd = k; p.pt = q; msg = `Pista: mueve el ${Z.ve[k].l == 3 ? 'camión' : 'coche'} ${NOMC[k % NOMC.length]} ${cuantas} ${pls(cuantas, 'casilla', 'casillas')} ${h ? (mas ? 'a la derecha' : 'a la izquierda') : (mas ? 'hacia abajo' : 'hacia arriba')} (${d} ${pls(d, 'movimiento', 'movimientos')} para terminar).`
      }
      sv(); draw()
   }
   function rendirse() { if (R('atasco')) return; const p = prog('ta'); fin('atasco', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw() }

   DailyArcade.register({
      id: 'atasco', name: 'Atasco', desc: 'Desliza coches y camiones para dejar salir al coche rojo.', color: '--coral', tag: 'Saca el coche rojo',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="12" height="6" rx="2"/><path d="M18 12h4M20 10l2 2-2 2"/><path d="M6 15v3M12 15v3"/></svg>',
      how: ['Hay <b>coches</b> (2 casillas) y <b>camiones</b> (3). Cada uno solo se desliza en <b>línea recta</b>, hacia delante o hacia atrás, y no puede atravesar a otro.', 'Saca el <b>coche rojo</b> por la salida de la derecha. Deslizar un vehículo varias casillas cuenta como <b>un solo movimiento</b>.', 'Toca un vehículo para ver hasta dónde llega y arrástralo con el dedo o el ratón. Con teclado: <b>Tab</b> hasta el tablero, <b>Enter</b> para marcar un vehículo y las <b>flechas</b> para moverlo.'],
      /* Ejemplo: un camión bloquea al coche rojo; deslizarlo 2 casillas es 1 solo movimiento y el rojo sale. Mismo dibujo que el tablero. */
      demo: (() => {
         // h = horizontal · c = carril (fila si es horizontal, columna si es vertical) · p = primera casilla · l = largo · k = color
         const roj = { h: 1, c: 2, p: 0, l: 2, k: 0 }, cam = k => ({ h: 0, c: 3, p: k, l: 3, k: 1 });
         const otros = [{ h: 0, c: 5, p: 0, l: 2, k: 2 }, { h: 1, c: 4, p: 0, l: 2, k: 3 }];
         const cabeza = (x1, y1, x2, y2) => { const a = Math.atan2(y2 - y1, x2 - x1), h = .2, q = v => v.toFixed(2); return `M${q(x2 - h * Math.cos(a - .5))} ${q(y2 - h * Math.sin(a - .5))}L${q(x2)} ${q(y2)}L${q(x2 - h * Math.cos(a + .5))} ${q(y2 - h * Math.sin(a + .5))}` };
         const flecha = (x1, y1, x2, y2, c, disc) => `<path d="M${x1} ${y1}L${x2} ${y2}${cabeza(x1, y1, x2, y2)}" style="fill:none;stroke:${c};stroke-width:.1;stroke-linecap:round;stroke-linejoin:round${disc ? ';stroke-dasharray:.2 .15' : ''}"/>`;
         const tablero = (ve, extra, lbl) => {
            let s = `<svg viewBox="0 0 ${W} ${N}" role="img" aria-label="${lbl}">`;
            for (let i = 0; i < T; i++) s += `<rect x="${i % N}" y="${i / N | 0}" width="1" height="1" style="fill:var(--card);stroke:var(--line);stroke-width:.03"/>`;
            s += `<path d="M${N} 2V0H0V${N}H${N}V3" style="fill:none;stroke:var(--ink);stroke-width:.09;stroke-linejoin:round;stroke-linecap:round"/>`
               + `<path d="M${N + .12} 2.28 ${N + .42} 2.5 ${N + .12} 2.72z" style="fill:${ROJO};stroke:var(--ink);stroke-width:.04;stroke-linejoin:round"/>`;
            ve.forEach(v => {
               const x = v.h ? v.p : v.c, y = v.h ? v.c : v.p, w = v.h ? v.l : 1, h = v.h ? 1 : v.l, cx = x + w / 2, cy = y + h / 2;
               s += `<rect x="${x + .07}" y="${y + .07}" width="${w - .14}" height="${h - .14}" rx=".2" style="fill:${v.k ? `color-mix(in srgb,${COL[v.k]} 70%,var(--card))` : ROJO};stroke:color-mix(in srgb,var(--ink) 80%,transparent);stroke-width:.06"/>`;
               if (v.k) s += v.h ? `<path d="M${cx - .12} ${cy - .18}v.36M${cx + .12} ${cy - .18}v.36" style="stroke:var(--ink);stroke-width:.05;stroke-linecap:round;opacity:.45"/>` : `<path d="M${cx - .18} ${cy - .12}h.36M${cx - .18} ${cy + .12}h.36" style="stroke:var(--ink);stroke-width:.05;stroke-linecap:round;opacity:.45"/>`;
               else s += `<path d="M${cx - .22} ${cy}H${cx + .22}M${cx + .06} ${cy - .16}L${cx + .22} ${cy}L${cx + .06} ${cy + .16}" style="fill:none;stroke:var(--card);stroke-width:.08;stroke-linecap:round;stroke-linejoin:round"/>`
            });
            return s + extra + '</svg>'
         };
         const antes = tablero([roj, cam(1), ...otros], flecha(3.5, 1.75, 3.5, 3.45, 'var(--ink)', 0), 'Antes: el camión, en vertical, tapa la salida del coche rojo. Lo deslizas dos casillas hacia abajo.');
         const despues = tablero([roj, cam(3), ...otros], flecha(2.2, 2.5, 6.25, 2.5, ROJO, 1), 'Después: el camino está libre y el coche rojo sale por la derecha.');
         return `<p class="cap">El camión <b>tapa</b> la salida del coche rojo.</p>`
            + `<div class="dmg" style="--c:2"><figure>${antes}<figcaption><b>1.</b> Deslizas el camión <b>2 casillas</b> abajo: cuenta como <b>1 movimiento</b></figcaption></figure>`
            + `<figure>${despues}<figcaption><b>2.</b> El camino queda libre y el <b>coche rojo</b> sale</figcaption></figure></div>`
      })(),
      pk: 'ta',
      render: atasco,
      actions: { undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Completada · ${r.n}/${r.par} movimientos · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
