/* Juego: Escalera — llega de una palabra a otra cambiando UNA letra en cada paso.
   Cada palabra intermedia tiene que existir (se usa la lista de content/aceptadas.js).
   El reto sale de la fecha: todo el mundo juega la misma escalera. */
(function () {
  const PASOS = [6, 3, 3, 4, 4, 5, 5][WD]; // pasos mínimos entre inicio y meta: lunes y martes, el más fácil

  /* Grafo de palabras: dos palabras son vecinas si se diferencian en una sola letra. */
  let _g;
  function grafo() {
    if (_g) return _g;
    const W = [...Content.aceptadas()].sort(), B = {}, cl = w => [0, 1, 2, 3, 4].map(i => w.slice(0, i) + '_' + w.slice(i + 1));
    W.forEach(w => cl(w).forEach(k => (B[k] = B[k] || []).push(w)));
    const vec = w => { const s = new Set(); cl(w).forEach(k => B[k].forEach(x => x != w && s.add(x))); return [...s] };
    const dist = o => { const d = new Map([[o, 0]]), q = [o]; for (let i = 0; i < q.length; i++)for (const x of vec(q[i])) if (!d.has(x)) { d.set(x, d.get(q[i]) + 1); q.push(x) } return d };
    let big = []; const vistas = new Set();           // el grupo más grande de palabras conectadas entre sí
    for (const w of W) { if (vistas.has(w)) continue; const c = [...dist(w).keys()]; c.forEach(x => vistas.add(x)); if (c.length > big.length) big = c }
    return _g = { vec, dist, big: big.sort() }
  }

  function gen() {
    const g = grafo(), r = rng(SD * 29 + 13);
    for (let L = PASOS; L >= 2; L--)for (let t = 0; t < 40; t++) {
      const a = g.big[Math.floor(r() * g.big.length)], d = g.dist(a), c = g.big.filter(w => d.get(w) == L);
      if (c.length) { const b = c[Math.floor(r() * c.length)]; return { a, b, par: L, D: g.dist(b) } }
    }
    return null
  }
  const P = memoSD(gen); // se regenera si cambia la semilla (SD): reto del día o ronda de duelo

  function camino() { const Z = P(), g = grafo(), o = [Z.a]; let c = Z.a; while (c != Z.b) { c = g.vec(c).find(x => Z.D.get(x) == Z.D.get(c) - 1); o.push(c) } return o }
  const up = w => w.toUpperCase(), pl = (n, a, b) => n == 1 ? a : b;
  const ultima = p => [P().a, ...(p.w || [])].pop();
  const tiempo = p => Date.now() - (p.t0 || Date.now());

  function escalera() {
    const Z = P();
    if (!Z) return shell('Escalera', '<p class="sub">Hoy no hay escalera disponible.</p>');
    const p = prog('e'); p.w = p.w || [];
    const r = R('escalera'), cad = [Z.a, ...p.w], ult = cad[cad.length - 1], cur = p.x || ult;
    const fila = (w, prev, c) => `<div class="r">${[...w].map((l, i) => `<div class="t ${c}${prev && prev[i] != l ? ' s1' : ''}">${l}</div>`).join('')}</div>`;
    let b = `<p class="cap" style="text-align:center;margin:0 0 6px">Inicio</p>` + cad.map((w, i) => fila(w, i ? cad[i - 1] : null, i ? '' : 's0')).join('');
    if (r) {
      b += r.st == 'won'
        ? res(`¡Llegaste en ${r.n} ${pl(r.n, 'paso', 'pasos')}!`, r.n == Z.par && !r.h ? 'Es el mínimo posible.' : `El mínimo era ${Z.par}.`, `Daily Arcade · Escalera #${DAY} · ${r.n}/${Z.par} pasos${r.h ? ' · ' + r.h + pl(r.h, ' pista', ' pistas') : ''} · ${mmss(r.t)}`)
        : res('Rendida', `Una solución en ${Z.par} pasos: ${camino().map(up).join(' → ')}`, `Daily Arcade · Escalera #${DAY} · rendida`)
    }
    else {
      b += `<div class="r">${[...cur].map((l, i) => `<button class="t ${l != ult[i] ? 's1' : ''} ${p.i === i ? 'sel' : ''}" data-a="pos" data-i="${i}" aria-label="Letra ${i + 1}: ${l}">${l}</button>`).join('')}</div>`
        + fila(Z.b, null, 's2') + `<p class="cap" style="text-align:center;margin:0">Meta</p>`
        + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg || 'Toca una letra, elige la nueva y pulsa Enter.'}</p>`
        + `${controles({ undo: 1, pista: 1, rendirme: 1 })}` + kb(null, true)
    }
    return shell('Escalera', b)
  }

  function pos(b) {
    if (R('escalera')) return;
    const p = prog('e'), i = +b.dataset.i;
    p.t0 = p.t0 || Date.now(); p.i = p.i === i ? null : i; msg = ''; Sfx.p('tap'); sv(); draw()
  }

  function llegar(p, Z) { fin('escalera', { st: 'won', n: p.w.length, par: Z.par, h: p.h || 0, t: tiempo(p) }) }

  function paso() {
    const Z = P(), p = prog('e'); p.w = p.w || [];
    const cad = [Z.a, ...p.w], ult = cad[cad.length - 1], w = p.x || ult, dif = [...w].filter((l, i) => l != ult[i]).length;
    if (!dif) msg = 'Cambia una letra para dar un paso.';
    else if (dif > 1) msg = 'Solo puedes cambiar una letra en cada paso.';
    else if (!Content.aceptadas().has(w)) msg = `“${up(w)}” no está en el diccionario.`;
    else if (cad.includes(w)) msg = 'Esa palabra ya está en tu escalera.';
    else { p.t0 = p.t0 || Date.now(); p.w.push(w); p.x = null; p.i = null; msg = ''; if (w == Z.b) llegar(p, Z) }
    Sfx.p(msg ? 'error' : 'acierto');
    sv(); draw()
  }

  function tecla(m) {
    const Z = P(); if (!Z || R('escalera')) return;
    const p = prog('e');
    if (m == 'Enter') return paso();
    if (p.i == null) { msg = 'Toca primero la letra que quieres cambiar.'; Sfx.p('error'); return draw() }
    const ult = ultima(p), cur = [...(p.x || ult)];
    p.t0 = p.t0 || Date.now(); msg = '';
    Sfx.p(m == 'Del' ? 'borra' : 'tecla', p.i); cur[p.i] = m == 'Del' ? ult[p.i] : m;           // ⌫ devuelve la letra original
    p.x = cur.join(''); if (p.x == ult) p.x = null;
    sv(); draw()
  }

  function undo() {
    const p = prog('e');
    if (R('escalera') || !(p.w && p.w.length)) return;
    p.w.pop(); p.x = null; p.i = null; msg = ''; sv(); draw()
  }

  function hint() {
    const Z = P(); if (!Z || R('escalera')) return;
    const p = prog('e'); p.w = p.w || [];
    const ult = ultima(p), sig = grafo().vec(ult).find(x => Z.D.get(x) == Z.D.get(ult) - 1);
    if (!sig) return;
    p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; p.w.push(sig); p.x = null; p.i = null; msg = '';
    if (sig == Z.b) llegar(p, Z);
    sv(); draw()
  }

  function giveup() {
    const Z = P(); if (!Z || R('escalera')) return;
    const p = prog('e'); fin('escalera', { st: 'lost', n: (p.w || []).length, par: Z.par, t: tiempo(p) }); draw()
  }

  /* Teclado: con una letra ya cambiada, Enter confirma el paso aunque el foco esté en la ficha (si no, Enter volvería a «tocarla») */
  $('#app').addEventListener('keydown', e => {
    if (V != 'escalera' || R('escalera') || e.key != 'Enter' || !e.target.matches || !e.target.matches('.t[data-a="pos"]')) return;
    if (prog('e').x) { e.preventDefault(); paso() }
  });

  DailyArcade.register({
    id: 'escalera', name: 'Escalera', desc: 'Cambia una letra en cada paso para llegar de una palabra a otra.', color: '--lav', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h5v-5h5v-5h5V5h3"/></svg>',
    how: ["Llega de la palabra de <b>inicio</b> a la <b>meta</b>.", "Cambia <b>una sola letra</b> en cada paso, y la palabra tiene que existir.", "Toca la letra, escribe la nueva y pulsa <b>Enter</b>."],
    demo: `<p class="cap">De <b>MESA</b> a <b>MIRA</b> en 2 pasos:</p><div class="r"><span class="t s0">M</span><span class="t s0">E</span><span class="t s0">S</span><span class="t s0">A</span></div><div class="r"><span class="t">M</span><span class="t s1">I</span><span class="t">S</span><span class="t">A</span></div><div class="r"><span class="t s2">M</span><span class="t s2">I</span><span class="t s2">R</span><span class="t s2">A</span></div><p class="cap"><b class="dot s0"></b> inicio &nbsp; <b class="dot s1"></b> letra cambiada &nbsp; <b class="dot s2"></b> meta</p>`,
    pk: 'e',
    render: escalera,
    onKey: tecla,
    actions: { pos, undo, pista: hint, rendirme: confirma(giveup) },
    status: (r, p) => r ? (r.st == 'won' ? `Completada · ${r.n} ${pl(r.n, 'paso', 'pasos')}` : 'Rendida') : (p && p.t0 ? 'En curso' : 'Sin jugar')
  });
})();
