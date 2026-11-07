/* Daily Arcade · núcleo
   Utilidades, estado guardado, fecha/reto del día y registro de juegos.
   Para añadir un juego mira js/games/_plantilla.js y el README. */
const EPOCH = Date.UTC(2026, 9, 31); // día del reto nº 1 (año, mes-1, día). Fíjalo el día de lanzamiento, ANTES de que juegue nadie.

/* ---------- Registro de juegos ---------- */
const GAMES = [];
const DailyArcade = { register(g) { GAMES.push(g) } };
const cur = () => GAMES.find(g => g.id == V);

/* En móvil se abre el menú de compartir del sistema; en ordenador se copia al portapapeles. */
const CAN_SHARE = !!navigator.share && matchMedia('(pointer:coarse)').matches;
const $ = s => document.querySelector(s), TZ = 'Europe/Madrid';
const parts = () => { const o = {}; new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(p => o[p.type] = +p.value); return o };
const P = parts(), D0 = Date.UTC(P.year, P.month - 1, P.day), DAY = Math.round((D0 - EPOCH) / 864e5) + 1, WD = new Date(D0).getUTCDay();
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
const shuf = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a };
const nz = k => k.toLowerCase() === 'ñ' ? 'ñ' : k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const mmss = ms => { const s = Math.floor(ms / 1e3); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') };
let S = { res: {}, pr: {}, me: { n: 'Invitado', v: 'public' } }; try { S = Object.assign(S, JSON.parse(localStorage.getItem('da2') || '{}')) } catch (e) { }
S.set = Object.assign({ cb: false, tm: true, hl: true, vib: false, snd: false, mus: false, th: 'auto' }, S.set);
const sv = () => { try { localStorage.setItem('da2', JSON.stringify(S)) } catch (e) { } };
/* S.uid = cuenta a la que pertenecen los datos de este navegador (null = invitado). */
/* Semilla del puzle (SD): el reto de hoy o, en un duelo, la semilla de la ronda (la elige el servidor). Los juegos generan con SD, no con DAY.
   DU = ronda de duelo en juego (ver js/duelo.js): mientras exista, R/prog/fin trabajan sobre un espacio aparte y NUNCA tocan tus resultados diarios ni tus rachas. */
let SD = DAY, DU = null;
const memoSD = gen => { let ok, k, v; return () => { if (!ok || k !== SD) { ok = 1; k = SD; v = gen() } return v } }; /* el puzle se regenera solo si cambia la semilla */
/* El tablero final (progreso del juego) vive solo en este navegador: al cerrar sesión se borra y no se sube. Para poder volver a verlo al entrar de nuevo,
   se guarda una copia dentro del resultado (o.pr). Si no cabe en el límite del servidor (4000), se omite y el resultado se guarda igual. */
const snap = (g, o) => { const gm = GAMES.find(x => x.id == g), p = gm && gm.pk && S.pr[DAY + gm.pk]; if (!p) return; try { const t = JSON.stringify(p); if (t.length <= 3000) o.pr = JSON.parse(t) } catch (e) { } };
/* Al entrar: si hoy hay un juego terminado sin progreso local (otro navegador, o se cerró sesión), recompone el tablero final desde el resultado. */
const restaurar = () => GAMES.forEach(g => { const r = (S.res[DAY] || {})[g.id]; if (!r || !g.pk || S.pr[DAY + g.pk]) return; if (r.pr) S.pr[DAY + g.pk] = JSON.parse(JSON.stringify(r.pr)); else if (g.id == 'palabra' && r.g) S.pr[DAY + g.pk] = { g: r.g.slice() } }); /* palabra: los resultados antiguos ya guardaban los intentos */
/* Animaciones de un solo uso: Anim.once('x') marca un efecto para el PRÓXIMO draw() y se limpia justo después,
   así no se repite cuando la pantalla se vuelve a pintar (pulsar una tecla, un temporizador…). Anim.has('x') se consulta al renderizar. */
const Anim = { f: new Set(), once(k) { this.f.add(k) }, has(k) { return this.f.has(k) }, clear() { this.f.clear() } };
/* Vibración opcional (Ajustes → Juegos) al terminar: patrón corto si ganas, uno largo si no. Solo en dispositivos que la admiten. */
const vibra = o => { try { if (S.set.vib && navigator.vibrate) navigator.vibrate(o && (o.st == 'won' || o.st == 'completed') ? [30, 50, 30] : [140]) } catch (_) { } };
const R = g => DU ? DU.res[g] : (S.res[DAY] || {})[g],
   fin = (g, o) => { if (DU) return Duelo.fin(g, o); Anim.once('fin'); vibra(o); Musica.duck(1.8); Sfx.fin(o, Anim.has('rv') ? .5 : 0); /* en Palabra, tras girar las casillas */ const r0 = streak(); o = penaliza(o); snap(g, o); (S.res[DAY] = S.res[DAY] || {})[g] = o; if (streak() > r0) STUP = true; sv(); Nube.guardarResultado(DAY, g, o) },
   prog = g => DU ? (DU.pr[g] = DU.pr[g] || {}) : (S.pr[DAY + g] = S.pr[DAY + g] || {});
const days = (r = S.res) => Object.keys(r).map(Number).filter(d => Object.keys(r[d]).length);
function streak() { return runs(days()).cur }
let V = 'home', msg = '', sel = null, hist = [];
let STUP = false; /* la racha ha subido: el inicio la anima la próxima vez que se pinta */
const theme = () => { const r = document.documentElement; if (S.set.th == 'auto') r.removeAttribute('data-theme'); else r.dataset.theme = S.set.th; document.body.classList.toggle('cb', S.set.cb) };
const KR = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'];
/* Las ayudas suman segundos al tiempo del reto diario, igual que en un duelo (pista_ms / comprobar_ms). Se guardan la penalización (pen) y el tiempo real (tr). */
const penaliza = o => {
   if (!o || (o.st != 'won' && o.st != 'completed') || typeof o.t != 'number' || o.pen) return o;
   const pen = (+o.h || 0) * Duelo.coste('pista') * 1000 + (+o.c || 0) * Duelo.coste('comprobar') * 1000;
   return pen > 0 ? Object.assign({}, o, { tr: o.t, t: o.t + pen, pen }) : o
};
/* Cronómetro de la partida: tiempo transcurrido + segundos de penalización por ayudas (pista/comprobar), con el desglose a la vista. */
const penP = p => p ? ((+p.h || 0) * Duelo.coste('pista') + (typeof p.c == 'number' ? p.c : 0) * Duelo.coste('comprobar')) : 0;
const tmTxt = p => { const e = p && p.t0 ? Date.now() - p.t0 : 0, pn = penP(p) * 1000; return mmss(e + pn) + (pn ? `<span class="tp">${mmss(e)} + ${Math.round(pn / 1000)} s de ayudas</span>` : '') };
const tmHtml = p => `<p class="tm" id="tm"><span id="tmv">${p && p.t0 ? mmss(Date.now() - p.t0 + penP(p) * 1000) : '0:00'}</span><span class="tp" id="tmp">${p && p.t0 && penP(p) ? `${mmss(Date.now() - p.t0)} + ${penP(p)} s de ayudas` : ''}</span></p>`;
const kb = (st, en) => `<div class="kb">${KR.map((r, i) => `<div class="kr">${i == 2 && en ? '<button class="k w" data-a="k" data-k="Enter">Enter</button>' : ''}${[...r].map(l => `<button class="k ${st && st[l] != null ? 's' + st[l] : ''}" data-a="k" data-k="${l}"${st && st[l] != null ? ` aria-label="${l}, ${['no está en la palabra', 'está en otro sitio', 'en su sitio'][st[l]]}"` : ''}>${l}</button>`).join('')}${i == 2 ? '<button class="k w" data-a="k" data-k="Del" aria-label="Borrar">⌫</button>' : ''}</div>`).join('')}</div>`;
/* Botón de compartir solo con icono (compartir en móvil, copiar en ordenador). El texto lo lee enviar() de app.js. */
const IC_CP = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>',
   IC_SH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
   IC_OK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const compBtn = (a, l) => `<button class="btn ib" data-a="${a}" aria-label="${l}" title="${l}">${CAN_SHARE ? IC_SH : IC_CP}</button>`;
/* Línea discreta bajo el resultado cuando hubo ayudas: «3:13 + 195 s de ayudas», igual que el desglose del cronómetro. */
const penNota = () => { const g = cur(), r = g && R(g.id); return r && r.pen ? `<p class="cap" style="margin:-6px 0 10px">${mmss(r.tr)} + ${Math.round(r.pen / 1000)} s de ayudas</p>` : '' };
const res = (t, d, s) => { if (DU) return Duelo.res(t); const g = cur(), n = g && estrellas(g.id, R(g.id)), e = n ? estTxt(n) : '';
   return `<section class="res rb"><h2>${t}</h2>${compBtn('copy', CAN_SHARE ? 'Compartir resultado' : 'Copiar resultado')}${n == null ? '' : `<p class="est" aria-label="${n} de 5 estrellas">${estTxt(n)}</p>`}<p>${d}</p>${penNota()}<div class="pw"><pre id="sh">${s}${e ? ' · ' + e : ''}</pre></div>${siguiente2(g)}</section>` };
/* Siguiente paso tras terminar un juego: el próximo sin jugar (empezando por el que sigue al actual) o, si ya están los 10, el cierre del día. */
const siguiente2 = g => {
   if (!g) return '';
   const i = GAMES.findIndex(x => x.id == g.id), orden = [...GAMES.slice(i + 1), ...GAMES.slice(0, i)], n = orden.find(x => !R(x.id));
   if (n) return `<button class="btn pri full sg2" data-a="go" data-v="${n.id}">Siguiente: ${n.name}</button><p class="cap sg3">${GAMES.filter(x => R(x.id)).length} de ${GAMES.length} hechos hoy</p>`;
   const st = streak();
   return `<div class="cierre"><b>¡Los ${GAMES.length} retos de hoy, completados!</b><span>Racha: ${st} ${st == 1 ? 'día' : 'días'}. Próximo reto en <b id="cd">--:--:--</b></span><button class="btn pri full" data-a="go" data-v="home">Volver al inicio</button></div>`
};
/* Instrucciones del juego (propiedad "how" al registrarlo). Abiertas la primera vez; después, plegadas. Se recuerda lo que el jugador abra o cierre. */
const HW = {};
const how = () => {
   const g = cur(); if (!g || !g.how) return '';
   /* Abiertas solo la primera vez y hasta la primera jugada: así no empujan el tablero (ni el teclado) fuera de pantalla. Si la persona las abre o cierra, se respeta. */
   const pr = DU ? DU.pr[g.pk] : S.pr[DAY + g.pk], emp = !!(pr && (pr.t0 || (pr.g && pr.g.length))),
      o = HW[g.id] !== undefined ? HW[g.id] : !E(g.id).length && !emp;
   return `<details class="how" data-g="${g.id}"${o ? ' open' : ''}><summary>Cómo se juega</summary>${g.demo ? `<div class="dm">${g.demo}</div>` : ''}<ol>${g.how.map(t => `<li><span>${t}</span></li>`).join('')}</ol></details>`
};
const shell = (t, b) => DU ? Duelo.shell(t, b) : `<div class="bar"><button class="bk" data-a="go" data-v="home">‹ Inicio</button><h1>${t}</h1></div><p class="sub" style="margin:0 0 8px">Reto nº ${DAY}</p>${how()}${b}`;

/* Barra de controles común a todos los juegos: Deshacer · Reiniciar · Comprobar · Pista · Rendirme.
   controles({undo:1, reiniciar:1, comprobar:1, pista:1, rendirme:1}) — cada juego pide solo los que tienen sentido,
   siempre en este orden y con estos nombres de acción: undo, reiniciar, comprobar, pista, rendirme.
   pista y comprobar enseñan su coste en segundos (de duelo_cfg(); mismo valor en el reto diario y en duelo). "Rendirme" pide confirmación con un segundo toque (confirma(fn)),
   y en un duelo se llama «Abandonar ronda» (solo pierde esa ronda; rendirse del duelo está en la cabecera).
   La confirmación NO caduca sola (antes se revertía a los 3 s, incómodo con teclado, lector de pantalla o poca destreza): sigue hasta
   que se pulsa «Sí», «Cancelar» o Esc, o hasta que cambia la pantalla o se pulsa otra acción (ver app.js y draw()). */
let CFT = 0;
const confirma = fn => () => { if (CFT) { CFT = 0; fn() } else { CFT = 1; draw(); const c = $('[data-a="cft-no"]'); if (c) c.focus({ preventScroll: true }) } }; /* el foco va a «Cancelar»: la opción segura */
const controles = o => {
   /* Las ayudas enseñan su penalización en segundos (⏱15 s), en el reto diario y en duelo: en los dos se suma al tiempo. */
   const c = k => ` ⏱${Duelo.coste(k)} s`;
   const b = (a, t, x = '') => `<button class="btn${x}" data-a="${a}">${t}</button>`;
   const ley = (o.pista || o.comprobar) ? '<p class="cap" style="text-align:center;margin:0">⏱ = segundos que se suman a tu tiempo</p>' : '';
   /* Con la confirmación abierta solo se ofrecen «Cancelar» y «Sí»: así la pregunta no se mezcla con Deshacer/Reiniciar. */
   if (o.rendirme && CFT) return `<div class="row ctl" role="group" aria-label="Confirmar"><button class="btn" data-a="cft-no" aria-describedby="cft-t">Cancelar</button>${b('rendirme', DU ? 'Sí, abandonar' : 'Sí, rendirme', ' dg')}</div><p class="cap cc" id="cft-t">${DU ? '¿Abandonar la ronda? Pierdes solo esta ronda.' : '¿Rendirte? El reto cuenta como perdido y no se puede deshacer.'} Esc para cancelar.</p>`;
   return `<div class="row ctl">${o.undo ? b('undo', 'Deshacer') : ''}${o.reiniciar ? b('reiniciar', 'Reiniciar') : ''}${o.comprobar ? b('comprobar', 'Comprobar' + c('comprobar', o.comprobar)) : ''}${o.pista ? b('pista', 'Pista' + c('pista', o.pista)) : ''}${o.rendirme ? b('rendirme', DU ? 'Abandonar ronda' : 'Rendirme') : ''}</div>${ley}`
};
/* Tarjeta de resultado de una partida rendida (igual en todos los juegos). */
const resRendida = (nombre, detalle) => res('Rendida', detalle || 'Vuelve mañana para un reto nuevo.', `Daily Arcade · ${nombre} #${DAY} · rendida`);

/* Fila de cifras para el perfil: kpi([[valor,etiqueta,detalle?],…]) */
/* Pares [valor, etiqueta] de mejor tiempo y tiempo medio de las partidas ganadas (w); vacío si ninguna tiene tiempo. */
const kTiempos = w => { const t = w.map(x => x.t).filter(x => typeof x == 'number' && x > 0); return t.length ? [[mmss(Math.min(...t)), 'mejor tiempo'], [mmss(avg(t)), 'tiempo medio']] : [] };
/* ---------- Estrellas (0–5), iguales en todos los juegos ----------
   0 = rendida. Resuelta: de 1 a 5 según el tiempo (ya con la penalización de ayudas) frente al tiempo de referencia del juego (segundos, REF):
   hasta 1×REF → 5, 1,5× → 4, 2× → 3, 3× → 2, más → 1. Palabra (5 intentos) se mide por intentos: 1 → 5, 2 → 4, 3 → 3, 4 → 2, 5 → 1 (las antiguas de 6 intentos también dan 1).
   Los tiempos de referencia son un punto de partida: ajústalos aquí, en un único sitio. */
const REF = { cifra: 120, coronas: 30, sudoku: 100, escalera: 20, operaciones: 15, camino: 20, luces: 40, tuberias: 15, sopa: 30, sospechosos: 60, balanza: 40, intruso: 40, mezcla: 40, siluetas: 60, rayo: 60 };
const estrellas = (id, r) => {
   if (!r) return null; if (r.st != 'won' && r.st != 'completed') return 0;
   if (id == 'palabra') return typeof r.att == 'number' && r.att >= 1 ? [5, 4, 3, 2, 1, 1][Math.min(r.att, 6) - 1] : null;
   if (typeof r.t != 'number' || r.t <= 0 || !REF[id]) return null;
   const x = r.t / (REF[id] * 1000); return x <= 1 ? 5 : x <= 1.5 ? 4 : x <= 2 ? 3 : x <= 3 ? 2 : 1
};
const estTxt = n => n == null ? '' : '★'.repeat(n) + '☆'.repeat(5 - n);
const kpi = a => `<div class="kp">${a.map(([v, l, x]) => `<div><b>${v}</b>${x ? `<i>${x}</i>` : ''}<span>${l}</span></div>`).join('')}</div>`;
const E = (g, r = S.res) => Object.entries(r).filter(([d, o]) => o[g]).map(([d, o]) => ({ d: +d, ...o[g] }));
function runs(ds) { const q = new Set(ds); let best = 0, n = 0;[...ds].sort((a, b) => a - b).forEach(d => { n = q.has(d - 1) ? n + 1 : 1; best = Math.max(best, n) }); let d = q.has(DAY) ? DAY : DAY - 1, cur = 0; while (q.has(d)) { cur++; d-- } return { cur, best } }
const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), esc = t => t.replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
