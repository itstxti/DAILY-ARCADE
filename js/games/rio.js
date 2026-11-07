/* Juego: Dominó de ríos — un manantial (la gota) tiene que llegar al mar colocando fichas de agua, una casilla cada vez,
   pasando por TODOS los pueblos marcados, sin cruzarse consigo mismo y sin pisar las rocas. Se mueve en horizontal y vertical.
   El reto sale de la fecha. Se hace un río al azar (paseo aleatorio sin repetir casillas) de manantial a mar, se marcan algunos de sus pueblos y
   después se BUSCA POR FUERZA BRUTA otro río válido distinto: si existe, se pone una roca en una casilla que solo usaba el otro (o se marca un pueblo más)
   y se repite hasta que NO quede ningún otro. Así el reto tiene una única solución y es justo. Lunes y martes: tablero de 5×5; el resto, de 6×6.
   La victoria se comprueba por reglas (el río empieza en el manantial, acaba en el mar y toca todos los pueblos), no contra la solución guardada. */
(function () {
   const NG = WD == 1 || WD == 2 ? 5 : 6, NN = NG * NG, LIM = 150000;
   const [LLO, LHI, TLO, THI, RMAX] = NG == 5 ? [11, 15, 3, 4, 7] : [16, 22, 4, 6, 11];   // largo del río, pueblos (mín. y máx.) y tope de rocas
   const pls = (n, a, b) => n == 1 ? a : b;
   const NB = Array.from({ length: NN }, (_, i) => { const x = i % NG, y = Math.floor(i / NG), o = []; if (y > 0) o.push(i - NG); if (x < NG - 1) o.push(i + 1); if (y < NG - 1) o.push(i + NG); if (x > 0) o.push(i - 1); return o });
   const orden = (a, b) => a - b;

   /* Busca un río válido DISTINTO de sol (texto con la solución). Devuelve ese río, null si no hay ninguno, o 'corta' si la búsqueda se pasa de tope. */
   function buscar(Z, sol) {
      const B = new Set(Z.rocks), T = new Set(Z.towns), vis = Array(NN).fill(0), cam = [Z.s]; let nodos = 0, alt = null, corta = false;
      vis[Z.s] = 1;
      const alcanza = (c, falta) => {                                       // poda: desde c se puede llegar al mar y a todos los pueblos que faltan
         const visto = new Uint8Array(NN), pila = [c]; visto[c] = 1; let t = 0, mar = 0;
         while (pila.length) { const a = pila.pop(); for (const q of NB[a]) { if (visto[q] || vis[q] || B.has(q)) continue; visto[q] = 1; if (T.has(q)) t++; if (q == Z.t) mar = 1; pila.push(q) } }
         return mar && t >= falta
      };
      (function marcha(c, falta) {
         if (alt || corta) return;
         if (++nodos > LIM) { corta = true; return }
         if (c == Z.t) { if (!falta && cam.join() != sol) alt = cam.slice(); return }
         if (!alcanza(c, falta)) return;
         for (const q of NB[c]) { if (vis[q] || B.has(q)) continue; vis[q] = 1; cam.push(q); marcha(q, falta - (T.has(q) ? 1 : 0)); cam.pop(); vis[q] = 0; if (alt || corta) return }
      })(Z.s, Z.towns.length);
      return corta ? 'corta' : alt
   }

   function gen() {
      const r = rng(SD * 89 + 5), rnd = n => Math.floor(r() * n);
      for (let t = 0; t < 600; t++) {
         const largo = LLO + rnd(LHI - LLO + 1), cam = [rnd(NN)], en = new Set(cam);
         while (cam.length < largo) { const op = NB[cam[cam.length - 1]].filter(q => !en.has(q)); if (!op.length) break; const q = op[rnd(op.length)]; cam.push(q); en.add(q) }
         if (cam.length < largo) continue;
         const Z = { n: NG, s: cam[0], t: cam[cam.length - 1], towns: shuf(cam.slice(1, -1), r).slice(0, TLO + rnd(THI - TLO + 1)).sort(orden), rocks: [] }, sol = cam.join();
         for (let k = 0; k < 40; k++) {
            const alt = buscar(Z, sol);
            if (alt == 'corta') break;
            if (!alt) return { ...Z, sol: cam };
            const fuera = alt.filter(i => !en.has(i));                        // casillas que solo usa el otro río → roca
            if (fuera.length) { if (Z.rocks.length >= RMAX) break; Z.rocks.push(fuera[rnd(fuera.length)]); Z.rocks.sort(orden) }
            else {                                                              // mismo conjunto de casillas en otro orden → un pueblo más
               const dentro = cam.slice(1, -1).filter(i => !Z.towns.includes(i)); if (!dentro.length || Z.towns.length >= THI + 2) break;
               Z.towns.push(dentro[rnd(dentro.length)]); Z.towns.sort(orden)
            }
         }
      }
      // reserva (nunca debería hacer falta): el río recto por la fila de arriba y rocas en todo lo demás
      const fila = Array.from({ length: NG }, (_, i) => i);
      return { n: NG, s: 0, t: NG - 1, towns: [2], rocks: Array.from({ length: NN - NG }, (_, i) => i + NG), sol: fila }
   }
   const P = memoSD(gen);                                                    // se regenera si cambia la semilla (SD)

   /* Progreso: p.c = casillas del río en orden (la primera es el manantial) · p.h = pistas. */
   const ini = p => { if (!Array.isArray(p.c) || p.c[0] != P().s) { p.c = [P().s]; p.h = 0 } };
   const vistos = (Z, c) => Z.towns.filter(i => c.includes(i)).length;
   const completo = (Z, c) => c[c.length - 1] == Z.t && vistos(Z, c) == Z.towns.length;

   const I_GOTA = '<svg class="rdk" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4.2"/><path d="M5 2.4C3.6 4.1 3.2 4.8 3.2 5.7a1.8 1.8 0 0 0 3.6 0C6.8 4.8 6.4 4.1 5 2.4Z"/></svg>';
   const I_CASA = '<svg class="rdk" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4.2"/><path d="M2.9 5.2 5 3.2l2.1 2M3.6 4.8v2.3h2.8V4.8"/></svg>';
   const I_MAR = '<svg class="rdk" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4.2"/><path d="M2.4 4.6c.8-.8 1.6-.8 2.4 0s1.6.8 2.4 0M2.4 6.4c.8-.8 1.6-.8 2.4 0s1.6.8 2.4 0"/></svg>';
   const I_ROCA = '<svg class="rdr" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.6 8 4.2 3.4 5.9 6 7 4.6 8.4 8Z"/></svg>';

   /* Dibuja el tablero de Z con el río c. Si vivo, las casillas son botones. mostrar = río a dibujar de otro color (la solución, al rendirse). */
   function tablero(Z, c, vivo, mostrar) {
      const n = Z.n, B = new Set(Z.rocks), T = new Set(Z.towns), en = new Set(c), cab = c[c.length - 1];
      const celda = i => {
         const y = Math.floor(i / n), x = i % n, pos = `Fila ${y + 1}, columna ${x + 1}`;
         let ic = '', tx = 'vacía', cl = '';
         if (B.has(i)) { ic = I_ROCA; tx = 'roca'; cl = ' roca' }
         else if (i == Z.s) { ic = I_GOTA; tx = 'manantial'; cl = ' on' }
         else if (i == Z.t) { ic = I_MAR; tx = 'mar'; cl = en.has(i) ? ' on' : '' }
         else if (T.has(i)) { ic = I_CASA; tx = 'pueblo'; cl = en.has(i) ? ' lit' : '' }
         else if (en.has(i)) { tx = 'agua'; cl = ' on' }
         if (i == cab && !(i == Z.t)) cl += ' cab';
         const lab = `${pos}: ${tx}${T.has(i) ? (en.has(i) ? ' visitado' : ' sin visitar') : ''}${i == cab ? ', cabeza del río' : ''}`;
         return vivo && !B.has(i) ? `<button class="rdc${cl}" data-a="rdc" data-i="${i}" aria-label="${lab}">${ic}</button>` : `<${vivo ? 'button disabled' : 'span'} class="rdc${cl}"${vivo ? ` aria-label="${lab}"` : ''}>${ic}</${vivo ? 'button' : 'span'}>`
      };
      const pts = r => r.map(i => `${(i % n + .5).toFixed(2)},${(Math.floor(i / n) + .5).toFixed(2)}`).join(' ');
      return `<div class="rdb" data-rv="rd-tab" role="group" aria-label="Tablero de ${n} por ${n}. El manantial está en la fila ${Math.floor(Z.s / n) + 1}, columna ${Z.s % n + 1}; el mar, en la fila ${Math.floor(Z.t / n) + 1}, columna ${Z.t % n + 1}.">`
         + `<svg class="rdo" viewBox="0 0 ${n} ${n}" aria-hidden="true">${mostrar ? `<polyline class="rdl sol" points="${pts(mostrar)}"/>` : ''}<polyline class="rdl" points="${pts(c)}"/></svg>`
         + `<div class="rdg" style="--n:${n}">${Array.from({ length: n * n }, (_, i) => celda(i)).join('')}</div></div>`
   }

   function rio() {
      const p = prog('rd'); ini(p);
      const r = R('rio'), Z = P(), lost = r && r.st == 'lost', c = lost ? Z.sol : p.c, v = vistos(Z, c);
      let b = tablero(Z, c, !r, null);
      b += `<p class="cap" style="text-align:center;margin:0" aria-live="polite">Fichas de agua: <b>${c.length - 1}</b> · Pueblos: <b>${v}</b> de ${Z.towns.length}</p>`;
      if (lost) b += resRendida('Dominó de ríos', 'Este era el único río posible. Vuelve mañana para un reto nuevo.');
      else if (r) b += res(`¡El río llega al mar en ${mmss(r.t)}!`, `Pasa por ${Z.towns.length} ${pls(Z.towns.length, 'pueblo', 'pueblos')} con ${c.length - 1} fichas. Vuelve mañana para un reto nuevo.`,
         `Daily Arcade · Dominó de ríos #${DAY} · ${mmss(r.t)}${r.h ? ' · ' + r.h + pls(r.h, ' pista', ' pistas') : ''}`);
      else b += `<p class="cap" style="text-align:center;margin:0">Toca una casilla vecina a la cabeza del río para añadir una ficha. Toca una casilla del río para volver a ella.</p>`
         + `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ undo: 1, reiniciar: 1, pista: 1, rendirme: 1 })}`;
      return shell('Dominó de ríos', b)
   }

   function revisa(p) { const Z = P(); if (completo(Z, p.c)) fin('rio', { st: 'completed', t: Date.now() - p.t0, h: p.h || 0, c: 0 }) }

   function rdc(b) {
      if (R('rio')) return;
      const p = prog('rd'); ini(p); p.t0 = p.t0 || Date.now(); const i = +b.dataset.i, Z = P(), cab = p.c[p.c.length - 1], k = p.c.indexOf(i);
      if (k >= 0) {                                                          // casilla del río: se retrocede hasta ella
         if (k == p.c.length - 1) return;
         hist.push(p.c.slice()); p.c = p.c.slice(0, k + 1); msg = ''; Sfx.p('borra'); sv(); return draw()
      }
      if (cab == Z.t) { msg = 'El río ya ha llegado al mar: toca una casilla del río para retroceder.'; Sfx.p('error'); return draw() }
      if (!NB[cab].includes(i)) { msg = 'La ficha tiene que tocar la cabeza del río (en horizontal o vertical).'; Sfx.p('error'); return draw() }
      hist.push(p.c.slice()); p.c.push(i); msg = ''; Sfx.p('pon', p.c.length);
      revisa(p); sv(); draw()
   }
   function undo() { const p = prog('rd'); ini(p); if (R('rio') || !hist.length) return; p.c = hist.pop(); msg = ''; sv(); draw() }
   function reiniciar() { const p = prog('rd'); ini(p); if (R('rio') || p.c.length < 2) return; hist.push(p.c.slice()); p.c = [P().s]; msg = ''; sv(); draw() }   // el tiempo y las pistas siguen contando
   /* Pista: vuelve atrás hasta donde el río coincide con la solución y añade la ficha siguiente. */
   function pista() {
      const p = prog('rd'); ini(p); if (R('rio')) return;
      const Z = P(); let k = 0; while (k < p.c.length && k < Z.sol.length && p.c[k] == Z.sol[k]) k++;
      if (k >= Z.sol.length) return;
      p.t0 = p.t0 || Date.now(); p.h = (p.h || 0) + 1; hist.push(p.c.slice()); p.c = Z.sol.slice(0, k + 1);
      const i = Z.sol[k]; msg = `Pista: la siguiente ficha va en la fila ${Math.floor(i / NG) + 1}, columna ${i % NG + 1}.`;
      revisa(p); sv(); draw()
   }
   function rendirse() { if (R('rio')) return; const p = prog('rd'); fin('rio', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw() }

   /* Ejemplo de «Cómo se juega»: 4×4, pueblo en la casilla 5, rocas en 2 y 6; el río baja por el pueblo y llega al mar. */
   const EJ = { n: 4, s: 0, t: 11, towns: [5], rocks: [2, 6] }, EJC = [0, 1, 5, 9, 10, 11];

   DailyArcade.register({
      id: 'rio', name: 'Dominó de ríos', desc: 'Lleva el agua al mar pasando por todos los pueblos.', color: '--aqua', tag: 'Lleva el agua al mar',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5c3 0 3 4 6 4s3-4 6-4M4 12c3 0 3 4 6 4s3-4 6-4M4 19c3 0 3-4 6-4s3 4 6 4"/></svg>',
      how: ['Coloca <b>fichas de agua</b> desde el <b>manantial</b> (la gota) hasta el <b>mar</b>, una casilla vecina cada vez.', 'El río tiene que pasar por <b>todos los pueblos</b>, no puede pisar <b>rocas</b> ni cruzarse consigo mismo.', 'Toca una casilla del río para <b>retroceder</b> hasta ella. Cada reto tiene una única solución.'],
      demo: `<div class="rdd" aria-hidden="true">${tablero(EJ, EJC, false, null)}</div><p class="cap">El río baja por el pueblo, rodea las rocas y llega al mar.</p>`,
      pk: 'rd',
      render: rio,
      actions: { rdc, undo, reiniciar, pista, rendirme: confirma(rendirse) },
      status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Resuelto · ${mmss(r.t)}` : (p && p.t0 ? 'En curso' : 'Sin jugar')
   });
})();
