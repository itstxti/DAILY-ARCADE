/* Juego: Siluetas — una figura hecha con cubos en un espacio de 4×4×4. Te enseñan su sombra frontal y su sombra lateral
   (vista desde la derecha) y hay que construir una figura que cumpla las dos usando el MÍNIMO de cubos.
   Se construye por capas (la 1 es la base): cada capa es un cuadrado 4×4 visto desde arriba, con «atrás» arriba y «delante» abajo.
   Sombra frontal: una posición de la capa z está oscura si hay algún cubo en esa columna de la capa. Sombra lateral: igual con las filas.
   El reto sale de la fecha: se genera una figura al azar y se enseñan sus sombras. Cada capa es independiente, así que el mínimo
   de cubos es la suma, capa a capa, de max(columnas oscuras, filas oscuras) (se emparejan columnas con filas); la misma
   construcción da una figura mínima de referencia para la pista.
   La victoria se comprueba por reglas (las dos sombras coinciden y el número de cubos es el mínimo), no contra una solución guardada. */
(function () {
   const N = 4, CAP = N * N, TOT = N * CAP;
   const FACIL = WD == 1 || WD == 2;                                       // lunes y martes: 3 capas y menos cubos
   const pls = (n, a, b) => n == 1 ? a : b;
   const idx = (z, y, x) => z * CAP + y * N + x;
   const rango = [...Array(N).keys()];

   /* Sombras de una figura v (64 valores 0/1). F[z][x]: frontal. S[z][j]: lateral desde la derecha (j = 0 es DELANTE, y = N-1-j). */
   function sombras(v) {
      const F = rango.map(() => Array(N).fill(0)), S = rango.map(() => Array(N).fill(0));
      for (let z = 0; z < N; z++)for (let y = 0; y < N; y++)for (let x = 0; x < N; x++)if (v[idx(z, y, x)]) { F[z][x] = 1; S[z][N - 1 - y] = 1 }
      return [F, S]
   }
   const igual = (A, B) => A.every((f, z) => f.every((c, i) => c == B[z][i]));

   /* Figura mínima para las sombras (F, S): en cada capa se emparejan columnas con filas y las sobrantes se unen a la primera. */
   function minima(F, S) {
      const v = Array(TOT).fill(0);
      for (let z = 0; z < N; z++) {
         const xs = rango.filter(x => F[z][x]), ys = rango.filter(j => S[z][j]).map(j => N - 1 - j);
         if (!xs.length || !ys.length) continue;
         for (let i = 0; i < Math.max(xs.length, ys.length); i++)v[idx(z, ys[Math.min(i, ys.length - 1)], xs[Math.min(i, xs.length - 1)])] = 1
      }
      return v
   }
   const cubos = v => v.reduce((a, b) => a + b, 0);

   function gen() {
      const r = rng(SD * 79 + 9);
      for (let t = 0; t < 500; t++) {
         const capas = FACIL ? 3 : 4, v = Array(TOT).fill(0);
         for (let z = 0; z < capas; z++) {
            const k = (FACIL ? 2 : 3) + Math.floor(r() * 3);
            shuf(rango.flatMap(y => rango.map(x => [y, x])), r).slice(0, k).forEach(([y, x]) => v[idx(z, y, x)] = 1)
         }
         const [F, S] = sombras(v), sol = minima(F, S), m = cubos(sol);
         if (m >= (FACIL ? 5 : 8) && igual(sombras(sol)[0], F) && igual(sombras(sol)[1], S)) return { F, S, sol, m }
      }
      const v = Array(TOT).fill(0); [[0, 0, 0], [0, 1, 1], [1, 2, 2], [1, 3, 0], [2, 0, 3]].forEach(([z, y, x]) => v[idx(z, y, x)] = 1);
      const [F, S] = sombras(v), sol = minima(F, S); return { F, S, sol, m: cubos(sol) }   // reserva (nunca debería hacer falta)
   }
   const P = memoSD(gen); // se regenera si cambia la semilla (SD): reto del día o ronda de duelo

   /* Progreso: p.v[i] = 1 si hay un cubo en la casilla i (capa·16 + fila·4 + columna) · p.lk = casillas que fijó una pista ·
      p.bad = capas que la última comprobación vio mal · p.h = pistas · p.c = comprobaciones. */
   const ini = p => { if (!Array.isArray(p.v)) { p.v = Array(TOT).fill(0); p.lk = []; p.h = 0; p.c = 0; p.bad = [] } };
   const refija = p => p.lk.forEach(i => p.v[i] = 1);
   const coincide = p => { const [F, S] = sombras(p.v), Z = P(); return igual(F, Z.F) && igual(S, Z.S) };

   const desc = (M, nom) => `${nom}. ` + [...rango].reverse().map(z => `Capa ${z + 1}: ${M[z].some(c => c) ? 'posiciones ' + rango.filter(i => M[z][i]).map(i => i + 1).join(', ') : 'vacía'}`).join('. ');
   const sombra = (M, nom) => `<div class="sis-w"><div class="sis-n" aria-hidden="true">${[...rango].reverse().map(z => `<i>${z + 1}</i>`).join('')}</div><div class="sis" role="img" aria-label="${desc(M, nom)}">${[...rango].reverse().map(z => M[z].map(c => `<span${c ? ' class="on"' : ''}></span>`).join('')).join('')}</div></div>`;

   function siluetas() {
      const p = prog('si'); ini(p);
      const r = R('siluetas'), Z = P(), lost = r && r.st == 'lost', v = lost ? Z.sol : p.v;
      /* Franjas objetivo de cada capa: arriba, columnas que deben tener cubo (sombra frontal); a la derecha, filas (lateral). Solo el objetivo: no dicen si lo cumples (eso cuesta Comprobar). */
      const tira = (A, f) => A.map((t, k) => `<i class="${t ? 'on' : ''}"></i>`).join('');
      const capa = z => `<div class="sib" role="group" aria-label="Capa ${z + 1}${z == 0 ? ', la base' : z == N - 1 ? ', la de arriba' : ''}"><p class="sit${!r && p.bad.includes(z) ? ' bd' : ''}">Capa ${z + 1}${z == 0 ? ' · base' : z == N - 1 ? ' · arriba' : ''}${!r && p.bad.includes(z) ? ' !' : ''}</p><div class="siw"><div class="sif" aria-hidden="true">${tira(Z.F[z])}</div><div class="sig" data-rv="si-${z}">${rango.map(y => rango.map(x => {
         const i = idx(z, y, x), on = v[i], fx = !r && p.lk.includes(i), nx = !Z.F[z][x] || !Z.S[z][N - 1 - y];
         return `<button class="sic${on ? ' on' : ''}${fx ? ' fx' : ''}${nx ? ' nx' : ''}" data-a="sc" data-i="${i}" aria-pressed="${!!on}"${r ? ' disabled' : ''} aria-label="Capa ${z + 1}, fila ${y + 1}, columna ${x + 1}: ${on ? 'cubo' : 'vacío'}${fx ? ', fijado por una pista' : ''}"></button>`
      }).join('')).join('')}</div><div class="sil" aria-hidden="true">${tira([...Z.S[z]].reverse())}</div></div></div>`;
      let b = `<div class="ddb sik"><div class="sik-b"><span class="sik-n">Cubos <b>${cubos(v)}</b> / mín. <b>${Z.m}</b></span></div><div class="sit2"><figure>${sombra(Z.F, 'Sombra frontal')}<figcaption>Frontal</figcaption></figure><figure>${sombra(Z.S, 'Sombra lateral, vista desde la derecha')}<figcaption>Lateral <small>(desde la derecha)</small></figcaption></figure></div>`;
      b += `<div class="sip" data-rv="si-capas">${[0, 1, 2, 3].map(capa).join('')}</div></div>`;
      if (lost) b += resRendida('Siluetas', `Así cumplía las dos sombras con ${Z.m} cubos. Vuelve mañana para un reto nuevo.`);
      else if (r) b += res(`¡Figura construida en ${mmss(r.t)}!`, `Cumple las dos sombras con ${Z.m} cubos, el mínimo. Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Siluetas #${DAY} · ${mmss(r.t)}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}${r.c ? ' · ' + r.c + pls(r.c, ' comprobación', ' comprobaciones') : ''}`);
      else b += `<p class="cap" style="text-align:center;margin:0">Cada capa se ve desde arriba («atrás» arriba, «delante» abajo). Las franjas <b>marcadas</b> de cada capa indican en qué columna (arriba) y fila (derecha) tiene que haber un cubo; las casillas rayadas nunca llevan cubo.</p>`
         + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, comprobar: 1, pista: 1, rendirme: 1 })}`;
      return shell('Siluetas', b)
   }

   /* Después de cada cambio: ¿coinciden las dos sombras con el mínimo de cubos? */
   function revisa(p) {
      if (!coincide(p)) return;
      if (cubos(p.v) == P().m) fin('siluetas', { st: 'completed', t: Date.now() - p.t0, h: p.h || 0, c: p.c || 0 });
      else msg = `Cumple las dos sombras, pero se puede con menos cubos (el mínimo es ${P().m}).`
   }

   function sc(b) {
      if (R('siluetas')) return;
      const p = prog('si'); ini(p); p.t0 = p.t0 || Date.now(); const i = +b.dataset.i;
      if (p.lk.includes(i)) { msg = 'Ese cubo lo fijó una pista y no se puede quitar.'; Sfx.p('error'); return draw() }
      hist.push(p.v.slice()); p.v[i] = p.v[i] ? 0 : 1; p.bad = []; msg = ''; Sfx.p(p.v[i] ? 'pon' : 'borra', 1 + (i / CAP | 0));
      revisa(p); sv(); draw()
   }

   function undo() {
      const p = prog('si'); ini(p);
      if (R('siluetas') || !hist.length) return;
      p.v = hist.pop(); refija(p); p.bad = []; msg = ''; sv(); draw()
   }

   function reiniciar() {
      const p = prog('si'); ini(p);
      if (R('siluetas')) return;
      const v = Array(TOT).fill(0); p.lk.forEach(i => v[i] = 1);
      if (v.join('') == p.v.join('')) return;
      hist.push(p.v.slice()); p.v = v; p.bad = []; msg = ''; sv(); draw()   // tiempo, pistas y comprobaciones siguen contando
   }

   /* Comprobar: dice si cada sombra coincide y qué capas no cuadran. */
   function comprobar() {
      const p = prog('si'); ini(p);
      if (R('siluetas')) return;
      if (!cubos(p.v)) { msg = 'Todavía no has puesto ningún cubo.'; Sfx.p('error'); return draw() }
      p.t0 = p.t0 || Date.now(); p.c = (p.c || 0) + 1;
      const [F, S] = sombras(p.v), Z = P(), fo = igual(F, Z.F), so = igual(S, Z.S);
      p.bad = rango.filter(z => F[z].some((c, i) => c != Z.F[z][i]) || S[z].some((c, i) => c != Z.S[z][i]));
      msg = `Frontal: ${fo ? 'bien' : 'no coincide'} · Lateral: ${so ? 'bien' : 'no coincide'}.` + (p.bad.length ? ` Revisa ${pls(p.bad.length, 'la capa', 'las capas')} ${p.bad.map(z => z + 1).join(', ')}.` : ` Llevas ${cubos(p.v)} cubos (mínimo ${Z.m}).`);
      Sfx.p(p.bad.length ? 'error' : 'acierto'); sv(); draw()
   }

   /* Pista: pone y fija un cubo de la figura mínima que aún falta; si no falta ninguno, quita uno de los que sobran. */
   function pista() {
      const p = prog('si'); ini(p);
      if (R('siluetas')) return;
      const sol = P().sol;
      let i = sol.findIndex((s, k) => s && !p.v[k]);
      if (i >= 0) { p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; hist.push(p.v.slice()); p.v[i] = 1; p.lk.push(i); msg = `Pista: va un cubo en la capa ${(i / CAP | 0) + 1}.` }
      else {
         i = p.v.findIndex((c, k) => c && !sol[k] && !p.lk.includes(k));
         if (i < 0) return;
         p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; hist.push(p.v.slice()); p.v[i] = 0; msg = `Pista: sobraba un cubo de la capa ${(i / CAP | 0) + 1}.`
      }
      p.bad = []; revisa(p); sv(); draw()
   }

   function rendirse() {
      if (R('siluetas')) return;
      const p = prog('si'); fin('siluetas', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw()
   }

   DailyArcade.register({
      id: 'siluetas', name: 'Siluetas', desc: 'Construye la figura que proyecta esas dos sombras.', color: '--lime', tag: 'Construye con las sombras',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7.5 4.2v8.6L12 20l-7.5-4.2V7.2z"/><path d="M12 11.5v8.5M4.5 7.2L12 11.5l7.5-4.3"/></svg>',
      how: ['Te enseñan la <b>sombra frontal</b> y la <b>lateral</b> (vista desde la derecha) de una figura de cubos.', 'Constrúyela por <b>capas</b>: la 1 es la base y cada una se ve desde arriba. Toca una casilla para poner o quitar un cubo.', 'Las dos sombras tienen que coincidir y con los <b>menos cubos posibles</b>. Comprobar te dice qué capas no cuadran.'],
      demo: (() => {
         /* Ejemplo: una capa con 3 cubos. Columnas usadas: 2 y 4 (sombra frontal, 2 oscuras). Filas usadas: las 3 de delante (sombra lateral, 3 oscuras). */
         const cub = [[3, 1], [2, 3], [1, 3]], celdas = rango.map(y => rango.map(x => `<span class="sic${cub.some(([a, b]) => a == y && b == x) ? ' on' : ''}"></span>`).join('')).join('');
         const sh = on => rango.map(z => rango.map(i => `<span${z == N - 1 && on.includes(i) ? ' class="on"' : ''}></span>`).join('')).join('');
         return `<div class="sid" aria-hidden="true"><figure><div class="sig">${celdas}</div><figcaption>Capa 1<br><small>vista desde arriba<br>(delante, abajo)</small></figcaption></figure><div class="sia">→</div>`
            + `<div class="sid2"><figure><div class="sis">${sh([1, 3])}</div><figcaption>Frontal</figcaption></figure><figure><div class="sis">${sh([0, 1, 2])}</div><figcaption>Lateral</figcaption></figure></div></div>`
            + `<p class="cap">Esta capa de ejemplo proyecta 2 columnas oscuras en la sombra frontal y 3 posiciones en la lateral. Hacen falta <b>3 cubos</b>: el mayor de los dos números, colocando cada cubo en una columna y una fila oscuras.</p>`
      })(),
      pk: 'si',
      render: siluetas,
      actions: { sc, undo, reiniciar, comprobar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Construida · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
