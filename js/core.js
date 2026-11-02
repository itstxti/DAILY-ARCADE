/* Daily Arcade · núcleo
   Utilidades, estado guardado, fecha/reto del día y registro de juegos.
   Para añadir un juego mira js/games/_plantilla.js y el README. */
const EPOCH = Date.UTC(2026, 9, 31); // día del reto nº 1 (año, mes-1, día). Fíjalo el día de lanzamiento, ANTES de que juegue nadie.

/* ---------- Registro de juegos ---------- */
const GAMES = [];
const DailyArcade = { register(g) { g.winLabel = g.winLabel || 'ganadas'; GAMES.push(g) } };
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
S.set = Object.assign({ cb: false, tm: true, hl: true, th: 'auto' }, S.set);
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
const R = g => DU ? DU.res[g] : (S.res[DAY] || {})[g],
   fin = (g, o) => { if (DU) return Duelo.fin(g, o); snap(g, o); (S.res[DAY] = S.res[DAY] || {})[g] = o; sv(); Nube.guardarResultado(DAY, g, o) },
   prog = g => DU ? (DU.pr[g] = DU.pr[g] || {}) : (S.pr[DAY + g] = S.pr[DAY + g] || {});
const days = (r = S.res) => Object.keys(r).map(Number).filter(d => Object.keys(r[d]).length);
function streak() { return runs(days()).cur }
let V = 'home', msg = '', sel = null, hist = [];
const theme = () => { const r = document.documentElement; if (S.set.th == 'auto') r.removeAttribute('data-theme'); else r.dataset.theme = S.set.th; document.body.classList.toggle('cb', S.set.cb) };
const KR = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'];
const kb = (st, en) => `<div class="kb">${KR.map((r, i) => `<div class="kr">${i == 2 && en ? '<button class="k w" data-a="k" data-k="Enter">Enter</button>' : ''}${[...r].map(l => `<button class="k ${st && st[l] != null ? 's' + st[l] : ''}" data-a="k" data-k="${l}"${st && st[l] != null ? ` aria-label="${l}, ${['no está en la palabra', 'está en otro sitio', 'en su sitio'][st[l]]}"` : ''}>${l}</button>`).join('')}${i == 2 ? '<button class="k w" data-a="k" data-k="Del" aria-label="Borrar">⌫</button>' : ''}</div>`).join('')}</div>`;
/* Botón de compartir solo con icono (compartir en móvil, copiar en ordenador). El texto lo lee enviar() de app.js. */
const IC_CP = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>',
   IC_SH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
   IC_OK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const compBtn = (a, l) => `<button class="btn ib" data-a="${a}" aria-label="${l}" title="${l}">${CAN_SHARE ? IC_SH : IC_CP}</button>`;
const res = (t, d, s) => DU ? Duelo.res(t) : `<section class="res rb"><h2>${t}</h2>${compBtn('copy', CAN_SHARE ? 'Compartir resultado' : 'Copiar resultado')}<p>${d}</p><div class="pw"><pre id="sh">${s}</pre></div></section>`;
/* Instrucciones del juego (propiedad "how" al registrarlo). Abiertas la primera vez; después, plegadas. Se recuerda lo que el jugador abra o cierre. */
const HW = {};
const how = () => {
   const g = cur(); if (!g || !g.how) return ''; const o = HW[g.id] !== undefined ? HW[g.id] : !E(g.id).length;
   return `<details class="how" data-g="${g.id}"${o ? ' open' : ''}><summary>Cómo se juega</summary>${g.demo ? `<div class="dm">${g.demo}</div>` : ''}<ol>${g.how.map(t => `<li><span>${t}</span></li>`).join('')}</ol></details>`
};
const shell = (t, b) => DU ? Duelo.shell(t, b) : `<div class="bar"><button class="bk" data-a="go" data-v="home">‹ Inicio</button><h1>${t}</h1></div><p class="sub" style="margin:0 0 8px">Reto nº ${DAY}</p>${how()}${b}`;

/* Barra de controles común a todos los juegos: Deshacer · Reiniciar · Comprobar · Pista · Rendirme.
   controles({undo:1, reiniciar:1, comprobar:'(−4)', pista:'(−12)', rendirme:1}) — cada juego pide solo los que tienen sentido,
   siempre en este orden y con estos nombres de acción: undo, reiniciar, comprobar, pista, rendirme.
   Un valor de texto se pinta como coste en puntos junto a la etiqueta (solo en el reto diario; en duelo el coste sale siempre en segundos, de duelo_cfg()). "Rendirme" pide confirmación con un segundo toque (confirma(fn)),
   y en un duelo se llama «Abandonar ronda» (solo pierde esa ronda; rendirse del duelo está en la cabecera). */
let CFT = 0;
const confirma = fn => () => { if (CFT) { clearTimeout(CFT); CFT = 0; fn() } else { CFT = setTimeout(() => { CFT = 0; draw() }, 3000); draw() } };
const controles = o => {
   /* En duelo las ayudas enseñan su penalización en segundos (⏱15 s); en el reto diario solo se enseña el coste en puntos que pase el juego (Cifrado). */
   const c = (k, v) => DU ? ` ⏱${Duelo.coste(k)} s` : typeof v == 'string' ? ' ' + v : '';
   const b = (a, t, x = '') => `<button class="btn${x}" data-a="${a}">${t}</button>`;
   const ley = DU && (o.pista || o.comprobar) ? '<p class="cap" style="text-align:center;margin:0">⏱ = segundos que se suman a tu tiempo</p>' : '';
   return `<div class="row ctl">${o.undo ? b('undo', 'Deshacer') : ''}${o.reiniciar ? b('reiniciar', 'Reiniciar') : ''}${o.comprobar ? b('comprobar', 'Comprobar' + c('comprobar', o.comprobar)) : ''}${o.pista ? b('pista', 'Pista' + c('pista', o.pista)) : ''}${o.rendirme ? (CFT ? b('rendirme', '¿Seguro? Sí', ' dg') : b('rendirme', DU ? 'Abandonar ronda' : 'Rendirme')) : ''}</div>${ley}`
};
/* Tarjeta de resultado de una partida rendida (igual en todos los juegos). */
const resRendida = (nombre, detalle) => res('Rendida', detalle || 'Vuelve mañana para un reto nuevo.', `Daily Arcade · ${nombre} #${DAY} · rendida`);

/* Fila de cifras para el perfil: kpi([[valor,etiqueta,detalle?],…]) */
const kpi = a => `<div class="kp">${a.map(([v, l, x]) => `<div><b>${v}</b>${x ? `<i>${x}</i>` : ''}<span>${l}</span></div>`).join('')}</div>`;
const E = (g, r = S.res) => Object.entries(r).filter(([d, o]) => o[g]).map(([d, o]) => ({ d: +d, ...o[g] }));
function runs(ds) { const q = new Set(ds); let best = 0, n = 0;[...ds].sort((a, b) => a - b).forEach(d => { n = q.has(d - 1) ? n + 1 : 1; best = Math.max(best, n) }); let d = q.has(DAY) ? DAY : DAY - 1, cur = 0; while (q.has(d)) { cur++; d-- } return { cur, best } }
const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), esc = t => t.replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
