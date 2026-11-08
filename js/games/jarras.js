/* Juego: Jarras — hay 2 o 3 jarras sin marcas, de capacidades distintas, y un grifo. Hay que conseguir EXACTAMENTE los litros pedidos dentro de una jarra.
   Se puede llenar una jarra del todo, vaciarla del todo o verter una en otra hasta que la primera se vacíe o la segunda se llene.
   El reto sale de la fecha (SD). Se eligen capacidades al azar, se hace una anchura (BFS) por todos los estados posibles y se saca, para cada objetivo,
   el MÍNIMO de movimientos. Solo se aceptan objetivos que piden un mínimo largo (no vale uno que sea la capacidad de una jarra): siempre tiene solución.
   La victoria se comprueba por reglas (alguna jarra con los litros pedidos), no contra la solución guardada. */
(function () {
   const FACIL = WD == 1 || WD == 2, NJ = FACIL ? 2 : 3;
   const [LO, HI] = FACIL ? [6, 11] : [7, 12];                          // mínimo de movimientos aceptado (mín. y máx.)
   const CMAX = FACIL ? 11 : 13;
   const COL = ['var(--sky)', 'var(--mint)', 'var(--coral)'];
   const pls = (n, a, b) => n == 1 ? a : b;

   /* Un movimiento es un texto: «f0» llena la jarra 0, «e1» vacía la 1, «p02» vierte la 0 en la 2. */
   const movs = () => { const m = []; for (let k = 0; k < NJ; k++) { m.push('f' + k, 'e' + k); for (let j = 0; j < NJ; j++) if (j != k) m.push('p' + k + j) } return m };
   const MOVS = movs();
   function aplica(cap, s, mv) {
      const t = s.slice(), k = +mv[1];
      if (mv[0] == 'f') t[k] = cap[k];
      else if (mv[0] == 'e') t[k] = 0;
      else { const j = +mv[2], q = Math.min(t[k], cap[j] - t[j]); t[k] -= q; t[j] += q }
      return t
   }
   const mismo = (a, b) => a.every((v, i) => v == b[i]);
   const logrado = (Z, s) => s.some(v => v == Z.obj);
   const lit = n => `${n} ${pls(n, 'litro', 'litros')}`;
   const dice = (Z, mv) => mv[0] == 'f' ? `llena la jarra de ${Z.cap[+mv[1]]}` : mv[0] == 'e' ? `vacía la jarra de ${Z.cap[+mv[1]]}` : `vierte la jarra de ${Z.cap[+mv[1]]} en la de ${Z.cap[+mv[2]]}`;

   /* Anchura desde el estado s0 hasta que alguna jarra tenga Z.obj. Devuelve la lista de movimientos más corta ([] si ya está; null si no se puede). */
   function busca(Z, s0) {
      const cl = s => s.join(','), ant = new Map([[cl(s0), null]]), cola = [s0];
      for (let h = 0; h < cola.length; h++) {
         const s = cola[h];
         if (logrado(Z, s)) { const r = []; let k = cl(s); while (ant.get(k)) { r.unshift(ant.get(k)[1]); k = ant.get(k)[0] } return r }
         for (const mv of MOVS) {
            const t = aplica(Z.cap, s, mv), k = cl(t); if (ant.has(k)) continue;
            ant.set(k, [cl(s), mv]); cola.push(t)
         }
      }
      return null
   }

   /* ----- Generación ----- */
   function gen() {
      const r = rng(SD * 71 + 5), rnd = n => Math.floor(r() * n);
      for (let t = 0; t < 400; t++) {
         const cap = []; while (cap.length < NJ) { const c = 3 + rnd(CMAX - 2); if (!cap.includes(c)) cap.push(c) }
         cap.sort((a, b) => a - b);
         if (NJ == 3 && (cap[1] % cap[0] == 0 || cap[2] % cap[1] == 0)) continue;           // con jarras que son múltiplo de otra se resuelve demasiado fácil
         // mínimo de movimientos para cada objetivo posible
         const cl = s => s.join(','), dist = new Map([[cl(Array(NJ).fill(0)), 0]]), cola = [Array(NJ).fill(0)], mejor = {};
         for (let h = 0; h < cola.length; h++) {
            const s = cola[h], d = dist.get(cl(s));
            for (const v of s) if (v > 0 && !(v in mejor)) mejor[v] = d;
            for (const mv of MOVS) { const q = aplica(cap, s, mv), k = cl(q); if (!dist.has(k)) { dist.set(k, d + 1); cola.push(q) } }
         }
         const op = Object.keys(mejor).map(Number).filter(v => !cap.includes(v) && mejor[v] >= LO && mejor[v] <= HI);
         if (!op.length) continue;
         const obj = op[rnd(op.length)], Z = { cap, obj };
         return { cap, obj, sol: busca(Z, Array(NJ).fill(0)) }
      }
      // reserva (nunca debería hacer falta): 3 y 5 litros para medir 4
      const Z = { cap: [3, 5], obj: 4 };
      return { cap: Z.cap, obj: 4, sol: busca(Z, [0, 0]), reserva: true }
   }
   const P = memoSD(gen);                                                // se regenera si cambia la semilla (SD)

   /* Progreso: p.m = movimientos hechos (para Deshacer) · p.n = movimientos contados (deshacer no los devuelve) · p.h = pistas · p.g = huella del reto. */
   const ini = p => { const Z = P(), g = Z.cap.join('.') + ':' + Z.obj; if (!Array.isArray(p.m) || p.g != g) { p.m = []; p.n = 0; p.h = 0; p.pd = null; p.g = g } };
   const estado = (Z, m) => m.reduce((s, mv) => aplica(Z.cap, s, mv), Array(Z.cap.length).fill(0));

   /* ----- Dibujo ----- */
   function svgJarra(Z, k, v, hl) {
      const c = Z.cap[k], u = 118 / Math.max(...Z.cap), h = c * u, y0 = 156, x0 = 22, w = 56;
      let s = `<svg viewBox="0 0 100 172" aria-hidden="true" style="display:block;width:100%;height:auto;max-width:112px;margin:0 auto">`;
      s += `<rect x="${x0}" y="${y0 - h}" width="${w}" height="${h}" rx="6" style="fill:var(--card);stroke:none"/>`;
      if (v > 0) s += `<rect x="${x0}" y="${y0 - v * u}" width="${w}" height="${v * u}" rx="${v == c ? 6 : 2}" style="fill:color-mix(in srgb,${COL[k]} 55%,var(--card))"/>`;
      for (let i = 1; i < c; i++) s += `<path d="M${x0} ${y0 - i * u}h${i % 5 ? 7 : 12}" style="stroke:var(--ink);stroke-width:1;opacity:.35"/>`;
      s += `<rect x="${x0}" y="${y0 - h}" width="${w}" height="${h}" rx="6" style="fill:none;stroke:${hl ? 'var(--mint)' : 'var(--ink)'};stroke-width:${hl ? 5 : 3}"/>`;
      s += `<text x="50" y="${y0 - h / 2 + 7}" text-anchor="middle" style="fill:var(--ink);font:800 20px 'Bricolage Grotesque',system-ui,sans-serif">${v}</text>`;
      s += `<text x="50" y="14" text-anchor="middle" style="fill:var(--ink);font:700 12px 'Bricolage Grotesque',system-ui,sans-serif;opacity:.8">de ${c} L</text>`;
      return s + '</svg>'
   }
   const btn = (a, k, j, txt, label, pd) => `<button class="btn${pd ? ' pista' : ''}" data-a="${a}" data-k="${k}"${j == null ? '' : ` data-j="${j}"`} aria-label="${label}" style="padding:6px 4px;font-size:.85rem;min-width:0;width:100%${pd ? ';box-shadow:0 0 0 4px var(--sky)' : ''}">${txt}</button>`;
   function jarras() {
      const p = prog('ja'); ini(p);
      const r = R('jarras'), Z = P(), lost = r && r.st == 'lost', s = estado(Z, p.m), n = Z.cap.length;
      const pd = p.pd;                                                   // movimiento aconsejado por la pista (se resalta su botón)
      let b = `<p class="cap" style="text-align:center;margin:8px 0 0;font-size:1rem">Consigue <b style="font-size:1.35em">${lit(Z.obj)}</b> exactamente en una jarra</p>`;
      b += `<div class="ddb" data-b="jarras" style="display:grid;grid-template-columns:repeat(${n},1fr);gap:6px;padding:10px 6px">`;
      for (let k = 0; k < n; k++) {
         const sv_ = lost ? Z.sol.reduce((a, mv) => aplica(Z.cap, a, mv), Array(n).fill(0))[k] : s[k], hl = !!r && !lost && s[k] == Z.obj || lost && sv_ == Z.obj;
         b += `<div style="display:flex;flex-direction:column;gap:5px;align-items:stretch;min-width:0">${svgJarra(Z, k, sv_, hl)}`;
         if (!r) {
            b += btn('jf', k, null, 'Llenar', `Llenar la jarra de ${Z.cap[k]} litros`, pd == 'f' + k) + btn('je', k, null, 'Vaciar', `Vaciar la jarra de ${Z.cap[k]} litros`, pd == 'e' + k);
            for (let j = 0; j < n; j++) if (j != k) b += btn('jp', k, j, `→ ${Z.cap[j]} L`, `Verter la jarra de ${Z.cap[k]} litros en la de ${Z.cap[j]}`, pd == 'p' + k + j)
         }
         b += '</div>'
      }
      b += '</div>';
      b += `<span class="sr" role="status">${Z.cap.map((c, k) => `Jarra de ${c} litros: ${s[k]}`).join('. ')}. Objetivo: ${lit(Z.obj)}.</span>`;
      if (lost) b += resRendida('Jarras', `Una solución de ${Z.sol.length} movimientos: ${Z.sol.map(mv => dice(Z, mv)).join(', ')}. Vuelve mañana para un reto nuevo.`);
      else if (r) b += res(`¡${lit(Z.obj)} conseguidos en ${mmss(r.t)}!`, `${r.n} ${pls(r.n, 'movimiento', 'movimientos')} (el mínimo era ${Z.sol.length}). Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Jarras #${DAY} · ${Z.cap.join('-')} → ${Z.obj} · ${r.n}/${Z.sol.length} mov.${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''} · ${mmss(r.t)}`);
      else b += `<p class="cap" style="text-align:center;margin:0">Movimientos: <b>${p.n}</b></p>`
         + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, pista: 1, rendirme: 1 })}`
         + `<p class="foot" style="margin-top:8px;text-align:center">Las jarras no tienen marcas: solo se sabe cuánto hay al llenar, vaciar o verter. Al verter, sale agua hasta que la jarra de origen se vacía o la de destino se llena.</p>`;
      return shell('Jarras', b)
   }

   /* ----- Jugadas ----- */
   function hacer(mv) {
      if (R('jarras')) return;
      const p = prog('ja'); ini(p); const Z = P(), s = estado(Z, p.m), t = aplica(Z.cap, s, mv);
      if (mismo(s, t)) {
         msg = mv[0] == 'f' ? 'Esa jarra ya está llena.' : mv[0] == 'e' ? 'Esa jarra ya está vacía.' : 'No cambia nada: la de origen está vacía o la de destino, llena.';
         Sfx.p('error'); return draw()
      }
      p.t0 = p.t0 || Date.now(); p.m.push(mv); p.n++; p.pd = null; msg = ''; Sfx.p('pon', p.n % 5);
      if (logrado(Z, t)) { Sfx.p('acierto'); fin('jarras', { st: 'completed', t: Date.now() - p.t0, n: p.n, par: Z.sol.length, h: p.h || 0, c: 0 }) }
      sv(); draw()
   }
   const jf = b => hacer('f' + b.dataset.k), je = b => hacer('e' + b.dataset.k), jp = b => hacer('p' + b.dataset.k + b.dataset.j);
   function undo() {
      const p = prog('ja'); ini(p);
      if (R('jarras') || !p.m.length) return;
      p.m.pop(); p.pd = null; msg = ''; sv(); draw()                      // los movimientos ya hechos siguen contando
   }
   function reiniciar() {
      const p = prog('ja'); ini(p);
      if (R('jarras') || !p.m.length) return;
      p.m = []; p.pd = null; msg = ''; sv(); draw()                       // el contador, el tiempo y las pistas siguen contando
   }
   /* Pista: dice cuál es el mejor siguiente movimiento desde donde estás (no lo hace por ti). */
   function pista() {
      const p = prog('ja'); ini(p); if (R('jarras')) return;
      const Z = P(), c = busca(Z, estado(Z, p.m));
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1;
      if (!c || !c.length) { msg = 'Pista: reinicia y vuelve a empezar.'; p.pd = null }
      else { p.pd = c[0]; msg = `Pista: lo mejor ahora es que ${dice(Z, c[0])} (${c.length} ${pls(c.length, 'movimiento', 'movimientos')} para terminar).` }
      sv(); draw()
   }
   function rendirse() { if (R('jarras')) return; const p = prog('ja'); fin('jarras', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw() }

   DailyArcade.register({
      id: 'jarras', name: 'Jarras', desc: 'Llena, vacía y vierte jarras sin marcas hasta medir los litros exactos.', color: '--lav', tag: 'Mide los litros exactos',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l-1 16H8z"/><path d="M7.6 11h8.8"/></svg>',
      how: ['Tienes unas <b>jarras sin marcas</b> y un grifo. Hay que conseguir <b>exactamente</b> los litros pedidos dentro de una jarra.', 'Puedes <b>llenar</b> una jarra del todo, <b>vaciarla</b> del todo o <b>verterla</b> en otra: sale agua hasta que la primera se vacía o la segunda se llena.', 'Cuenta cada movimiento: intenta acercarte al <b>mínimo</b>.'],
      pk: 'ja',
      render: jarras,
      actions: { jf, je, jp, undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Completada · ${r.n}/${r.par} movimientos · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
