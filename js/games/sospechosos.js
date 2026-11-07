/* Juego: Sospechosos — 4 personas, 4 lugares y 4 objetos. Cada persona estaba en un lugar distinto y tenía un objeto distinto.
   Con 5 o 6 pistas ("Ana no estaba en la cocina") hay que averiguar quién estaba dónde y con qué.
   El reto sale de la fecha. Se elige una solución al azar y se buscan pistas verdaderas hasta que, COMPROBANDO POR FUERZA BRUTA
   las 576 combinaciones posibles (4! lugares × 4! objetos), solo queda una. Después se quitan las pistas sobrantes:
   todas las que se enseñan hacen falta. La victoria se comprueba por reglas: todo colocado y todas las pistas se cumplen
   (como la solución es única, es la solución). */
(function () {
   const N = 4;
   const PER = ['Ana', 'Bruno', 'Carla', 'Diego'];
   const LUG = [['la', 'cocina'], ['el', 'jardín'], ['la', 'biblioteca'], ['el', 'garaje']];
   const OBJ = [['la', 'llave'], ['la', 'lupa'], ['el', 'reloj'], ['el', 'libro']];
   const mayus = t => t[0].toUpperCase() + t.slice(1);
   const lug = i => `${LUG[i][0]} ${LUG[i][1]}`, obj = i => `${OBJ[i][0]} ${OBJ[i][1]}`;
   const pls = (n, a, b) => n == 1 ? a : b;

   /* Todas las permutaciones de 0..3 y, con ellas, las 576 situaciones posibles: L[persona] = lugar, O[persona] = objeto. */
   const perms = a => a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
   const PERMS = perms([0, 1, 2, 3]);
   const TODAS = []; PERMS.forEach(L => PERMS.forEach(O => TODAS.push({ L, O })));

   /* Tipos de pista (v = verdadera/negada):
      pl  persona–lugar         "Ana (no) estaba en la cocina"
      po  persona–objeto        "Ana (no) tenía la llave"
      ol  objeto–lugar          "Quien tenía la llave (no) estaba en la cocina"
      pl2 dos personas–lugar    "Ana o Bruno estaba en la cocina" / "Ni Ana ni Bruno estaban en la cocina"
      po2 dos personas–objeto   "Ana o Bruno tenía la llave" / "Ni Ana ni Bruno tenían la llave" */
   function cumple(c, s) {
      const { L, O } = s;
      switch (c.k) {
         case 'pl': return (L[c.p] == c.l) == c.v;
         case 'po': return (O[c.p] == c.o) == c.v;
         case 'ol': return (L[O.indexOf(c.o)] == c.l) == c.v;
         case 'pl2': return (L[c.a] == c.l || L[c.b] == c.l) == c.v;
         case 'po2': return (O[c.a] == c.o || O[c.b] == c.o) == c.v;
      }
      return false
   }
   const directa = c => c.v === true && (c.k == 'pl' || c.k == 'po' || c.k == 'ol'); // la pista más "regalada"
   const cuenta = cs => { let n = 0; for (const s of TODAS) if (cs.every(c => cumple(c, s))) n++; return n };

   /* Todas las pistas que son verdad en la situación s. */
   function verdaderas(s) {
      const out = [];
      for (let p = 0; p < N; p++)for (let x = 0; x < N; x++) { out.push({ k: 'pl', p, l: x, v: s.L[p] == x }); out.push({ k: 'po', p, o: x, v: s.O[p] == x }) }
      for (let o = 0; o < N; o++)for (let l = 0; l < N; l++)out.push({ k: 'ol', o, l, v: s.L[s.O.indexOf(o)] == l });
      for (let a = 0; a < N; a++)for (let b = a + 1; b < N; b++)for (let x = 0; x < N; x++)for (const v of [true, false]) { out.push({ k: 'pl2', a, b, l: x, v }); out.push({ k: 'po2', a, b, o: x, v }) }
      return out.filter(c => cumple(c, s))
   }

   function texto(c) {
      switch (c.k) {
         case 'pl': return `${PER[c.p]} ${c.v ? '' : 'no '}estaba en ${lug(c.l)}.`;
         case 'po': return `${PER[c.p]} ${c.v ? '' : 'no '}tenía ${obj(c.o)}.`;
         case 'ol': return `Quien tenía ${obj(c.o)} ${c.v ? '' : 'no '}estaba en ${lug(c.l)}.`;
         case 'pl2': return c.v ? `${PER[c.a]} o ${PER[c.b]} estaba en ${lug(c.l)}.` : `Ni ${PER[c.a]} ni ${PER[c.b]} estaban en ${lug(c.l)}.`;
         case 'po2': return c.v ? `${PER[c.a]} o ${PER[c.b]} tenía ${obj(c.o)}.` : `Ni ${PER[c.a]} ni ${PER[c.b]} tenían ${obj(c.o)}.`;
      }
      return ''
   }

   /* Dificultad por día de la semana (0 = domingo): lunes y martes, el más fácil (5 pistas y alguna más directa). */
   const FACIL = WD == 1 || WD == 2;
   const QUIERE = FACIL ? 5 : 6, MAX_DIRECTAS = FACIL ? 3 : 2, MIN_NEG = FACIL ? 1 : 3;

   function gen() {
      const r = rng(SD * 53 + 11), K = 8; let ult = null;
      for (let t = 0; t < 400; t++) {
         const rel = t > 150, max = t < 60 ? QUIERE : 6; // si cuesta, se relajan las preferencias de estilo (la unicidad NUNCA se relaja)
         const sol = TODAS[Math.floor(r() * TODAS.length)], pool = verdaderas(sol), cs = [];
         let rest = TODAS.slice(), pos = 0;
         while (rest.length > 1 && cs.length < max) {
            // de K pistas verdaderas al azar se elige la que más soluciones descarta
            let mejor = null, mn = rest.length, mc = null;
            for (let q = 0; q < K; q++) {
               const c = pool[Math.floor(r() * pool.length)];
               if (directa(c) && pos >= (rel ? 3 : MAX_DIRECTAS)) continue;
               const nr = rest.filter(s => cumple(c, s));
               if (nr.length < mn) { mn = nr.length; mejor = nr; mc = c }
            }
            if (!mc) continue;
            cs.push(mc); rest = mejor; if (directa(mc)) pos++
         }
         if (rest.length != 1) continue;
         // poda: se quita toda pista que sobre (así las que quedan hacen falta)
         for (let i = cs.length - 1; i >= 0; i--) { const sin = cs.filter((_, j) => j != i); if (cuenta(sin) == 1) cs.splice(i, 1) }
         if (cs.length < 5 || cs.length > 6) continue;
         if (!rel && cs.filter(c => c.v === false).length < MIN_NEG) { ult = { sol, cs }; continue }
         return { sol, cs }
      }
      return ult || { sol: TODAS[0], cs: verdaderas(TODAS[0]).slice(0, 6) }
   }
   const P = memoSD(gen); // se regenera si cambia la semilla (SD): reto del día o ronda de duelo

   /* Progreso: p.l[i] / p.o[i] = lugar / objeto elegido para la persona i (-1 = nada). p.fl / p.fo = lo que ha fijado una pista.
      p.x = pistas tachadas · p.h = pistas pedidas · p.c = comprobaciones · p.bad = casillas que la última comprobación vio mal. */
   const ini = p => {
      if (!Array.isArray(p.l)) { p.l = [-1, -1, -1, -1]; p.o = [-1, -1, -1, -1]; p.fl = [-1, -1, -1, -1]; p.fo = [-1, -1, -1, -1]; p.x = []; p.h = 0; p.c = 0; p.bad = [] }
   };
   const copia = p => [p.l.slice(), p.o.slice()];
   /* Tras deshacer o reiniciar, lo fijado por una pista siempre vuelve a su sitio. */
   function refija(p) {
      [['l', 'fl'], ['o', 'fo']].forEach(([a, f]) => p[f].forEach((v, i) => {
         if (v < 0) return;
         const j = p[a].indexOf(v); if (j >= 0 && j != i) p[a][j] = -1;
         p[a][i] = v
      }))
   };
   const completo = p => p.l.every(v => v >= 0) && p.o.every(v => v >= 0);
   const cuadra = p => P().cs.every(c => cumple(c, { L: p.l, O: p.o }));

   /* Pone el valor v a la persona i en el vector a (lugares u objetos). Si otra persona ya lo tenía, se lo cambian (intercambio).
      Devuelve false si lo impide una pista fija. */
   function asigna(p, a, f, i, v) {
      if (p[f][i] >= 0) return false;
      if (p[a][i] == v) { p[a][i] = -1; return true }
      const j = p[a].indexOf(v);
      if (j >= 0) { if (p[f][j] >= 0) return false; p[a][j] = p[a][i] }
      p[a][i] = v; return true
   }

   function sospechosos() {
      const p = prog('ss'); ini(p);
      const r = R('sospechosos'), Z = P(), lost = r && r.st == 'lost';
      const L = lost ? Z.sol.L : p.l, O = lost ? Z.sol.O : p.o;
      if (!r && (sel == null || sel >= N)) sel = 0;
      const s = r ? null : sel;

      const cl = Z.cs.map((c, i) => `<li><button class="spc${p.x.includes(i) ? ' x' : ''}" data-a="tc" data-i="${i}" aria-pressed="${p.x.includes(i)}" aria-label="Pista ${i + 1}: ${texto(c)}${p.x.includes(i) ? ' Tachada.' : ''}"${r ? ' disabled' : ''}>${texto(c)}</button></li>`).join('');
      const fila = i => {
         const l = L[i], o = O[i], mal = k => !r && p.bad.includes(k + i) ? ' bd' : '', fx = (f) => !r && p[f][i] >= 0 ? ' fx' : '';
         return `<button class="spr${s === i ? ' sel' : ''}" data-a="sp" data-i="${i}" aria-pressed="${s === i}"${r ? ' disabled' : ''} aria-label="${PER[i]}: ${l < 0 ? 'sin lugar' : 'en ' + lug(l)}, ${o < 0 ? 'sin objeto' : 'con ' + obj(o)}"><b>${PER[i]}</b><span class="spv${l < 0 ? ' e' : ''}${mal('l')}${fx('fl')}">${l < 0 ? 'Lugar' : mayus(LUG[l][1])}</span><span class="spv${o < 0 ? ' e' : ''}${mal('o')}${fx('fo')}">${o < 0 ? 'Objeto' : mayus(OBJ[o][1])}</span></button>`
      };
      const chips = (a, f, lista, act, etq) => `<div class="spg" data-rv="sp-${act}" role="group" aria-label="${etq}${s != null ? ' de ' + PER[s] : ''}">${lista.map((n, v) => {
         const d = p[a].indexOf(v), mio = s != null && d == s, otro = d >= 0 && !mio;
         return `<button class="spch${mio ? ' on' : ''}${otro ? ' used' : ''}" data-a="${act}" data-v="${v}" aria-pressed="${mio}"${r || s == null ? ' disabled' : ''}>${mayus(n[1])}${otro ? `<small>${PER[d]}</small>` : ''}</button>`
      }).join('')}</div>`;

      let b = `<h2 class="sph">Pistas</h2><ol class="spcl" aria-label="Pistas">${cl}</ol>`;
      b += `<h2 class="sph">Sospechosos</h2><div class="spb" data-rv="sp-sosp" role="group" aria-label="Sospechosos">${PER.map((_, i) => fila(i)).join('')}</div>`;
      if (r && r.st == 'lost') b += resRendida('Sospechosos', 'Así encajaba todo con las pistas. Vuelve mañana para un reto nuevo.');
      else if (r) b += res(`¡Caso resuelto en ${mmss(r.t)}!`, 'Todas las pistas cuadran. Vuelve mañana para un reto nuevo.',
         `Daily Arcade · Sospechosos #${DAY} · ${mmss(r.t)}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}${r.c ? ' · ' + r.c + pls(r.c, ' comprobación', ' comprobaciones') : ''}`);
      else b += `<p class="cap" style="text-align:center;margin:0">Elige a un sospechoso y dale lugar y objeto. Toca una pista para tacharla.</p>`
         + `<h2 class="sph">Lugar</h2>${chips('l', 'fl', LUG, 'sl', 'Lugar')}<h2 class="sph">Objeto</h2>${chips('o', 'fo', OBJ, 'so', 'Objeto')}`
         + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, comprobar: 1, pista: 1, rendirme: 1 })}`;
      return shell('Sospechosos', b)
   }

   /* Después de cada cambio: ¿está todo colocado y cuadra con las pistas? */
   function revisa(p) {
      if (!completo(p)) return;
      if (cuadra(p)) fin('sospechosos', { st: 'completed', t: Date.now() - p.t0, h: p.h || 0, c: p.c || 0 });
      else msg = 'Está todo colocado, pero alguna pista no se cumple. Revísalas.'
   }

   function sp(b) {
      if (R('sospechosos')) return;
      const p = prog('ss'); ini(p); p.t0 = p.t0 || Date.now();
      sel = +b.dataset.i; msg = ''; Sfx.p('tap'); sv(); draw()
   }

   function tc(b) {
      if (R('sospechosos')) return;
      const p = prog('ss'); ini(p); const i = +b.dataset.i; p.t0 = p.t0 || Date.now();
      p.x = p.x.includes(i) ? p.x.filter(x => x != i) : [...p.x, i]; Sfx.p('tap'); sv(); draw()
   }

   function poner(a, f, v) {
      const p = prog('ss'); ini(p);
      if (R('sospechosos')) return;
      if (sel == null) { msg = 'Toca primero un sospechoso.'; Sfx.p('error'); return draw() }
      p.t0 = p.t0 || Date.now();
      const antes = copia(p), vacia = p[a][sel] < 0;
      if (!asigna(p, a, f, sel, +v)) { msg = 'Ese dato lo fijó una pista y no se puede cambiar.'; Sfx.p('error'); return draw() }
      hist.push(antes); p.bad = []; msg = '';
      Sfx.p(p[a][sel] < 0 ? 'borra' : 'pon', +v + 1);
      // al completar a una persona se pasa a la siguiente que tenga algo por rellenar
      if (vacia && p.l[sel] >= 0 && p.o[sel] >= 0) { const sig = [1, 2, 3].map(d => (sel + d) % N).find(i => p.l[i] < 0 || p.o[i] < 0); if (sig != null) sel = sig }
      revisa(p); sv(); draw()
   }
   const sl = b => poner('l', 'fl', b.dataset.v), so = b => poner('o', 'fo', b.dataset.v);

   function undo() {
      const p = prog('ss'); ini(p);
      if (R('sospechosos') || !hist.length) return;
      [p.l, p.o] = hist.pop(); refija(p); p.bad = []; msg = ''; sv(); draw()
   }

   function reiniciar() {
      const p = prog('ss'); ini(p);
      if (R('sospechosos')) return;
      const antes = copia(p); p.l = p.l.map((v, i) => p.fl[i] >= 0 ? v : -1); p.o = p.o.map((v, i) => p.fo[i] >= 0 ? v : -1);
      if (p.l.join() == antes[0].join() && p.o.join() == antes[1].join()) return;
      hist.push(antes); p.bad = []; msg = ''; sv(); draw()   // tiempo, pistas y comprobaciones siguen contando
   }

   /* Comprobar: dice cuántos datos de los que has puesto no son correctos y los marca. */
   function comprobar() {
      const p = prog('ss'); ini(p);
      if (R('sospechosos')) return;
      const { L, O } = P().sol, puestos = p.l.filter(v => v >= 0).length + p.o.filter(v => v >= 0).length;
      if (!puestos) { msg = 'Todavía no has colocado nada.'; Sfx.p('error'); return draw() }
      p.t0 = p.t0 || Date.now(); p.c = (p.c || 0) + 1;
      p.bad = []; p.l.forEach((v, i) => { if (v >= 0 && v != L[i]) p.bad.push('l' + i) }); p.o.forEach((v, i) => { if (v >= 0 && v != O[i]) p.bad.push('o' + i) });
      Sfx.p(p.bad.length ? 'error' : 'acierto');
      msg = p.bad.length ? `${p.bad.length} ${pls(p.bad.length, 'dato incorrecto', 'datos incorrectos')} (marcados en rojo)` : 'Todo lo que has puesto es correcto';
      sv(); draw()
   }

   /* Pista: coloca y fija un dato correcto (primero un lugar; cuando ya están todos los lugares, un objeto). */
   function pista() {
      const p = prog('ss'); ini(p);
      if (R('sospechosos')) return;
      const { L, O } = P().sol;
      let a = 'l', f = 'fl', sol = L, i = p.l.findIndex((v, k) => v != L[k]);
      if (i < 0) { a = 'o'; f = 'fo'; sol = O; i = p.o.findIndex((v, k) => v != O[k]) }
      if (i < 0) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1;
      hist.push(copia(p));
      const j = p[a].indexOf(sol[i]); if (j >= 0) p[a][j] = -1;
      p[a][i] = sol[i]; p[f][i] = sol[i]; p.bad = []; sel = i;
      msg = `Pista: ${PER[i]} ${a == 'l' ? 'estaba en ' + lug(sol[i]) : 'tenía ' + obj(sol[i])}.`;
      revisa(p); sv(); draw()
   }

   function rendirse() {
      if (R('sospechosos')) return;
      const p = prog('ss'); fin('sospechosos', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw()
   }

   DailyArcade.register({
      id: 'sospechosos', name: 'Sospechosos', desc: 'Averigua quién estaba dónde y con qué objeto.', color: '--lav', tag: 'Averigua quién estaba dónde',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="11" r="3"/><path d="M5.5 20.5c.6-3.8 3.2-5.5 6.5-5.5s5.9 1.7 6.5 5.5"/><path d="M8 8h8M9.2 8l.8-3.5h4l.8 3.5"/></svg>',
      how: ['Cada sospechoso estaba en un <b>lugar distinto</b> y tenía un <b>objeto distinto</b>.', 'Lee las <b>pistas</b> y toca una para tacharla cuando ya la hayas usado.', 'Elige un sospechoso y dale su <b>lugar</b> y su <b>objeto</b>. Hay una única solución y todas las pistas hacen falta.'],
      demo: `<p class="cap">Si sabes que:</p><ul class="spcl"><li><span class="spc">Ana no estaba en la cocina.</span></li><li><span class="spc">Bruno estaba en la cocina.</span></li></ul><p class="cap">…entonces Ana estaba en otro sitio, y la cocina ya es de Bruno.</p>`,
      pk: 'ss',
      render: sospechosos,
      actions: { sp, tc, sl, so, undo, reiniciar, comprobar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Resuelto · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();