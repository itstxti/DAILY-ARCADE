/* Juego: Balanza — una viga con 10 huecos (5 a cada lado del centro). Hay pesas fijas ya colocadas y unas pesas sueltas en la bandeja.
   Hay que colocar TODAS las sueltas para que la viga quede en equilibrio: el peso × la distancia al centro de un lado
   tiene que igualar al del otro (momento de fuerza).
   El reto sale de la fecha. Se eligen las pesas al azar y se buscan por fuerza bruta TODAS las formas de colocar las sueltas
   que equilibran la viga: solo se aceptan retos con solución y con pocas soluciones distintas (cuantas menos, más difícil dar con ella).
   La viga no se inclina sola: «Comprobar» la pesa y enseña hacia dónde cae ("se inclina a la izquierda").
   La victoria se comprueba por reglas (todas colocadas y momento total = 0), no contra una solución guardada. */
(function () {
   const LADO = 5, HU = 2 * LADO;                                        // huecos por lado y huecos en total
   const POS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];                       // distancia (con signo) de cada hueco al centro
   const pls = (n, a, b) => n == 1 ? a : b;
   /* Pesas sueltas (K), pesas fijas (F) y máximo de soluciones distintas, según el día de la semana (0 = domingo): lunes y martes, el más fácil. */
   const [K, F, TOPE] = [[4, 3, 3], [3, 2, 2], [3, 2, 2], [4, 3, 3], [4, 3, 3], [5, 4, 3], [5, 4, 3]][WD];

   /* Todas las formas de poner las pesas sueltas ws en huecos libres (distintos) con el momento total de la viga a 0.
      Se para en cuanto hay más de `tope` (no hace falta contarlas todas). */
   function soluciones(fijas, ws, tope) {
      const ocup = new Set(fijas.map(f => f.i)), T0 = fijas.reduce((a, f) => a + f.w * POS[f.i], 0), out = [], cur = Array(ws.length).fill(-1);
      (function rec(k, t) {
         if (out.length > tope) return;
         if (k == ws.length) { if (t == 0) out.push(cur.slice()); return }
         for (let i = 0; i < HU; i++) { if (ocup.has(i)) continue; ocup.add(i); cur[k] = i; rec(k + 1, t + ws[k] * POS[i]); ocup.delete(i) }
      })(0, T0);
      return out
   }

   function gen() {
      const r = rng(SD * 61 + 7);
      for (let t = 0; t < 3000; t++) {
         const tope = TOPE + Math.floor(t / 1000);                         // si cuesta, se admiten algo más de soluciones
         const huecos = shuf([...Array(HU).keys()], r), fijas = huecos.slice(0, F).map(i => ({ i, w: 1 + Math.floor(r() * 9) }));
         const ws = shuf([1, 2, 3, 4, 5, 6, 7, 8, 9], r).slice(0, K).sort((a, b) => b - a);   // pesas sueltas distintas, de mayor a menor
         const sols = soluciones(fijas, ws, tope);
         if (sols.length && sols.length <= tope) return { fijas, ws, sols }
      }
      const fijas = [{ i: 0, w: 2 }], ws = [5];                            // reto de reserva: 2 × 5 a la izquierda = 5 × 2 a la derecha
      return { fijas, ws, sols: soluciones(fijas, ws, 99) }
   }
   const P = memoSD(gen); // se regenera si cambia la semilla (SD): reto del día o ronda de duelo

   /* Progreso: p.s[k] = hueco donde está la pesa suelta k (-1 = en la bandeja) · p.lk[k] = hueco al que la fijó una pista (-1 = libre) ·
      p.tilt = lo que vio la última comprobación (-1 izquierda, 0 equilibrio, 1 derecha) · p.h = pistas · p.c = comprobaciones. */
   const ini = p => { if (!Array.isArray(p.s)) { p.s = P().ws.map(() => -1); p.lk = P().ws.map(() => -1); p.h = 0; p.c = 0; p.tilt = null } };
   const momento = (p, s = p.s) => P().fijas.reduce((a, f) => a + f.w * POS[f.i], 0) + P().ws.reduce((a, w, k) => a + (s[k] >= 0 ? w * POS[s[k]] : 0), 0);
   const todas = p => p.s.every(v => v >= 0);
   /* Tras deshacer o reiniciar, lo fijado por una pista vuelve a su hueco. */
   const refija = p => p.lk.forEach((h, k) => { if (h < 0) return; p.s.forEach((v, q) => { if (q != k && v == h) p.s[q] = -1 }); p.s[k] = h });

   const dist = i => Math.abs(POS[i]), lado = i => POS[i] < 0 ? 'izquierda' : 'derecha';
   const bloque = (w, cl = '') => `<span class="bzk${cl}" style="--h:${w * 38}">${w}</span>`;

   /* Dibuja una viga de n huecos por lado. celda(i) devuelve el contenido del hueco i; ang = inclinación en grados. */
   function viga(n, celda, ang, cls = '') {
      let r = '', t = '';
      for (let c = 0; c <= 2 * n; c++) {
         if (c == n) { r += '<span class="bzc" aria-hidden="true"></span>'; t += '<span></span>'; continue }
         r += celda(c < n ? c : c - 1); t += `<span>${Math.abs(c - n)}</span>`
      }
      return `<div class="bz${cls}"><div class="bzb" style="--a:${ang}deg"><div class="bzr" style="--n:${2 * n + 1}">${r}</div><div class="bzbar"></div><div class="bzd" style="--n:${2 * n + 1}" aria-hidden="true">${t}</div></div><div class="bzp" aria-hidden="true"></div></div>`
   }

   function balanza() {
      const p = prog('bz'); ini(p);
      const r = R('balanza'), Z = P(), lost = r && r.st == 'lost', s = lost ? Z.sols[0] : p.s;
      if (sel != null && (sel >= Z.ws.length || p.s[sel] >= 0 || r)) sel = null;
      const ang = r ? 0 : p.tilt == null ? 0 : p.tilt * 7;
      const fij = new Map(Z.fijas.map(f => [f.i, f.w]));
      const celda = i => {
         const k = s.indexOf(i), fw = fij.get(i), d = `Hueco a distancia ${dist(i)} a la ${lado(i)}`;
         if (fw != null) return `<span class="bzs fx" role="img" aria-label="${d}: pesa fija de ${fw}">${bloque(fw, ' fix')}</span>`;
         const libre = k < 0, obj = !r && sel != null && libre;
         return `<button class="bzs${obj ? ' tg' : ''}" data-a="bs" data-i="${i}"${r ? ' disabled' : ''} aria-label="${d}: ${libre ? 'vacío' : 'pesa de ' + Z.ws[k]}">${libre ? '' : bloque(Z.ws[k], !r && p.lk[k] >= 0 ? ' lk' : '')}</button>`
      };
      const bandeja = Z.ws.map((w, k) => p.s[k] < 0 ? `<button class="bzy${sel === k ? ' sel' : ''}" data-a="bw" data-k="${k}" aria-pressed="${sel === k}" aria-label="Pesa de ${w}">${bloque(w)}</button>` : '').join('');
      let h = `<div data-rv="bz-viga" role="group" aria-label="Viga con 5 huecos a cada lado del centro">${viga(LADO, celda, ang, r && r.st != 'lost' ? ' ok' : '')}</div>`;
      if (r && r.st == 'lost') h += resRendida('Balanza', 'Así quedaba en equilibrio: cada pesa × su distancia al centro suma lo mismo a los dos lados. Vuelve mañana para un reto nuevo.');
      else if (r) h += res(`¡Equilibrio en ${mmss(r.t)}!`, 'La viga queda plana: los dos lados pesan lo mismo. Vuelve mañana para un reto nuevo.',
         `Daily Arcade · Balanza #${DAY} · ${mmss(r.t)}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}${r.c ? ' · ' + r.c + pls(r.c, ' comprobación', ' comprobaciones') : ''}`);
      else h += `<p class="cap" style="text-align:center;margin:4px 0">Pesas grises: fijas. El número de abajo es la distancia al centro.</p>`
         + `<div class="bzt2" data-rv="bz-pesas" role="group" aria-label="Pesas por colocar">${bandeja || '<span class="cap">Todas las pesas están en la viga.</span>'}</div>`
         + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, comprobar: 1, pista: 1, rendirme: 1 })}`;
      return shell('Balanza', h)
   }

   /* Después de cada cambio: ¿están todas colocadas y la viga en equilibrio? */
   function revisa(p) {
      if (!todas(p)) return;
      if (momento(p) == 0) fin('balanza', { st: 'completed', t: Date.now() - p.t0, h: p.h || 0, c: p.c || 0 });
      else msg = 'Están todas colocadas, pero la viga no está en equilibrio.'
   }

   function bw(b) {
      if (R('balanza')) return;
      const p = prog('bz'); ini(p); p.t0 = p.t0 || Date.now();
      const k = +b.dataset.k; sel = sel === k ? null : k; msg = ''; Sfx.p('tap'); sv(); draw()
   }

   function bs(b) {
      if (R('balanza')) return;
      const p = prog('bz'); ini(p); p.t0 = p.t0 || Date.now();
      const i = +b.dataset.i, o = p.s.indexOf(i);
      if (o >= 0 && p.lk[o] >= 0) { msg = 'Esa pesa la fijó una pista y no se puede mover.'; Sfx.p('error'); return draw() }
      if (sel == null) {
         if (o < 0) { msg = 'Elige primero una pesa de la bandeja.'; Sfx.p('error'); return draw() }
         hist.push(p.s.slice()); p.s[o] = -1; sel = o; p.tilt = null; msg = ''; Sfx.p('borra'); sv(); return draw()   // coger una pesa de la viga
      }
      hist.push(p.s.slice());
      if (o >= 0) p.s[o] = -1;                                                  // la que había vuelve a la bandeja
      p.s[sel] = i; Sfx.p('pon', P().ws[sel]); sel = null; p.tilt = null; msg = '';
      revisa(p); sv(); draw()
   }

   function undo() {
      const p = prog('bz'); ini(p);
      if (R('balanza') || !hist.length) return;
      p.s = hist.pop(); refija(p); sel = null; p.tilt = null; msg = ''; sv(); draw()
   }

   function reiniciar() {
      const p = prog('bz'); ini(p);
      if (R('balanza')) return;
      const n = p.s.map((v, k) => p.lk[k] >= 0 ? v : -1);
      if (n.join() == p.s.join()) return;
      hist.push(p.s.slice()); p.s = n; sel = null; p.tilt = null; msg = ''; sv(); draw()   // tiempo, pistas y comprobaciones siguen contando
   }

   /* Comprobar: pesa la viga con lo que hay puesto y enseña hacia dónde se inclina. */
   function comprobar() {
      const p = prog('bz'); ini(p);
      if (R('balanza')) return;
      if (p.s.every(v => v < 0)) { msg = 'Coloca alguna pesa antes de comprobar.'; Sfx.p('error'); return draw() }
      p.t0 = p.t0 || Date.now(); p.c = (p.c || 0) + 1;
      const m = momento(p), falta = p.s.filter(v => v < 0).length; p.tilt = Math.sign(m);
      Sfx.p('tap');
      msg = m < 0 ? 'Se inclina a la izquierda.' : m > 0 ? 'Se inclina a la derecha.' : 'Está en equilibrio…';
      if (falta) msg += ` Faltan ${falta} ${pls(falta, 'pesa', 'pesas')} por colocar.`;
      sv(); draw()
   }

   /* Pista: coloca y fija una pesa en un hueco que forma parte de una solución (la más parecida a lo que ya hay fijado y puesto). */
   function pista() {
      const p = prog('bz'); ini(p);
      if (R('balanza')) return;
      const Z = P(), compat = Z.sols.filter(x => p.lk.every((h, k) => h < 0 || x[k] == h)), cand = compat.length ? compat : Z.sols;
      const afin = x => p.s.reduce((a, v, k) => a + (v == x[k] ? 1 : 0), 0), sol = cand.reduce((a, x) => afin(x) > afin(a) ? x : a, cand[0]);
      const k = p.s.findIndex((v, q) => p.lk[q] < 0 && v != sol[q]);              // la más pesada que aún no está en su sitio (ws va de mayor a menor)
      if (k < 0) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; hist.push(p.s.slice());
      const o = p.s.indexOf(sol[k]); if (o >= 0 && o != k) p.s[o] = -1;
      p.s[k] = sol[k]; p.lk[k] = sol[k]; sel = null; p.tilt = null;
      msg = `Pista: la pesa de ${Z.ws[k]} va a distancia ${dist(sol[k])}, a la ${lado(sol[k])}.`;
      revisa(p); sv(); draw()
   }

   function rendirse() {
      if (R('balanza')) return;
      const p = prog('bz'); fin('balanza', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw()
   }

   DailyArcade.register({
      id: 'balanza', name: 'Balanza', desc: 'Coloca las pesas para dejar la viga en equilibrio.', color: '--aqua', tag: 'Equilibra la viga',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v14M7 20h10"/><path d="M4 7.5l16-2"/><path d="M4 7.5l-2 5a2.5 2.5 0 0 0 4 0zM20 5.5l-2 5a2.5 2.5 0 0 0 4 0z"/></svg>',
      how: ['Coloca <b>todas las pesas</b> de la bandeja en la viga: toca una pesa y luego un hueco.', 'Para que quede plana, <b>peso × distancia</b> al centro de un lado debe igualar al del otro. Las pesas grises ya están fijas.', '<b>Comprobar</b> pesa la viga y te dice hacia qué lado se inclina.'],
      demo: `<p class="cap">Una pesa de 2 a distancia 3 equilibra una de 3 a distancia 2: <b>2 × 3 = 3 × 2</b>.</p>${viga(3, i => `<span class="bzs">${i == 0 ? bloque(2) : i == 4 ? bloque(3) : ''}</span>`, 0, ' mini')}`,
      pk: 'bz',
      render: balanza,
      actions: { bw, bs, undo, reiniciar, comprobar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Equilibrada · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();