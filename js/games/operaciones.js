/* Juego: Operaciones — llega al número objetivo combinando seis números con + − × ÷.
   Cada número se usa una sola vez (o ninguna). Los resultados tienen que ser enteros positivos:
   las restas no pueden dar 0 ni negativo y las divisiones tienen que ser exactas.
   El reto sale de la fecha y siempre tiene solución (se construye al revés, desde una). */
(function () {
  const SIM = { '+': '+', '-': '−', '*': '×', '/': '÷' }, NOM = { '+': 'más', '-': 'menos', '*': 'por', '/': 'entre' };
  const OPS = [4, 3, 3, 4, 4, 5, 5]; // operaciones de la solución de referencia: lunes y martes, las menos
  const calc = (o, x, y) => o == '+' ? x + y : o == '*' ? x * y : o == '-' ? (x > y ? x - y : null) : (y && x % y == 0 ? x / y : null);
  /* Para construir el reto se evitan las operaciones triviales (×1, ÷1, ÷ entre iguales). */
  const util = (o, x, y) => o == '+' || (o == '-' && x > y) || (o == '*' && y > 1) || (o == '/' && y > 1 && x > y && x % y == 0);

  function gen() {
    const r = rng(SD * 23 + 11), k = [5, 3, 3, 4, 4, 5, 5][WD];
    for (let t = 0; t < 4000; t++) {
      const grandes = shuf([25, 50, 75, 100], r).slice(0, 2), pequeños = shuf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], r).slice(0, 4);
      const nums = grandes.concat(pequeños).sort((a, b) => a - b);
      let a = shuf(nums.slice(), r).slice(0, k + 1); const sol = [];
      for (let s = 0; s < k; s++) {
        let hecho = false;
        for (let q = 0; q < 30 && !hecho; q++) {
          const i = Math.floor(r() * a.length); let j = Math.floor(r() * (a.length - 1)); if (j >= i) j++;
          let x = a[i], y = a[j]; if (x < y) [x, y] = [y, x];
          for (const o of shuf(['+', '-', '*', '/'], r)) {
            if (!util(o, x, y)) continue;
            const v = calc(o, x, y); if (v > 9999) continue;
            sol.push(`${x} ${SIM[o]} ${y} = ${v}`); a = a.filter((_, n) => n != i && n != j); a.push(v); hecho = true; break
          }
        }
        if (!hecho) break
      }
      const v = a[0];
      if (sol.length == k && a.length == 1 && v >= 101 && v <= 999 && !nums.includes(v)) return { nums, target: v, sol }
    }
    return { nums: [2, 5, 10, 25, 50, 100], target: 192, sol: ['100 + 50 = 150', '150 + 25 = 175', '175 + 10 = 185', '185 + 5 = 190', '190 + 2 = 192'] }
  }
  const P = memoSD(gen); // se regenera si cambia la semilla (SD): reto del día o ronda de duelo

  const ini = p => { if (!p.t) { p.t = P().nums.map(v => ({ v })); p.l = []; p.u = []; p.a = null; p.o = null } };
  const pl = (n, a, b) => n == 1 ? a : b, dif = p => Math.min(...p.t.map(x => Math.abs(x.v - P().target)));

  function operaciones() {
    const Z = P(), p = prog('x'); ini(p);
    const r = R('operaciones'), cerca = dif(p), mejor = p.t.find(x => Math.abs(x.v - Z.target) == cerca).v;
    let b = `<div class="obj"><small>Objetivo</small><b>${Z.target}</b></div>`
      + `<div class="nm">${p.t.map((x, i) => `<button class="nb ${x.n ? 'rs' : ''} ${!r && p.a === i ? 'sel' : ''}" data-a="num" data-i="${i}"${r ? ' disabled' : ''}>${x.v}</button>`).join('')}</div>`;
    if (!r) b += `<div class="op" role="group" aria-label="Operación">${Object.keys(SIM).map(o => `<button class="btn" data-a="op" data-o="${o}" aria-pressed="${p.o == o}" aria-label="${NOM[o]}">${SIM[o]}</button>`).join('')}</div>`;
    if (p.l.length) b += `<ol class="lg">${p.l.map(s => `<li>${s}</li>`).join('')}</ol>`;
    if (r) {
      b += r.st == 'won'
        ? res(`¡Exacto en ${r.n} ${pl(r.n, 'operación', 'operaciones')}!`, `Tiempo: ${mmss(r.t)}.`, `Daily Arcade · Operaciones #${DAY} · ${Z.target} · ${r.n} ${pl(r.n, 'operación', 'operaciones')} · ${mmss(r.t)}`)
        : res(`Te quedaste a ${r.gap} del objetivo`, `Una solución:<br>${Z.sol.join('<br>')}`, `Daily Arcade · Operaciones #${DAY} · ${Z.target} · a ${r.gap}`)
    }
    else b += `${S.set.tm ? `<p class="tm" id="tm">${p.t0 ? mmss(Date.now() - p.t0) : '0:00'}</p>` : ''}<p class="msg" role="status">${msg || (cerca ? `Lo más cerca: ${mejor} (a ${cerca}).` : '')}</p>${controles({ undo: 1, reiniciar: 1, rendirme: 1 })}<p class="foot" style="margin-top:8px;text-align:center">Elige un número, una operación y otro número.</p>`;
    return shell('Operaciones', b)
  }

  function num(b) {
    const Z = P(), p = prog('x'); ini(p);
    if (R('operaciones')) return;
    const i = +b.dataset.i; p.t0 = p.t0 || Date.now(); msg = '';
    if (p.a == null || p.o == null) p.a = p.a === i && p.o == null ? null : i;      // elegir (o cambiar) el primer número
    else if (p.a == i) { p.a = null; p.o = null }                          // tocar el mismo número lo suelta
    else {
      const x = p.t[p.a].v, y = p.t[i].v, o = p.o, v = calc(o, x, y);
      if (v == null) msg = o == '-' ? 'Una resta tiene que dar un número positivo.' : 'La división tiene que ser exacta.';
      else {
        p.u.push({ t: p.t.map(q => ({ ...q })), l: p.l.slice() });
        p.t = p.t.filter((_, n) => n != p.a && n != i); p.t.push({ v, n: 1 }); p.l.push(`${x} ${SIM[o]} ${y} = ${v}`); p.a = null; p.o = null;
        if (v == Z.target) fin('operaciones', { st: 'won', n: p.l.length, t: Date.now() - p.t0 })
      }
    }
    sv(); draw()
  }

  function op(b) {
    const p = prog('x'); ini(p);
    if (R('operaciones')) return;
    if (p.a == null) msg = 'Elige primero un número.';
    else { p.t0 = p.t0 || Date.now(); msg = ''; p.o = p.o == b.dataset.o ? null : b.dataset.o }
    sv(); draw()
  }

  function undo() {
    const p = prog('x'); ini(p);
    if (R('operaciones') || !p.u.length) return;
    const s = p.u.pop(); p.t = s.t; p.l = s.l; p.a = null; p.o = null; msg = ''; sv(); draw()
  }

  function reset() {
    const p = prog('x'); ini(p);
    if (R('operaciones')) return;
    p.t = P().nums.map(v => ({ v })); p.l = []; p.u = []; p.a = null; p.o = null; msg = ''; sv(); draw()
  }

  function giveup() {
    const p = prog('x'); ini(p);
    if (R('operaciones')) return;
    fin('operaciones', { st: 'lost', gap: dif(p), n: p.l.length, t: Date.now() - (p.t0 || Date.now()) }); draw()
  }

  DailyArcade.register({
    id: 'operaciones', name: 'Operaciones', desc: 'Llega al número objetivo con sumas, restas, productos y divisiones.', color: '--coral', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5v7M2.5 8h7"/><path d="M14.5 8h7"/><path d="M15 15l6 6M21 15l-6 6"/><path d="M2.5 18h7"/><circle cx="6" cy="14.6" r=".9" fill="currentColor"/><circle cx="6" cy="21.4" r=".9" fill="currentColor"/></svg>',
    how: ["Llega al <b>número objetivo</b> combinando los números.", "Elige <b>número, operación y otro número</b>: el resultado es un número nuevo.", "Cada número se usa una vez. Restas positivas y divisiones exactas."],
    demo: `<p class="cap">Objetivo <b>106</b> con 4, 6 y 25:</p><div class="eq1"><span class="chp">25</span><b>×</b><span class="chp">4</span><b>=</b><span class="chp rs">100</span></div><div class="eq1"><span class="chp rs">100</span><b>+</b><span class="chp">6</span><b>=</b><span class="chp rs">106</span></div><p class="cap">El resultado (en amarillo) pasa a ser un número nuevo.</p>`,
    pk: 'x',
    winLabel: 'exactas',
    render: operaciones,
    actions: { num, op, undo, reiniciar: reset, rendirme: confirma(giveup) },
    status: (r, p) => r ? (r.st == 'won' ? `Exacta · ${r.n} ${pl(r.n, 'operación', 'operaciones')}` : `A ${r.gap} del objetivo`) : (p && p.t0 ? 'En curso' : 'Sin jugar'),
    stats: (e, w) => w.length ? kpi([[mmss(Math.min(...w.map(x => x.t))), 'mejor tiempo'], [mmss(avg(w.map(x => x.t))), 'tiempo medio']]) : ''
  });
})();
