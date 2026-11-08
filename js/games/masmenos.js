/* Juego: Más o menos — en cada ronda se enfrentan dos elementos y hay que decir cuál tiene más. Son 10 rondas seguidas y se acaba al primer fallo:
   la puntuación son los aciertos (con 10 de 10 se gana). El reto sale de la fecha: las 10 rondas (categoría y pareja) salen de la semilla SD, así que son las mismas para todo el mundo.
   Categorías: población de países (REST Countries), visitas diarias de artículos de Wikipedia (API de visitas de Wikimedia, media de 7 días ya cerrados), altura de montañas y longitud de ríos (content/masmenos.js).
   Los datos de internet se piden EN DIRECTO al jugar y no se guardan en el repositorio. Si una petición falla se puede reintentar.
   La victoria se comprueba por reglas: se compara el valor de los dos elementos (si empatan, vale cualquiera). */
(function () {
   const D = window.MASMENOS;
   if (!D || !D.wiki || D.wiki.length < 20) { console.info('Más o menos: falta content/masmenos.js; el juego no se muestra.'); return }
   const N = 10, nf = new Intl.NumberFormat('es-ES');
   const CAT = {
      paises: { q: '¿Qué país tiene más habitantes?', f: v => nf.format(v) + ' habitantes', fuente: 'Población: <a href="https://restcountries.com" target="_blank" rel="noopener">REST Countries</a>.' },
      wiki: { q: '¿Qué artículo de Wikipedia tiene más visitas al día?', f: v => nf.format(Math.round(v)) + ' visitas al día', fuente: 'Visitas: media diaria de 7 días en la <a href="https://es.wikipedia.org" target="_blank" rel="noopener">Wikipedia en español</a> (API de Wikimedia).' },
      montanas: { q: '¿Qué montaña es más alta?', f: v => nf.format(v) + ' m' },
      rios: { q: '¿Qué río es más largo?', f: v => nf.format(v) + ' km' }
   };
   const CLAVES = Object.keys(CAT);

   /* Las 10 rondas del día: categoría y dos números del 0 al 1 que eligen la pareja dentro de su lista. */
   const RONDAS = memoSD(() => { const r = rng(SD * 131 + 17); return Array.from({ length: N }, () => ({ c: CLAVES[Math.floor(r() * CLAVES.length)], a: r(), b: r() })) });

   /* ---------- Datos en directo (se piden al abrir la ronda; si fallan se puede reintentar) ---------- */
   const VAL = {};                                                          // clave → datos | 'carga' | 'err'
   const dia = k => new Date(D0 - k * 864e5).toISOString().slice(0, 10).replace(/-/g, '') + '00';
   const ya = () => { const g = cur(); if (g && g.id == 'masmenos') draw() };
   function pedir(k, url, extrae) {
      if (VAL[k]) return;
      VAL[k] = 'carga';
      fetch(url).then(r => { if (!r.ok) throw 0; return r.json() }).then(j => { VAL[k] = extrae(j) }).catch(() => { VAL[k] = 'err' }).then(ya)
   }
   const paises = () => pedir('paises', 'https://restcountries.com/v3.1/all?fields=name,translations,population', j => {
      const l = j.filter(x => x.population >= 1e6).map(x => [(x.translations && x.translations.spa && x.translations.spa.common) || x.name.common, x.population]).sort((a, b) => a[0].localeCompare(b[0], 'es'));
      if (l.length < 50) throw 0; return l
   });
   const visitas = t => pedir('w:' + t, `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/es.wikipedia/all-access/user/${encodeURIComponent(t)}/daily/${dia(8)}/${dia(2)}`, j => {
      if (!j.items || !j.items.length) throw 0; return j.items.reduce((s, x) => s + x.views, 0) / j.items.length
   });

   /* Ronda i → 'carga' | 'err' | [{n, v}, {n, v}] (nombre y valor de cada lado). */
   function par(i) {
      const ro = RONDAS()[i]; let L;
      if (ro.c == 'paises') { paises(); L = VAL.paises; if (!Array.isArray(L)) return L || 'carga' } else L = D[ro.c];
      const n = L.length, a = Math.floor(ro.a * n); let b = Math.floor(ro.b * n); if (b == a) b = (b + 1) % n;
      const it = [L[a], L[b]];
      if (ro.c != 'wiki') return it.map(x => ({ n: x[0], v: x[1] }));
      it.forEach(x => visitas(x[0]));
      const v = it.map(x => VAL['w:' + x[0]]);
      if (v.includes('err')) return 'err';
      if (v.some(x => typeof x != 'number')) return 'carga';
      return it.map((x, k) => ({ n: x[1], v: v[k] }))
   }
   const mayor = it => it[0].v >= it[1].v ? 0 : 1;

   /* Progreso: p.a = lado elegido en cada ronda (0 izquierda/arriba, 1 derecha/abajo) · p.o = 1 si acertó, 0 si falló · p.s = rondas ya vistas tras responder. */
   const ini = p => { if (!Array.isArray(p.a)) { p.a = []; p.o = []; p.s = 0 } };
   const aciertos = p => p.o.reduce((s, x) => s + x, 0);
   const marcas = p => p.o.map(x => x ? '✓' : '✕').join('');

   function render() {
      const p = prog('mm'); ini(p);
      const r = R('masmenos'), rev = !!r || p.a.length > p.s, i = rev ? p.a.length - 1 : p.a.length;
      if (i < 0) return shell('Más o menos', r ? resultado(r, p) : '');
      if (i + 1 < N) par(i + 1);                                           // adelanta la siguiente para no esperar
      const it = par(i), ro = RONDAS()[i], cat = CAT[ro.c];
      let b = `<p class="cap" style="text-align:center;margin:0" aria-live="polite">Ronda <b>${i + 1}</b> de ${N} · Aciertos: <b>${aciertos(p)}</b></p>`;
      if (it == 'carga') return shell('Más o menos', b + '<p class="cap" style="text-align:center">Cargando datos…</p>');
      if (it == 'err') return shell('Más o menos', b + '<p class="cap" style="text-align:center">No se han podido cargar los datos de esta ronda (¿sin conexión?).</p><div class="row ctl"><button class="btn pri" data-a="mmrt">Reintentar</button></div>');
      if (!r && !p.t0) { p.t0 = Date.now(); sv() }
      const gan = mayor(it);
      b += `<h2 class="mm-q">${cat.q}</h2><div class="mm-par" role="group" aria-label="Elige una opción">${it.map((x, k) => {
         const cls = rev ? (k == gan || it[0].v == it[1].v ? ' ok' : (p.a[i] == k ? ' no' : '')) : '';
         return `<button class="mm-op${cls}"${rev ? ' disabled' : ''} data-a="mmel" data-l="${k}"${rev && p.a[i] == k ? ' aria-pressed="true"' : ''}><span class="mm-n">${esc(x.n)}</span>${rev ? `<span class="mm-v">${cat.f(x.v)}</span>` : ''}</button>`
      }).join('')}</div>`;
      if (rev) b += `<p class="msg" role="status">${p.o[i] ? '¡Correcto!' : 'Has fallado.'}</p>`;
      if (cat.fuente && rev) b += `<p class="cap carat">${cat.fuente}</p>`;
      if (r) b += resultado(r, p);
      else if (rev) b += `<div class="row ctl"><button class="btn pri" data-a="mmsig">Siguiente ronda</button></div>`;
      return shell('Más o menos', b)
   }

   function resultado(r, p) {
      const n = r.n, txt = `Daily Arcade · Más o menos #${DAY} · ${n}/${N} · ${marcas(p)}`;
      return r.st == 'won' ? res(`¡${N} de ${N}!`, 'Ni un fallo. Vuelve mañana para un reto nuevo.', txt)
         : res(`${n} ${n == 1 ? 'acierto' : 'aciertos'} seguidos`, 'Se acaba al primer fallo. Vuelve mañana para un reto nuevo.', txt)
   }

   function mmel(b) {
      const p = prog('mm'); ini(p);
      if (R('masmenos') || p.a.length > p.s) return;
      const i = p.a.length, it = par(i); if (!Array.isArray(it)) return;
      const l = +b.dataset.l, ok = l == mayor(it) || it[0].v == it[1].v ? 1 : 0;
      p.t0 = p.t0 || Date.now(); p.a.push(l); p.o.push(ok); Sfx.p(ok ? 'acierto' : 'error');
      if (!ok || p.a.length == N) { const n = aciertos(p); fin('masmenos', { st: n == N ? 'won' : 'lost', n, t: Date.now() - p.t0 }) }
      sv(); draw()
   }
   function mmsig() { const p = prog('mm'); ini(p); if (R('masmenos')) return; p.s = p.a.length; sv(); draw() }
   function mmrt() { Object.keys(VAL).forEach(k => { if (VAL[k] == 'err') delete VAL[k] }); draw() }

   DailyArcade.register({
      id: 'masmenos', name: 'Más o menos', desc: 'Elige cuál tiene más, ronda tras ronda.', color: '--sun', tag: 'Elige cuál tiene más',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20V5M4 9l4-4 4 4M16 4v15M12 15l4 4 4-4"/></svg>',
      how: ['Se enfrentan <b>dos elementos</b>: población de países, visitas diarias de Wikipedia, altura de montañas o longitud de ríos.', 'Toca el que <b>tiene más</b>. Verás los dos valores y pasarás a la siguiente ronda.', 'Son 10 rondas seguidas y se acaba <b>al primer fallo</b>. Tu puntuación son los aciertos.'],
      /* Ejemplo: una ronda con sus dos tarjetas (la correcta en verde, como en el juego) y la tira de 10 rondas con un fallo. Usa .mm-par y .mm-op. */
      demo: (() => {
         const bola = (est, t) => `<span style="display:inline-grid;place-items:center;width:22px;height:22px;box-sizing:border-box;border-radius:50%;font:800 12px sans-serif;${est}">${t}</span>`;
         const si = bola('background:var(--mint);color:#fff', '✓'), no = bola('background:var(--berry);color:#fff', '✕'), vac = bola('border:2px dashed var(--edge)', '');
         const op = (n, v, c) => `<div class="mm-op ${c}" style="min-height:66px;padding:8px 6px;cursor:default;pointer-events:none"><span class="mm-n">${n}</span><span class="mm-v">${CAT.montanas.f(v)}</span></div>`;
         return `<p class="cap">Ejemplo de ronda: <b>${CAT.montanas.q}</b></p>`
            + `<div class="mm-par" aria-hidden="true" style="width:100%;max-width:300px;grid-template-columns:1fr 1fr">${op('Everest', 8849, 'ok')}${op('Aneto', 3404, '')}</div>`
            + `<p class="cap">Tocas una y ves los dos valores: en <b style="color:var(--mint)">verde</b> la que tiene más.</p>`
            + `<div role="img" aria-label="Diez rondas: seis aciertos, un fallo y tres rondas sin jugar" style="display:flex;gap:4px;justify-content:center">${si.repeat(6)}${no}${vac.repeat(3)}</div>`
            + `<p class="cap">Son <b>10 rondas</b> y se acaba al <b>primer fallo</b>: aquí, 6 aciertos.</p>`
      })(),
      pk: 'mm',
      render,
      actions: { mmel, mmsig, mmrt },
      status: (r, p) => r ? `${r.n} de ${N} aciertos` : (p && p.a && p.a.length ? 'En curso' : 'Sin jugar')
   });
})();
