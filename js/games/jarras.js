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
   /* Jarra: el agua se dibuja a su altura máxima (entre antes y ahora) y se escala en vertical, así al cambiar sube o baja suave (ver animar).
      La línea punteada marca el objetivo en las jarras donde cabe. */
   function svgJarra(Z, k, v, hl, from, meta) {
      const c = Z.cap[k], u = 124 / Math.max(...Z.cap), h = c * u, y0 = 134, x0 = 22, w = 56, top = y0 - h, mx = Math.max(v, from);
      let s = `<svg class="jrj" viewBox="0 0 100 140" aria-hidden="true"><clipPath id="jcl${k}"><rect x="${x0}" y="${top}" width="${w}" height="${h}" rx="6"/></clipPath>`;
      s += `<rect x="${x0}" y="${top}" width="${w}" height="${h}" rx="6" style="fill:var(--card)"/>`;
      if (mx > 0) s += `<g clip-path="url(#jcl${k})"><g class="jw"${v != from ? ` data-f="${from / mx}" data-t="${v / mx}"` : ''} style="transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(${v / mx})">`
         + `<rect x="${x0}" y="${y0 - mx * u}" width="${w}" height="${mx * u}" style="fill:color-mix(in srgb,${COL[k]} 58%,var(--card))"/>`
         + `<rect x="${x0}" y="${y0 - mx * u}" width="${w}" height="4" style="fill:#fff;opacity:.4"/></g></g>`;
      for (let i = 1; i < c; i++) s += `<path d="M${x0} ${y0 - i * u}h${i % 5 ? 7 : 12}" style="stroke:var(--ink);stroke-width:1;opacity:.35"/>`;
      if (h > 34) s += `<rect x="${x0 + 8}" y="${top + 14}" width="4" height="${h - 30}" rx="2" style="fill:#fff;opacity:.2"/>`;
      if (meta != null && meta < c) s += `<path d="M${x0 - 5} ${y0 - meta * u}H${x0 + w + 4}" style="stroke:var(--berry);stroke-width:2;stroke-dasharray:4 3;stroke-linecap:round"/>`
         + `<text x="${x0 + w + 7}" y="${y0 - meta * u + 4}" style="fill:var(--berry);font:800 11px 'Bricolage Grotesque',system-ui,sans-serif">${meta}</text>`;
      s += `<rect x="${x0}" y="${top}" width="${w}" height="${h}" rx="6" style="fill:none;stroke:${hl ? 'var(--mint)' : 'var(--ink)'};stroke-width:${hl ? 5 : 3}"/>`;
      s += `<rect x="${x0 - 4}" y="${top - 2}" width="${w + 8}" height="6" rx="3" style="fill:var(--card);stroke:${hl ? 'var(--mint)' : 'var(--ink)'};stroke-width:2.5"/>`;
      s += `<text x="50" y="${Math.min(y0 - 8, y0 - h / 2 + 8)}" text-anchor="middle" style="fill:var(--ink);font:800 22px 'Bricolage Grotesque',system-ui,sans-serif;paint-order:stroke;stroke:var(--card);stroke-width:3px;stroke-opacity:.55">${v}</text>`;
      return s + '</svg>'
   }
   const IC = {
      llenar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c3.2 4 5.2 6.6 5.2 9.4a5.2 5.2 0 0 1-10.4 0C6.8 9.6 8.8 7 12 3z"/></svg>',
      vaciar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M7.5 10 12 14.5 16.5 10M5 20h14"/></svg>',
      verter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 7l5 5-5 5"/></svg>'
   };
   const btn = (a, k, j, txt, label, pd, off) => `<button class="btn jrb${pd ? ' pista' : ''}" data-a="${a}" data-k="${k}"${j == null ? '' : ` data-j="${j}"`} aria-label="${label}" title="${label}"${off ? ' disabled' : ''}>${txt}</button>`;
   let prev = null;                                                          // niveles dibujados la última vez (para animar el cambio)
   function animar() {
      const gs = document.querySelectorAll('.jw[data-f]');
      gs.forEach(g => {
         const a = g.dataset.f, b = g.dataset.t; g.removeAttribute('data-f');
         if (g.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) g.animate([{ transform: `scaleY(${a})` }, { transform: `scaleY(${b})` }], { duration: 480, easing: 'cubic-bezier(.3,.1,.3,1)' })
      })
   }
   function jarras() {
      const p = prog('ja'); ini(p);
      const r = R('jarras'), Z = P(), lost = r && r.st == 'lost', s = estado(Z, p.m), n = Z.cap.length;
      const vis = lost ? Z.sol.reduce((a, mv) => aplica(Z.cap, a, mv), Array(n).fill(0)) : s;     // lo que se ve (al rendirse, la solución)
      const key = Z.cap.join('.') + ':' + Z.obj, from = prev && prev.k == key ? prev.s : vis;
      prev = { k: key, s: vis.slice() };
      if (vis.some((x, i) => x != from[i])) requestAnimationFrame(animar);
      const pd = p.pd;                                                   // movimiento aconsejado por la pista (se resalta su botón)
      let b = `<div class="ddb" data-b="jarras"><div class="jrg">${IC.llenar}<span>Consigue <b>${lit(Z.obj)}</b> exactamente en una jarra</span></div>`;
      b += `<div class="jrs" style="--n:${n}">`;
      for (let k = 0; k < n; k++) {
         const hl = !!r && !lost && vis[k] == Z.obj || lost && vis[k] == Z.obj;
         b += `<div class="jrc"><span class="jrk" style="--jc:${COL[k]}"><i></i>${Z.cap[k]} L</span>${svgJarra(Z, k, vis[k], hl, from[k], r ? null : Z.obj)}`;
         if (!r) {
            const off = mv => !(pd == mv) && mismo(s, aplica(Z.cap, s, mv));      // jugadas que no cambian nada se desactivan
            b += btn('jf', k, null, `${IC.llenar}Llenar`, `Llenar la jarra de ${Z.cap[k]} litros`, pd == 'f' + k, off('f' + k)) + btn('je', k, null, `${IC.vaciar}Vaciar`, `Vaciar la jarra de ${Z.cap[k]} litros`, pd == 'e' + k, off('e' + k));
            for (let j = 0; j < n; j++) if (j != k) b += btn('jp', k, j, `${IC.verter}<i class="jsw" style="--jc:${COL[j]}"></i>${Z.cap[j]} L`, `Verter la jarra de ${Z.cap[k]} litros en la de ${Z.cap[j]}`, pd == 'p' + k + j, off('p' + k + j))
         }
         b += '</div>'
      }
      b += '</div></div>';
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
      /* Ejemplo: medir 1 litro con jarras de 3 y 5 (llenar, verter, llenar, verter). Mismo dibujo y colores que el juego. */
      demo: (() => {
         const cap = [3, 5], u = 13, y0 = 80, w = 26, xs = [8, 42], f = "font-family:'Bricolage Grotesque',system-ui,sans-serif;text-anchor:middle";
         const pasos = [
            { s: [3, 0], t: '<b>1.</b> Llenas la de 3' },
            { s: [0, 3], t: '<b>2.</b> La viertes en la de 5' },
            { s: [3, 3], t: '<b>3.</b> Llenas otra vez la de 3' },
            { s: [1, 5], t: '<b>4.</b> La viertes: queda <b>1&nbsp;L</b>' }
         ];
         const jarra = (s, hl, lbl) => {
            let z = `<svg viewBox="0 0 76 100" role="img" aria-label="${lbl}">`;
            cap.forEach((c, k) => {
               const h = c * u, v = s[k], x = xs[k], on = hl && k == 0;
               z += `<rect x="${x}" y="${y0 - h}" width="${w}" height="${h}" rx="4" style="fill:var(--card)"/>`
                  + (v ? `<rect x="${x}" y="${y0 - v * u}" width="${w}" height="${v * u}" rx="${v == c ? 4 : 1.5}" style="fill:color-mix(in srgb,${COL[k]} 55%,var(--card))"/>` : '')
                  + `<rect x="${x}" y="${y0 - h}" width="${w}" height="${h}" rx="4" style="fill:none;stroke:${on ? 'var(--mint)' : 'var(--ink)'};stroke-width:${on ? 3.5 : 2.2}"/>`
                  + `<rect x="${x - 3}" y="${y0 - h - 1.5}" width="${w + 6}" height="5" rx="2.5" style="fill:var(--card);stroke:${on ? 'var(--mint)' : 'var(--ink)'};stroke-width:2"/>`
                  + `<text x="${x + w / 2}" y="${y0 - h / 2 + 5}" style="${f};fill:var(--ink);font-weight:800;font-size:14px">${v}</text>`
                  + `<text x="${x + w / 2}" y="95" style="${f};fill:var(--ink);font-weight:700;font-size:9px;opacity:.8">de ${c} L</text>`
            });
            return z + '</svg>'
         };
         const lbl = ['Llenas la jarra de 3: tiene 3 litros y la de 5, ninguno.', 'La viertes en la de 5: la de 3 queda con 0 y la de 5 con 3.', 'Llenas otra vez la de 3: 3 litros en cada una.', 'La viertes en la de 5 hasta que se llena: en la de 3 queda 1 litro.'];
         return `<p class="cap">Ejemplo con jarras de <b>3</b> y <b>5</b> litros: ¿cómo medir <b>1 litro</b>?</p>`
            + `<div class="dmg" style="--c:4">${pasos.map((p, i) => `<figure>${jarra(p.s, i == 3, lbl[i])}<figcaption>${p.t}</figcaption></figure>`).join('')}</div>`
            + `<p class="cap">Al verter, el agua sale hasta que la de 5 se llena: <b>lo que sobra</b> en la de 3 es tu litro.</p>`
      })(),
      pk: 'ja',
      render: jarras,
      actions: { jf, je, jp, undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Completada · ${r.n}/${r.par} movimientos · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
