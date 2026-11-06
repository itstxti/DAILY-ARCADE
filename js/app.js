/* Daily Arcade · pantallas (inicio, perfil, ajustes) y arranque.
   No hace falta tocar este archivo para añadir juegos. */
const VT = { public: 'Cualquiera que te encuentre por tu @usuario podrá ver tu perfil: nombre, rachas y estadísticas por juego.', private: 'Solo tus amigos verán tu perfil y te verás en sus rankings. Los demás te encuentran por tu @usuario, pero solo ven eso, y pueden enviarte una solicitud.' }, VS = { public: 'Público', private: 'Privado' };
/* Invitado = sin sesión. En modo local (sin Supabase) siempre lo es. Un invitado no tiene perfil que otros puedan ver,
   así que no se le ofrece elegir la privacidad. */
const inv = () => !Nube.user, pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const UOK = /^[a-z0-9_]{3,15}$/, UMSG = 'El usuario debe tener de 3 a 15 caracteres: minúsculas, números o _.', nu = v => String(v).trim().toLowerCase().replace(/^@/, '');
let vp = 'perfil'; /* de dónde se abrió Cuenta, para el botón Volver (perfil, ajustes o home) */
const VPN = { perfil: 'Perfil', ajustes: 'Ajustes', home: 'Inicio' };
let vd = 'home'; /* de dónde se abrió Duelos (inicio o amigos), para el botón Volver */
let cm = 'entrar', fm = {}; /* pantalla de acceso (entrar/crear) y lo escrito en ella */
let en = false; /* editando el nombre en Perfil */
let eu = null; /* usuario en edición (null = no se está editando) */
let ask = false; /* confirmación de "Borrar mis resultados" */
const IDS = () => GAMES.map(g => g.id);
let AM = null, fq = '', fr; /* AM: amistades (null = sin cargar). fq: texto buscado. fr: resultado (undefined = sin buscar, null = no encontrado) */
let cfm = null; /* amigo pendiente de confirmar "Quitar" */
let fs = false; /* cerrar sesión falló al subir resultados: se ofrece reintentar o salir igualmente */
let blq = null, BL = null; /* blq: usuario pendiente de confirmar "Bloquear". BL: usuarios que has bloqueado (null = sin cargar) */
function cargarBloqueados() { return Nube.bloqueados().then(l => { BL = l }).catch(e => { console.warn(e); BL = BL || [] }).then(() => { if (V == 'ajustes') draw() }) }
let FP = null; /* perfil de amigo abierto: {u, n, res (misma forma que S.res), err} */
function verAmigo(u) {
  const f = FP = { u, n: null, res: null, err: '' }; V = 'amigo'; msg = ''; draw();
  Nube.verPerfil(u).then(d => {
    const res = {}, ids = IDS();
    (d.resultados || []).forEach(r => { if (Number.isInteger(r.d) && r.d >= 1 && r.d <= DAY && ids.includes(r.j) && r.x && typeof r.x == 'object') (res[r.d] = res[r.d] || {})[r.j] = r.x });
    f.res = res; f.n = d.nombre; f.u = d.usuario
  }).catch(e => { console.warn(e); f.err = em(e) }).then(() => { if (FP === f && V == 'amigo') draw() })
}
let RK = { tab: 'dia', d: DAY, dia: null, rachas: null, err: '' }, rkTok = 0; /* ranking: pestaña, día visto y datos (null = cargando) */
function cargarRanking() {
  const t = RK.tab, d = RK.d, k = ++rkTok; RK.err = ''; RK.ld = true;
  (t == 'dia' ? Nube.rankingDia(d) : Nube.rankingRachas())
    .then(l => { if (k == rkTok) RK[t] = l }).catch(e => { console.warn(e); if (k == rkTok) { RK[t] = []; RK.err = em(e) } })
    .then(() => { if (k == rkTok) RK.ld = false; if (k == rkTok && V == 'ranking') draw() })
}
const em = e => e && e.code == 'P0001' && e.message ? e.message : 'No se ha podido completar la acción. Inténtalo de nuevo.'; /* solo mostramos los mensajes que escribe el servidor */
const nrec = () => (AM || []).filter(a => a.estado == 'pendiente' && a.direccion == 'recibida').length;
function cargarAmigos() {
  return Nube.amistades().then(l => { AM = l }).catch(e => { console.warn(e); if (V == 'amigos') msg = 'No se han podido cargar tus amigos.' }).then(() => { if (V == 'amigos' || V == 'home') draw() })
}
/* Ejecuta una acción de amistad y recarga la lista. */
function accion(p, ok, vol) {
  msg = 'Un momento…'; draw();
  p.then(r => { msg = typeof ok == 'function' ? ok(r) : ok || ''; return Nube.amistades() }).then(l => { AM = l }).catch(e => { console.warn(e); msg = em(e) }).then(() => { cfm = null; blq = null; if (vol && V == 'amigo') { V = 'amigos'; FP = null } draw() })
}

/* Al iniciar sesión (o recuperar la sesión al abrir la web): los datos del navegador pasan a ser de esta cuenta y se fusionan con los del servidor.
   Si el navegador tenía datos de OTRA cuenta, se descartan (nunca se suben a una cuenta ajena). Los de un invitado (uid null) sí se suben. */
async function alEntrar() {
  const u = Nube.user; if (!u) return;
  if (S.uid && S.uid !== u.id) { S.res = {}; S.pr = {}; S.me = { n: 'Invitado', v: 'public' }; AM = null }
  S.uid = u.id;
  if (Nube.perfil) { S.me.n = Nube.perfil.nombre; S.me.v = Nube.perfil.privacidad == 'public' || !Nube.perfil.privacidad ? 'public' : 'private' }
  sv();
  if (navigator.onLine) try { await Nube.sincronizar(S, DAY, IDS()) }
    catch (e) { console.warn('Sincronización fallida', e); msg = 'No se han podido sincronizar tus resultados con tu cuenta. Siguen guardados en este navegador y se reintentará.' }
  restaurar(); sv()
}
async function cerrar(forzar) {
  if (!forzar) {
    msg = 'Guardando tus resultados…'; fs = false; draw();
    try { await Nube.subirTodo(S, DAY, IDS()) } catch (e) { console.warn(e); msg = 'No se han podido guardar tus últimos resultados en tu cuenta. Comprueba la conexión e inténtalo de nuevo. Si cierras sesión igualmente, los resultados que no se hayan subido se perderán de este navegador.'; fs = true; draw(); return }
  }
  try { await Nube.salir() } catch (e) { console.warn(e) }
  S = { res: {}, pr: {}, me: { n: 'Invitado', v: 'public' }, set: S.set, uid: null }; Nube.user = Nube.perfil = null; Duelo.reset(); AM = null; BL = null; blq = null; fq = ''; fr = undefined; sv(); msg = ''; fs = false; eu = null; draw()
}

/* ---------- Ajustes ---------- */
function seg(a, k, o, lab) { const on = a == 'vis' ? S.me.v : S.set[k]; return `<div class="seg" role="group" aria-label="${lab}">${o.map(([v, l]) => `<button class="btn" data-a="${a}" data-v="${v}"${a == 'set' ? ` data-k="${k}"` : ''} aria-pressed="${on == v}">${l}</button>`).join('')}</div>` }
function sw(k, l, d) { return `<div class="st"><span><b>${l}</b><small>${d}</small></span><button class="sw" role="switch" aria-checked="${!!S.set[k]}" aria-label="${l}" data-a="set" data-k="${k}"></button></div>` }
function secCuenta() {
  if (inv()) return `<section class="res pb"><h2>Cuenta</h2><p>Juegas como invitado: tu perfil solo existe en este navegador y nadie más puede verlo.${Nube.activo ? ' Con una cuenta podrás elegir quién ve tu perfil.' : ''}</p>${Nube.activo ? '<div class="row"><button class="btn pri" data-a="go" data-v="cuenta">Entrar o crear cuenta</button></div>' : ''}</section>`;
  return `<section class="res pb"><h2>Cuenta</h2><div class="st"><span><b>${esc(S.me.n)}</b><small>${esc(Nube.user.email)}</small></span><button class="btn" data-a="go" data-v="cuenta">Mi cuenta</button></div><div class="st v"><span><b>Privacidad del perfil</b><small>${VT[S.me.v]}</small></span>${seg('vis', '', [['public', 'Público'], ['private', 'Privado']], 'Privacidad del perfil')}</div></section>`
}
function ajustes() {
  return `<div class="aj"><div class="bar"><button class="bk" data-a="go" data-v="home">‹ Inicio</button><h1>Ajustes</h1></div>
${secCuenta()}
${msg ? `<p class="msg" role="status">${msg}</p>` : ''}
<section class="res pb"><h2>Apariencia</h2><div class="st v"><span><b>Tema</b></span>${seg('set', 'th', [['auto', 'Sistema'], ['light', 'Claro'], ['dark', 'Oscuro']], 'Tema')}</div>${sw('cb', 'Paleta para daltónicos', 'Cambia los colores de acierto en Palabra; los símbolos ✓ ● – se mantienen.')}</section>
<section class="res pb"><h2>Juegos</h2>${sw('tm', 'Mostrar cronómetro', 'En todos los juegos.')}${sw('hl', 'Resaltar conflictos', 'En Coronas, marca filas, columnas y regiones repetidas y coronas que se tocan. En Sudoku, números repetidos.')}${navigator.vibrate ? sw('vib', 'Vibración', 'Una vibración corta al terminar un juego: más suave si aciertas, más larga si no.') : ''}</section>
${inv() ? '' : `<section class="res pb"><h2>Usuarios bloqueados</h2>${BL === null ? '<p class="cap">Cargando…</p>' : BL.length ? BL.map(b => `<div class="st"><span><b>${esc(b.nombre || '@' + b.usuario)}</b>${b.nombre ? `<small>@${esc(b.usuario)}</small>` : ''}</span><button class="lnk" data-a="bl-un" data-u="${esc(b.usuario)}">Desbloquear</button></div>`).join('') : '<p>No has bloqueado a nadie.</p>'}</section>`}
${secInstalar()}
<section class="res pb"><h2>Datos</h2><p>${inv() ? 'Tus resultados se guardan solo en este navegador.' : 'Tus resultados se guardan en tu cuenta y en este navegador.'}</p>${ask ? '<p class="cf"><b>¿Borrar todos tus resultados?</b> ' + (inv() ? '' : 'Se borrarán también de tu cuenta. ') + 'No se puede deshacer.</p><div class="row cf"><button class="btn dg" data-a="reset-si">Sí, borrar</button><button class="btn" data-a="reset-no">Cancelar</button></div>' : '<div class="row cf"><button class="btn" data-a="reset">Borrar mis resultados</button></div>'}</section></div>`
}

/* ---------- Perfil ---------- */
/* Puntuación media (en estrellas, sobre 5) de todas las partidas (rendida = 0), como tarjeta del perfil. */
const ke = (e, g) => { const s = e.map(x => estrellas(g.id, x)).filter(x => x != null); return s.length ? [[avg(s).toFixed(1) + ' / 5', 'puntuación media']] : [] };
/* Histograma de puntuaciones: cuántas partidas han acabado con 5, 4… 0 estrellas (0 = rendida). Igual en todos los juegos. */
const histo = (e, g) => {
  const n = [0, 0, 0, 0, 0, 0]; let t = 0; e.forEach(x => { const s = estrellas(g.id, x); if (s != null) { n[s]++; t++ } });
  if (!t) return ''; const m = Math.max(...n);
  return '<p class="cap" style="margin:0 0 6px">Partidas según su puntuación</p>' + [5, 4, 3, 2, 1, 0].map(s => `<div class="br"><span class="es" aria-label="${s} de 5 estrellas">${estTxt(s)}</span><u><i style="width:${n[s] / m * 100}%"></i></u><b>${n[s]}</b></div>`).join('')
};
function blk(g, e, am) {
  e = e || E(g.id); const w = e.filter(x => x.st == 'won' || x.st == 'completed'), a = runs(e.map(x => x.d)), v = runs(w.map(x => x.d)), vs = true,
    c = (n, l, s) => `<div><b>${n}</b><span>${l}${s ? `<small>${s}</small>` : ''}</span></div>`, sg = (n, l) => n == 1 ? l.replace(/s\b/g, '') : l;
  return `<details class="res pb gm"${GAMES.length <= 3 ? ' open' : ''}><summary><span class="gi" style="background:var(${g.color})">${g.icon}</span><h2>${g.name}</h2><small>${e.length ? a.cur + (a.cur == 1 ? ' día' : ' días') + ' de racha' : 'Sin jugar'}</small></summary>` +
    (e.length ? `<div class="gs">${c(e.length, sg(e.length, 'partidas'))}${c(w.length, sg(w.length, 'ganadas'), pct(w.length, e.length) + ' %')}${c(a.cur, 'días de racha', 'mejor ' + a.best)}${vs ? c(v.cur, sg(v.cur, 'victorias seguidas'), 'mejor ' + v.best) : ''}</div><div class="gx">${(() => { try { return histo(e, g) + (g.stats ? g.stats(e, w, ke(e, g)) : (w.length ? kpi([...kTiempos(w), ...ke(e, g)]) : '')) } catch (x) { return '' } })()}</div>`
      : (am ? '<p>Todavía no ha jugado este juego.</p>' : `<p>Todavía no has jugado este reto.</p><div class="row"><button class="btn" data-a="go" data-v="${g.id}">Jugar ahora</button></div>`)) + `</details>`
}
/* Reto N -> «jueves 5 de noviembre» (el reto 1 es EPOCH, ver core.js) */
const fdia = d => new Date(EPOCH + (d - 1) * 864e5).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const hmTxt = (d, n, T, sr) => `Reto ${d} · ${fdia(d)}: ${sr ? n + ' de ' + T : n + '/' + T} ${T == 1 ? 'juego' : 'juegos'}${sr ? ' jugados' : ''}`;
/* Mejor y más flojo: % de partidas ganadas, solo juegos con 3 o más partidas y solo si hay al menos dos para comparar. */
function mejorFlojo(res) {
  const L = GAMES.map(g => { const e = E(g.id, res), w = e.filter(x => x.st == 'won' || x.st == 'completed').length; return { g, n: e.length, p: pct(w, e.length) } }).filter(x => x.n >= 3);
  if (L.length < 2) return '';
  L.sort((a, b) => b.p - a.p || b.n - a.n); const m = L[0], f = L[L.length - 1];
  if (m.p == f.p) return '';
  const t = (k, x) => `<div><span class="gi" style="background:var(${x.g.color})" aria-hidden="true">${x.g.icon}</span><span><small>${k}</small><b>${x.g.name}</b><small>${x.p} % ganadas · ${x.n} partidas</small></span></div>`;
  return `<div class="mj">${t('Tu mejor juego', m)}${t('El más flojo', f)}</div>`
}
function resumen(res) {
  const all = days(res), gr = runs(all), T = GAMES.length, full = all.filter(d => Object.keys(res[d]).length == T).length;
  return `<div class="sm"><div><b>${gr.cur}</b>racha actual</div><div><b>${gr.best}</b>mejor racha</div><div><b>${all.length}</b>días jugados</div></div>${mejorFlojo(res)}
<section class="res pb"><h2>Últimos 28 días</h2><div class="hm" role="group" aria-label="Actividad de los últimos 28 días" data-rv="hm">${Array.from({ length: 28 }, (_, i) => { const d = DAY - 27 + i, n = Object.keys(res[d] || {}).length, t = hmTxt(d, n, T); return `<button class="${n == T ? 'f' : n ? 'p' : ''}${i == 27 ? ' hoy' : ''}" data-a="hm" data-d="${d}" data-n="${n}" aria-pressed="false" aria-label="${hmTxt(d, n, T, 1)}${i == 27 ? ' (hoy)' : ''}" title="${t}">${n || ''}</button>` }).join('')}</div><p class="cap" id="hms" role="status">Cada casilla muestra los juegos jugados ese día; dorada = los ${T}. Toca un día para ver el detalle.</p><p class="cap">${full} ${full == 1 ? 'día' : 'días'} con los ${T} juegos completados.</p></section>`
}
function perfil() {
  const me = S.me,
    us = Nube.perfil && Nube.perfil.usuario,
    pie = inv() ? `<div class="hs"><p>Juegas sin cuenta: tus resultados se guardan solo en este navegador.</p>${Nube.activo ? '<div class="row"><button class="btn pri" data-a="go" data-v="cuenta">Entrar o crear cuenta</button></div>' : ''}</div>`
      : `<div class="hs"><button class="btn pri" data-a="go" data-v="amigos">Amigos${nrec() ? ` · ${nrec()} ${nrec() == 1 ? 'solicitud' : 'solicitudes'}` : ''}</button></div>`;
  return `<div class="bar"><button class="bk" data-a="go" data-v="home">‹ Inicio</button><h1>Perfil</h1></div>
<section class="res hd"><div class="me"><span class="av lg">${inv() ? IC.user : esc((me.n[0] || 'I').toUpperCase())}</span>${en
      ? `<span class="id" style="flex:1;align-items:stretch"><input id="nm" value="${esc(me.n)}" maxlength="20" placeholder="Tu nombre" aria-label="Nombre" autocomplete="off"><span class="row" style="margin:0"><button class="btn pri" data-a="nm-save">Guardar</button><button class="btn" data-a="nm-cancel">Cancelar</button></span></span>`
      : `<span class="id" style="flex:1"><b>${esc(me.n)}<button class="lnk ed" data-a="nm-edit" aria-label="Editar nombre" title="Editar nombre"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg></button></b>${us ? `<small>@${esc(us)}</small>` : ''}</span>${inv() ? '' : `<span class="tag" style="flex:none" title="Quién puede ver tu perfil. Se cambia en Ajustes.">${VS[me.v]}</span>`}`}</div>${pie}</section>
${resumen(S.res)}` + '<section class="gml">' + GAMES.map(g => blk(g)).join('') + '</section>'
}

/* ---------- Amigos (solo con sesión) ---------- */
function amigos() {
  const L = AM || [], T = GAMES.length, M = msg ? `<p class="msg" role="status">${msg}</p>` : '',
    rec = L.filter(a => a.estado == 'pendiente' && a.direccion == 'recibida'), env = L.filter(a => a.estado == 'pendiente' && a.direccion == 'enviada'), ami = L.filter(a => a.estado == 'aceptada'),
    nom = a => esc(a.nombre || '@' + a.usuario), ini = a => esc(((a.nombre || a.usuario)[0] || '?').toUpperCase()),
    fila = (a, sub, acc) => `<div class="st fa"><span class="av">${ini(a)}</span><span class="fn"><b>${nom(a)}</b><small>${sub}</small></span>${acc}</div>`,
    quitar = a => cfm == a.usuario ? `<span class="acts cf"><button class="btn dg" data-a="am-del-si" data-u="${esc(a.usuario)}">Quitar</button><button class="btn" data-a="am-del-no">No</button></span>` : `<button class="lnk" data-a="am-del" data-u="${esc(a.usuario)}">Quitar</button>`,
    stats = a => `${a.racha} ${a.racha == 1 ? 'día' : 'días'} de racha · mejor ${a.mejor} · hoy ${a.hoy}/${T}`,
    h0 = a => a.nombre ? '@' + a.usuario : '', j = (...x) => x.filter(Boolean).join(' · ');
  let res = '';
  if (fr === null) res = '<p class="cap">No hemos encontrado a nadie con ese usuario.</p>';
  else if (fr) {
    const a = fr, r = a.relacion,
    ver = (a.publico || r == 'amigos') && r != 'bloqueado' ? `<button class="lnk" data-a="am-ver" data-u="${esc(a.usuario)}">Ver perfil</button>` : '',
    main = r == 'bloqueado' ? `<button class="btn" data-a="bl-un" data-u="${esc(a.usuario)}">Desbloquear</button>` : r == 'ninguna' ? `<button class="btn pri" data-a="am-add" data-u="${esc(a.usuario)}">Añadir</button>` : r == 'recibida' ? `<button class="btn pri" data-a="am-ok" data-u="${esc(a.usuario)}">Aceptar</button>` : `<small>${r == 'yo' ? 'Eres tú' : r == 'amigos' ? 'Ya sois amigos' : 'Solicitud enviada'}</small>`,
    acc = r == 'yo' ? main : `<span class="acts">${ver}${main}</span>`;
    res = `<div style="margin-top:10px">${fila(a, j(h0(a), r == 'bloqueado' ? 'Bloqueado' : r != 'yo' && r != 'amigos' && !a.publico ? 'Perfil privado' : ''), acc)}</div>`
  }
  return `<div class="bar"><button class="bk" data-a="go" data-v="home">‹ Inicio</button><h1>Amigos</h1></div>
<div class="row"><button class="btn pri" data-a="go" data-v="ranking" style="flex:1">Ver ranking</button>${Duelo.disponible() ? `<button class="btn pri" data-a="go" data-v="duelos" style="flex:1">Duelos${Duelo.badge() ? ` · ${Duelo.badge()}` : ''}</button>` : ''}</div>
<section class="res pb"><h2>Añadir amigos</h2><p>Escribe el @usuario exacto de tu amigo. Tu usuario es <b>@${esc((Nube.perfil && Nube.perfil.usuario) || '')}</b>.</p><div class="me"><span class="at">@</span><input id="fq" value="${esc(fq)}" maxlength="16" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="usuario" aria-label="Usuario de tu amigo"><button class="btn pri" data-a="am-buscar">Buscar</button></div>${res}</section>
${M}
${rec.length ? `<section class="res pb"><h2>Solicitudes recibidas</h2>${rec.map(a => blq == a.usuario
    ? fila(a, '¿Bloquear? No podrá volver a encontrarte.', `<span class="acts cf"><button class="btn dg" data-a="bl-si" data-u="${esc(a.usuario)}">Bloquear</button><button class="btn" data-a="bl-no">No</button></span>`)
    : fila(a, j(h0(a), a.nombre ? `<button class="lnk" data-a="am-ver" data-u="${esc(a.usuario)}">Ver perfil</button>` : '', `<button class="lnk" data-a="bl-ask" data-u="${esc(a.usuario)}">Bloquear</button>`), `<span class="acts"><button class="btn pri" data-a="am-ok" data-u="${esc(a.usuario)}">Aceptar</button><button class="lnk" data-a="am-no" data-u="${esc(a.usuario)}">Rechazar</button></span>`)).join('')}</section>` : ''}
<section class="res pb"><h2>Mis amigos</h2>${AM === null ? '<p class="cap">Cargando…</p>' : ami.length ? ami.map(a => fila(a, j(h0(a), stats(a)), `<span class="acts">${cfm != a.usuario && Duelo.disponible() ? `<button class="lnk" data-a="du-retar" data-u="${esc(a.usuario)}">Retar</button>` : ''}${a.visible && cfm != a.usuario ? `<button class="lnk" data-a="am-ver" data-u="${esc(a.usuario)}">Ver perfil</button>` : ''}${quitar(a)}</span>`)).join('') : '<p class="cap">Todavía no tienes amigos añadidos.</p>'}</section>
${env.length ? `<section class="res pb"><h2>Solicitudes enviadas</h2>${env.map(a => fila(a, j(h0(a), 'pendiente'), `<button class="lnk" data-a="am-can" data-u="${esc(a.usuario)}">Cancelar</button>`)).join('')}</section>` : ''}
<p class="foot">Con el perfil Público, cualquiera que te encuentre por tu @usuario puede verlo. Con Privado, solo tus amigos (Ajustes).</p>`}

/* ---------- Ranking entre amigos ---------- */
function ranking() {
  const T = GAMES.length, tab = RK.tab, L = RK[tab],
    tabs = `<div class="seg" role="group" aria-label="Tipo de ranking">${[['dia', 'Del día'], ['rachas', 'Rachas']].map(([v, l]) => `<button class="btn" data-a="rk-tab" data-v="${v}" aria-pressed="${tab == v}">${l}</button>`).join('')}</div>`,
    nav = tab == 'dia' ? `<div class="rn"><button class="bk" data-a="rk-d" data-v="-1"${RK.d <= 1 ? ' disabled' : ''} aria-label="Día anterior">‹</button><b>Reto nº ${RK.d}${RK.d == DAY ? ' · hoy' : ''}</b><button class="bk" data-a="rk-d" data-v="1"${RK.d >= DAY ? ' disabled' : ''} aria-label="Día siguiente">›</button></div>${RK.d != DAY ? '<div class="row ctl"><button class="btn" data-a="rk-hoy">Volver a hoy</button></div>' : ''}` : '',
    fila = (a, sub, pt) => `<div class="st${a.yo ? ' yo' : ''}"><span class="pos">${a.pos == null ? '–' : a.pos}</span><span style="flex:1;min-width:0"><b>${esc(a.nombre || '@' + a.usuario)}${a.yo ? ' <span class="tag">Tú</span>' : ''}</b><small>${sub}</small></span><span class="pt">${pt}</span></div>`,
    fd = a => a.jugados == 0 ? fila(a, 'Sin jugar', '') : fila(a, `${a.ganados} ${a.ganados == 1 ? 'ganado' : 'ganados'} · ${a.jugados}/${T} jugados${a.tiempo ? ' · ' + mmss(+a.tiempo) : ''}`, `${a.ganados}<small>de ${T}</small>`),
    fr2 = a => fila(a, `mejor ${a.mejor} · ${a.dias} ${a.dias == 1 ? 'día jugado' : 'días jugados'}`, `${a.racha}<small>${a.racha == 1 ? 'día' : 'días'}</small>`),
    vacio = L && !L.length && !RK.err ? `<p class="cap">${tab == 'dia' ? (RK.d == DAY ? 'Todavía no hay resultados de hoy.' : 'Nadie jugó ese día.') : 'Todavía no hay rachas que mostrar.'}</p><div class="row">${tab == 'dia' && RK.d != DAY ? '<button class="btn pri" data-a="rk-hoy">Ver el ranking de hoy</button>' : '<button class="btn pri" data-a="go" data-v="home">Ir a jugar</button>'}<button class="btn" data-a="go" data-v="amigos">Añadir amigos</button></div>` : '',
    solo = L && L.length == 1 && !RK.err ? '<p class="cap" style="margin-top:12px">Aquí solo estás tú. <button class="lnk" data-a="go" data-v="amigos">Añade amigos</button> para competir.</p>' : '',
    regla = tab == 'dia' ? 'Gana quien más juegos gane; si empatan, el menor tiempo total.' : 'Se ordena por racha actual; si empatan, por la mejor racha.';
  return `<div class="bar"><button class="bk" data-a="go" data-v="amigos">‹ Amigos</button><h1>Ranking</h1></div>
${tabs}${nav}
<section class="res pb${RK.ld && L !== null ? ' ld' : ''}">${L === null ? '<p class="cap">Cargando…</p>' : RK.err ? `<p class="msg" role="status">${RK.err}</p>` : L.map(tab == 'dia' ? fd : fr2).join('') + solo + vacio}</section>
<p class="foot">${regla} Solo salen tú y tus amigos. Los resultados los envía cada jugador desde su navegador: es un ranking entre amigos, no una clasificación oficial.</p>`
}

/* ---------- Perfil de un amigo (solo lectura) ---------- */
function perfilAmigo() {
  const f = FP, back = '<div class="bar"><button class="bk" data-a="go" data-v="amigos">‹ Amigos</button><h1>Perfil</h1></div>';
  if (!f.res) return back + (f.err ? `<p class="msg" role="status">${f.err}</p>` : '<p class="cap">Cargando…</p>');
  const nm = f.n || f.u, a = (AM || []).find(x => x.usuario == f.u), rel = !a ? 'ninguna' : a.estado == 'aceptada' ? 'amigos' : a.direccion,
    bt = (ac, t, c) => `<button class="btn${c ? ' ' + c : ''}" style="flex:1" data-a="${ac}" data-u="${esc(f.u)}">${t}</button>`,
    der = rel == 'amigos' ? '<span class="tag">Amigo</span>' : rel == 'ninguna' ? `<button class="btn pri" data-a="am-add" data-u="${esc(f.u)}">Añadir amigo</button>` : `<span class="tag">${rel == 'recibida' ? 'Solicitud recibida' : 'Solicitud enviada'}</span>`,
    fil = rel == 'amigos' ? (cfm == f.u ? `<p class="cf">¿Quitar a ${esc(nm)} de tus amigos?</p><div class="row cf">${bt('am-del-si', 'Quitar', 'dg')}<button class="btn" style="flex:1" data-a="am-del-no">Cancelar</button></div>` : `<div class="row cf">${bt('am-del', 'Quitar amigo')}</div>`)
      : rel == 'recibida' ? `<div class="row">${bt('am-ok', 'Aceptar', 'pri')}${bt('am-no', 'Rechazar')}</div>`
        : rel == 'enviada' ? `<div class="row">${bt('am-can', 'Cancelar solicitud')}</div>` : '';
  return back + `<section class="res hd"><div class="me"><span class="av lg">${esc((nm[0] || '?').toUpperCase())}</span><span class="id" style="flex:1"><b>${esc(nm)}</b><small>@${esc(f.u)}</small></span><span style="flex:none">${der}</span></div><div class="hs">${blq == f.u ? `<p>¿Bloquear a ${esc(nm)}? Dejará de poder encontrarte y ver tu perfil, y se eliminará vuestra amistad o solicitud. No se enterará.</p><div class="row">${bt('bl-si', 'Bloquear', 'dg')}<button class="btn" style="flex:1" data-a="bl-no">Cancelar</button></div>` : fil + `<p class="cap"${fil ? ' style="margin-top:12px"' : ''}><button class="lnk" data-a="bl-ask" data-u="${esc(f.u)}">Bloquear a @${esc(f.u)}</button></p>`}</div></section>${msg ? `<p class="msg" role="status">${msg}</p>` : ''}${resumen(f.res)}` + '<section class="gml">' + GAMES.map(g => blk(g, E(g.id, f.res), true)).join('') + '</section>'
}

/* ---------- Cuenta (solo con Supabase) ---------- */
/* Entrar y Crear cuenta: dos pantallas (cm). fm guarda lo escrito para no perderlo si hay un error. */
const GG = `<button class="btn gg" data-a="google"><svg class="ggi" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h5.9a5.05 5.05 0 0 1-2.19 3.31v2.75h3.54c2.07-1.91 3.25-4.72 3.25-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.75c-.98.66-2.24 1.05-3.74 1.05-2.88 0-5.31-1.94-6.18-4.56H2.16v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.82 14.08a6.6 6.6 0 0 1 0-4.16V7.08H2.16a11 11 0 0 0 0 9.84l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.46 2.09 14.97 1 12 1A11 11 0 0 0 2.16 7.08l3.66 2.84C6.69 7.32 9.12 5.38 12 5.38z"/></svg>Continuar con Google</button>`;
function formCuenta(M) {
  const cr = cm == 'crear', v = k => esc(fm[k] || ''),
    inp = (id, ph, ex, k) => `<input id="${id}" value="${v(k)}" placeholder="${ph}" aria-label="${ph}" ${ex}>`;
  return `<div class="bar"><button class="bk" data-a="go" data-v="${vp}">‹ ${VPN[vp]}</button><h1>${cr ? 'Crear cuenta' : 'Entrar'}</h1></div>
<section class="res"><p>${cr ? 'Es opcional. Con una cuenta tus resultados y rachas se guardan en el servidor y los recuperas en cualquier dispositivo. Lo que ya hayas jugado en este navegador se sube al crearla.' : 'Entra para recuperar tus resultados y rachas. Lo que hayas jugado aquí como invitado se sube a tu cuenta.'}</p>${GG}<p class="or"><span>${cr ? 'o con tu correo' : 'o con tu correo o usuario'}</span></p>
<div class="me" style="flex-direction:column;align-items:stretch;gap:8px">${cr
      ? inp('nm2', 'Nombre', 'maxlength="20" autocomplete="name"', 'nm') + inp('us2', 'Usuario (opcional)', 'maxlength="16" autocapitalize="none" autocomplete="off" spellcheck="false"', 'us') + inp('em', 'Correo', 'type="email" autocomplete="email"', 'em')
      : inp('em', 'Correo o usuario', 'autocapitalize="none" autocomplete="username" spellcheck="false"', 'em')}<input id="pw" type="password" value="${v('pw')}" placeholder="${cr ? 'Contraseña (mínimo 6)' : 'Contraseña'}" aria-label="Contraseña" autocomplete="${cr ? 'new-password' : 'current-password'}"></div>
<button class="btn pri full" data-a="${cr ? 'registrar' : 'entrar'}">${cr ? 'Crear cuenta' : 'Entrar'}</button>
<p class="alt">${cr ? '¿Ya tienes cuenta? <button class="lnk" data-a="cm" data-v="entrar">Entrar</button>' : '¿No tienes cuenta? <button class="lnk" data-a="cm" data-v="crear">Crear cuenta</button>'}</p></section>${M}`
}

function cuenta() {
  const u = Nube.user, p = Nube.perfil, adm = p && p.rol == 'admin', us = p && p.usuario, nm = S.me.n || (p && p.nombre) || 'Jugador',
    M = `<p class="msg" role="status">${msg}</p>`;
  if (!u) return formCuenta(M);
  const fu = !us ? '' : eu === null
    ? `<div class="st"><span><b>Usuario</b><small>@${esc(us)}</small></span><button class="lnk" data-a="usr-edit">Cambiar</button></div>`
    : `<div class="st v"><span><b>Usuario</b><small>Con él te encontrarán tus amigos. De 3 a 15 caracteres: minúsculas, números o _.</small></span><div class="me"><span class="at">@</span><input id="us" value="${esc(eu)}" maxlength="16" autocapitalize="none" autocomplete="off" spellcheck="false" aria-label="Usuario"></div><div class="row"><button class="btn pri" data-a="usr-save">Guardar</button><button class="btn" data-a="usr-cancel">Cancelar</button></div></div>`;
  return `<div class="bar"><button class="bk" data-a="go" data-v="${vp}">‹ ${VPN[vp]}</button><h1>Cuenta</h1></div>
<section class="res hd"><div class="me"><span class="av lg">${esc((nm[0] || 'J').toUpperCase())}</span><span class="id"><b>${esc(nm)}</b>${us ? `<small>@${esc(us)}</small>` : ''}<span class="tag${adm ? ' ad' : ''}">${adm ? 'Administrador' : 'Jugador'}</span></span></div></section>
<section class="res pb"><h2>Datos</h2>
${fu}
<div class="st"><span><b>Nombre</b><small>${esc(nm)}</small></span><button class="lnk" data-a="go" data-v="perfil">Cambiar</button></div>
<div class="st"><span><b>Correo</b><small>${esc(u.email)}</small></span></div></section>
${M}
${adm ? '<section class="res pb"><h2>Administración</h2><p>Gestiona el reto de cada día.</p><div class="row"><a class="btn pri" href="admin.html">Abrir el panel</a></div></section>' : ''}
${fs ? '<div class="row"><button class="btn" style="flex:1" data-a="salir">Reintentar</button><button class="btn dg" style="flex:1" data-a="salir-igual">Cerrar sesión igualmente</button></div>' : '<button class="btn out" data-a="salir">Cerrar sesión</button>'}`
}

/* ---------- Inicio ---------- */
function status(g) {
  const r = R(g.id), p = S.pr[DAY + g.pk];
  if (g.status) { const s = g.status(r, p), n = estrellas(g.id, r); return n ? s + ' · ' + estTxt(n) : s }
  return r ? 'Completado' : p && p.t0 ? 'En curso' : 'Sin jugar'
}
const SV = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = { user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'), fr: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 4.5 1.9 4.5 5"/>'), du: SV('<path d="M5 4l9 9M4 5l1-1 3 1 1 3-1 1-3-1z"/><path d="M19 4l-9 9M20 5l-1-1-3 1-1 3 1 1 3-1z"/><path d="M7 17l-3 3M17 17l3 3M9 15l-2 2M15 15l2 2"/>'), cfg: SV('<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>') };
/* Estado de un juego en el inicio: ok (completado), en (empezado) o nv (sin jugar). */
const estado = g => R(g.id) ? 'ok' : status(g) == 'Sin jugar' ? 'nv' : 'en';
const CK = '<span class="ck" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>';
/* Lema corto de cada juego (en las tarjetas sin empezar). Un juego nuevo puede traer el suyo con la propiedad «tag». */
const TAG = { palabra: 'Adivina la palabra', cifra: 'Descifra la frase', coronas: 'Una corona por color', sudoku: 'Sudoku de 6×6', escalera: 'Cambia una letra por paso', operaciones: 'Llega al número objetivo', camino: 'Une los números en orden', luces: 'Apaga todas las luces', tuberias: 'Une las parejas de color', sopa: 'Encuentra las 6 palabras' };
function ficha(g) {
  const e = estado(g), s = status(g), t = g.tag || TAG[g.id] || '';
  return `<button class="gt ${e}" data-a="go" data-v="${g.id}" aria-label="${g.name}. ${e == 'nv' && t ? t + '. ' : ''}${s}"><span class="gl" style="background:var(${g.color})">${g.icon}${e == 'ok' ? CK : ''}</span><strong>${g.name}</strong>${e == 'nv' ? (t ? `<em class="tg">${t}</em>` : '') : `<em>${s}</em>`}</button>`
}
/* Primer juego sin terminar: el botón principal del inicio lleva directo a él. */
function siguiente() {
  const g = GAMES.find(x => !R(x.id)); if (!g) return '';
  const e = estado(g), n = GAMES.filter(x => R(x.id)).length;
  return `<button class="btn pri full sg" data-a="go" data-v="${g.id}">${e == 'en' ? 'Continuar' : n ? 'Siguiente reto' : 'Empezar'}: ${g.name}</button>`
}
/* Aviso discreto a invitados con racha: su progreso solo vive en este navegador. Solo si se puede crear cuenta. */
function avisoInvitado(st) {
  if (!inv() || !Nube.activo || st < 3) return '';
  return `<p class="av2" role="note">Llevas ${st} días de racha, guardada solo en este navegador. <button class="lnk" data-a="go" data-v="cuenta">Crea cuenta para no perderla</button></p>`
}
function progreso() {
  const T = GAMES.length, n = GAMES.filter(g => R(g.id)).length, t = n == T;
  return `<div class="hp"><div class="ht"><b>${t ? '¡Todo completado hoy!' : `Hoy: ${n} de ${T}`}</b><span class="hr"><span>${t ? 'Vuelve mañana' : `${T - n} por jugar`}</span></span></div><div class="segs${t ? ' full' : ''}" style="grid-template-columns:repeat(${T},1fr)" role="progressbar" aria-label="Juegos completados hoy" aria-valuemin="0" aria-valuemax="${T}" aria-valuenow="${n}">${GAMES.map((g, k) => `<i${R(g.id) ? ` class="on" style="--c:var(${g.color});--k:${k}"` : ` style="--k:${k}"`}></i>`).join('')}</div></div>`
}
/* Cuadrícula del inicio: primero los que faltan; los completados, atenuados y agrupados debajo (si hay de los dos). */
function juegos() {
  const hechos = GAMES.filter(g => R(g.id)), faltan = GAMES.filter(g => !R(g.id));
  if (!hechos.length || !faltan.length) return `<div class="gg">${GAMES.map(ficha).join('')}</div>`;
  return `<div class="gg">${faltan.map(ficha).join('')}</div><h2 class="gh">Hechos hoy · ${hechos.length}</h2><div class="gg hechos">${hechos.map(ficha).join('')}</div>`
}
function home() {
  const st = streak(), f = new Date(D0).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `<header class="top"><h1>Daily Arcade</h1><span style="display:flex;gap:8px;align-items:center">${Nube.user ? `${Duelo.disponible() ? `<button class="bk ic" data-a="go" data-v="duelos" aria-label="Duelos${Duelo.badge() ? ` (${Duelo.badge()} pendientes)` : ''}" title="Duelos">${IC.du}${Duelo.badge() ? `<span class="nbd" aria-hidden="true">${Duelo.badge()}</span>` : ''}</button>` : ''}<button class="bk ic" data-a="go" data-v="amigos" aria-label="Amigos${nrec() ? ` (${nrec()} solicitudes)` : ''}" title="Amigos">${IC.fr}${nrec() ? `<span class="nbd" aria-hidden="true">${nrec()}</span>` : ''}</button>` : ''}<button class="bk ic" data-a="go" data-v="perfil" aria-label="Perfil" title="Perfil">${IC.user}</button><button class="bk ic" data-a="go" data-v="ajustes" aria-label="Ajustes" title="Ajustes">${IC.cfg}</button></span></header>
<div class="hb"><div class="sn"><b>${st}</b>${st == 1 ? 'día' : 'días'} de racha</div><div><b>Reto nº ${DAY}</b>${f}</div><div><b id="cd">--:--:--</b>próximo reto</div></div>` +
    avisoInvitado(st) + progreso() + siguiente() + juegos() +
    `<p class="foot">Sin cuenta: los resultados se guardan solo en este navegador. Cada día cambia el reto a medianoche, hora de Madrid.</p>`
}

/* ---------- Control ---------- */
function draw() {
  const g = cur();
  const dv = Nube.user ? Duelo.vista() : null;
  /* Clave de pantalla: cada fase de un duelo (lista, cuenta atrás, espera, resultado) cuenta como pantalla distinta. */
  const app = $('#app'), vk = (dv != null ? 'duelo/' + V + '/' + Duelo.clave() : V) + '|' + (g ? g.id : '');
  if (vk !== draw.vk) CFT = 0; /* una confirmación de «Rendirme» no sobrevive a un cambio de pantalla */
  const h = '' + (dv != null ? dv : V == 'perfil' ? perfil() : V == 'ajustes' ? ajustes() : V == 'cuenta' && Nube.activo ? cuenta() : V == 'amigos' && Nube.user ? amigos() : V == 'ranking' && Nube.user ? ranking() : V == 'amigo' && Nube.user && FP ? perfilAmigo() : g ? g.render() : (V = 'home', home()));
  const ld = h.includes('Cargando…'), mismo = vk === draw.vk;
  /* 'in' solo al cambiar de pantalla; 'sub' cuando llegan los datos de una pantalla que estaba "Cargando…" */
  app.className = [mismo ? '' : 'in', mismo && draw.ld && !ld ? 'sub' : '', ...Anim.f].join(' ').trim(); draw.vk = vk; draw.ld = ld;
  const foco = Teclado.guarda(), tenia = !!app.querySelector('.res.rb'), hw = app.querySelector('details.how'), h0 = hw && hw.open ? hw.offsetHeight : 0;
  app.innerHTML = h;
  Teclado.repinta(foco, mismo);
  /* Si «Cómo se juega» se pliega solo al empezar, el tablero sube: se compensa el scroll para que no se mueva bajo el dedo. */
  if (mismo && h0 && scrollY > 0) { const n = app.querySelector('details.how'), h1 = n ? n.offsetHeight : 0; if (h1 < h0 - 40) scrollBy(0, h1 - h0) }
  if (mismo && !tenia) mostrarResultado(app.querySelector('.res.rb'));
  Anim.clear(); tick()
}
/* Cambio de día con la web abierta: nunca se recarga a mitad de partida. Se avisa y la persona decide cuándo pasar al reto nuevo. */
function avisoNuevoDia() {
  if ($('#nd')) return;
  const e = document.createElement('div'); e.id = 'nd'; e.setAttribute('role', 'status');
  e.innerHTML = '<span>Ya hay un reto nuevo. Puedes terminar esta partida antes.</span><button class="btn pri">Ver reto nuevo</button>';
  e.querySelector('button').onclick = () => location.reload(); document.body.appendChild(e)
}
/* Al terminar una partida, la tarjeta de resultado puede quedar bajo el pliegue en móvil: se desplaza hasta ella y se anuncia. */
function mostrarResultado(c) {
  if (!c) return;
  const l = $('#live'), t = c.querySelector('h2'), r = c.querySelector('p:not(.est)');
  if (l) { l.textContent = ''; setTimeout(() => { l.textContent = 'Resultado: ' + (t ? t.textContent : '') + (r ? '. ' + r.textContent : '') }, 50) }
  const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  c.scrollIntoView({ block: 'nearest', behavior: rm ? 'auto' : 'smooth' })
}
function tick() {
  const q = parts(); if (q.day !== P.day) { avisoNuevoDia(); if (!Duelo.ocupado() && V == 'home') return location.reload() }
  const rem = 86400 - (q.hour * 3600 + q.minute * 60 + q.second), c = $('#cd');
  if (c) c.textContent = [Math.floor(rem / 3600), Math.floor(rem % 3600 / 60), rem % 60].map(v => String(v).padStart(2, '0')).join(':');
  const t = $('#tmv'), g = cur(), p = g && prog(g.pk);
  if (t && p && p.t0 && !R(V)) { t.textContent = mmss(Date.now() - p.t0 + penP(p) * 1000); const e = $('#tmp'); if (e) e.textContent = penP(p) ? `${mmss(Date.now() - p.t0)} + ${penP(p)} s de ayudas` : '' }
}
/* Compartir un texto: menú del sistema en móvil; si no, portapapeles. */
function toast(m, ms = 1800) {
  let e = $('#toast'); if (!e) { e = document.createElement('div'); e.id = 'toast'; e.setAttribute('role', 'status'); document.body.appendChild(e) }
  e.textContent = m; e.className = 'on'; clearTimeout(toast.t); toast.t = setTimeout(() => { e.className = '' }, ms)
}
async function enviar(t, b, pre) {
  if (CAN_SHARE) { try { await navigator.share({ text: t }); return } catch (e) { if (e && e.name == 'AbortError') return } }
  try { await navigator.clipboard.writeText(t); toast('Copiado'); b.innerHTML = IC_OK; setTimeout(() => { b.innerHTML = CAN_SHARE ? IC_SH : IC_CP }, 1800) }
  catch (e) { if (pre) { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Texto seleccionado: cópialo') } else prompt('Copia tu resumen:', t) }
}
function copy() { return enviar($('#sh').textContent, $('[data-a=copy]'), $('#sh')) }
/* Instalar como app (PWA) */
let dip = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; if (V == 'ajustes') draw() });
addEventListener('appinstalled', () => { dip = null; if (V == 'ajustes') draw() });
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent), APP = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
function secInstalar() {
  if (APP || location.protocol == 'file:') return '';
  const t = 'Añade Daily Arcade a tu pantalla de inicio: se abre como una app y, si ya la abriste ese día, también funciona sin conexión.';
  if (dip) return `<section class="res pb"><h2>Instalar</h2><p>${t}</p><div class="row"><button class="btn pri" data-a="instalar">Instalar app</button></div></section>`;
  if (IOS) return `<section class="res pb"><h2>Instalar</h2><p>${t}</p><p>En Safari: pulsa el botón Compartir y elige «Añadir a pantalla de inicio».</p></section>`;
  return ''
}
$('#app').addEventListener('keydown', e => { if (e.key == 'Enter' && e.target.matches('#em,#pw,#nm2,#us2')) { const b = $('.btn.pri.full'); if (b) b.click() } });
/* Pulso al tocar una casilla o tecla: tras repintar, busca la casilla equivalente (mismos data-*) y le añade .pp una sola vez.
   Se hace aquí y no con :active porque draw() sustituye el botón pulsado. Solo las acciones de casilla/tecla, no Deshacer, Pista, etc. */
const PULSO = new Set(['cell', 'sc', 'lz', 'pos', 'num', 'op', 'sel']);
function pulso(b) {
  try {
    const q = Object.entries(b.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}="${CSS.escape(v)}"]`).join(''), e = q && $('#app ' + q);
    if (e) e.classList.add('pp')
  } catch (_) { }
}
$('#app').onclick = e => {
  const sm = e.target.closest('.how>summary'); if (sm) { const d = sm.parentNode; HW[d.dataset.g] = !d.open; return }
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, g = cur();
  if (CFT && a != 'rendirme' && a != 'cft-no') CFT = 0; /* otra acción cancela la confirmación pendiente de «Rendirme» */
  if (a == 'go') { if (b.dataset.v == 'duelos') vd = V == 'amigos' ? 'amigos' : 'home'; if (b.dataset.v == 'cuenta') { vp = V == 'ajustes' || V == 'home' ? V : 'perfil'; cm = 'entrar'; fm = {} } V = b.dataset.v; msg = ''; fs = false; sel = null; hist = []; ask = false; eu = null; en = false; cfm = null; blq = null; fr = undefined; fq = ''; if (V == 'ranking') { RK = { tab: RK.tab, d: DAY, dia: null, rachas: null, err: '' } } draw(); if (V == 'amigos' && Nube.user) cargarAmigos(); if (V == 'ranking' && Nube.user) cargarRanking(); if (V == 'ajustes' && Nube.user) cargarBloqueados(); if (V == 'duelos' && Nube.user) Duelo.abrir() }
  else if (a.startsWith('du-')) Duelo.accion(a, b)
  else if (a == 'set') { const k = b.dataset.k; S.set[k] = k == 'th' ? b.dataset.v : !S.set[k]; sv(); theme(); draw() }
  else if (a == 'copy') copy();
  else if (a == 'instalar') { if (dip) { dip.prompt(); dip.userChoice.catch(() => { }).then(() => { dip = null; draw() }) } }
  else if (a == 'cm') { cm = b.dataset.v; msg = ''; Anim.once('sub'); draw() }
  else if (a == 'entrar' || a == 'registrar') {
    const q = s => ($(s) || {}).value || '', em = q('#em').trim(), pw = q('#pw'), nm = (q('#nm2').trim() || 'Jugador').slice(0, 20), us = a == 'registrar' ? nu(q('#us2')) : '';
    fm = { em, pw, nm: q('#nm2').trim(), us: q('#us2') };
    if (us && !UOK.test(us)) { msg = UMSG; draw(); return }
    msg = 'Un momento…'; draw();
    (a == 'entrar' ? Nube.entrarCon(em, pw) : Nube.libre(us).then(ok => { if (!ok) throw { message: 'Ese usuario ya está en uso.' }; return Nube.registrar(em, pw, nm, us) }).then(s => { if (!s) throw { message: 'Cuenta creada. Revisa tu correo para confirmarla y luego entra.' } }))
      .then(async () => { fm = {}; msg = ''; await alEntrar(); draw() }).catch(e => { msg = e.message && !e.status ? e.message : Nube.tr(e); draw() })
  }
  else if (a == 'google') {
    if (location.protocol == 'file:') { msg = 'Entrar con Google necesita abrir la web desde http://localhost o desde el deploy (no con doble clic en el archivo).'; draw(); return }
    msg = 'Abriendo Google…'; draw();
    Nube.entrarGoogle().catch(e => { console.warn(e); msg = e.message && !e.status ? e.message : Nube.tr(e); draw() })
  }
  else if (a == 'salir') cerrar(false)
  else if (a == 'salir-igual') cerrar(true)
  else if (a == 'usr-edit') { eu = (Nube.perfil && Nube.perfil.usuario) || ''; msg = ''; draw(); const i = $('#us'); if (i) { i.focus(); i.select() } }
  else if (a == 'usr-cancel') { eu = null; msg = ''; draw() }
  else if (a == 'usr-save') {
    const v = nu($('#us').value);
    if (!UOK.test(v)) { eu = v; msg = UMSG; draw(); return }
    if (v == Nube.perfil.usuario) { eu = null; msg = ''; draw(); return }
    eu = v; msg = 'Un momento…'; draw();
    Nube.guardarUsuario(v).then(() => { eu = null; msg = 'Usuario cambiado.'; draw() }).catch(e => { msg = e.message && !e.status ? e.message : Nube.tr(e); draw() })
  }
  else if (a == 'am-ver') verAmigo(b.dataset.u)
  else if (a == 'nm-edit') { en = true; draw(); const i = $('#nm'); if (i) { i.focus(); i.select() } }
  else if (a == 'nm-cancel') { en = false; draw() }
  else if (a == 'nm-save') { const v = $('#nm').value.trim().slice(0, 20); if (v) { S.me.n = v; sv(); if (Nube.user) Nube.guardarNombre(v) } en = false; draw() }
  else if (a == 'bl-ask') { blq = b.dataset.u; Anim.once('conf'); draw() }
  else if (a == 'bl-no') { blq = null; Anim.once('conf'); draw() }
  else if (a == 'bl-si') accion(Nube.bloquear(b.dataset.u).then(() => { BL = null }), 'Usuario bloqueado.', 1)
  else if (a == 'bl-un') {
    msg = 'Un momento…'; draw();
    Nube.desbloquear(b.dataset.u).then(() => Promise.all([Nube.bloqueados(), Nube.amistades()])).then(([l, am]) => { BL = l; AM = am; fr = undefined; msg = 'Usuario desbloqueado.' }).catch(e => { console.warn(e); msg = em(e) }).then(() => draw())
  }
  else if (a == 'rk-tab') { RK.tab = b.dataset.v; Anim.once('sub'); cargarRanking(); draw() }
  else if (a == 'rk-hoy') { RK.d = DAY; RK.dia = null; cargarRanking(); draw() }
  else if (a == 'rk-d') { const n = RK.d + +b.dataset.v; if (n < 1 || n > DAY) return; RK.d = n; cargarRanking(); draw() } /* sin vaciar la lista ni animar: se ve la anterior hasta que llegan los datos nuevos (si no, parpadeaba) */
  else if (a == 'am-buscar') {
    const v = nu($('#fq').value); fq = v; fr = undefined;
    if (!UOK.test(v)) { msg = UMSG; draw(); return }
    msg = 'Buscando…'; draw(); Nube.buscarUsuario(v).then(r => { msg = ''; fr = r; draw() }).catch(e => { console.warn(e); msg = em(e); draw() })
  }
  else if (a == 'am-add') accion(Nube.solicitar(b.dataset.u), r => { fr = undefined; fq = ''; return r == 'aceptada' ? '¡Ya sois amigos!' : 'Solicitud enviada.' })
  else if (a == 'am-ok') accion(Nube.responder(b.dataset.u, true), () => { fr = undefined; return 'Ya sois amigos.' })
  else if (a == 'am-no') accion(Nube.responder(b.dataset.u, false), 'Solicitud rechazada.')
  else if (a == 'am-can') accion(Nube.quitar(b.dataset.u), 'Solicitud cancelada.')
  else if (a == 'am-del') { cfm = b.dataset.u; Anim.once('conf'); draw() }
  else if (a == 'am-del-no') { cfm = null; Anim.once('conf'); draw() }
  else if (a == 'am-del-si') accion(Nube.quitar(b.dataset.u), 'Amigo eliminado.', 1)
  else if (a == 'reset') { ask = true; Anim.once('conf'); draw() }
  else if (a == 'reset-no') { ask = false; Anim.once('conf'); draw() }
  else if (a == 'reset-si') {
    const hecho = () => { S = { res: {}, pr: {}, me: S.me, set: S.set, uid: S.uid }; ask = false; msg = ''; sv(); draw() };
    if (Nube.user) { msg = 'Borrando…'; draw(); Nube.borrarResultados().then(hecho).catch(e => { console.warn(e); ask = false; msg = 'No se han podido borrar tus resultados de la cuenta. Inténtalo de nuevo.'; draw() }) } else hecho()
  }
  else if (a == 'vis') {
    if (Nube.user) {
      const o = S.me.v, v = b.dataset.v; if (v == o) return; S.me.v = v; sv(); msg = ''; draw();
      Nube.guardarPrivacidad(v).catch(e => { console.warn(e); S.me.v = o; sv(); msg = 'No se ha podido guardar la privacidad. Inténtalo de nuevo.'; draw() })
    } else draw()
  }
  else if (a == 'cft-no') { CFT = 0; draw(); const r = $('[data-a="rendirme"]'); if (r) r.focus({ preventScroll: true }) }
  else if (a == 'hm') { /* mapa de 28 días: el detalle sale en #hms (title no funciona al tocar). Sin draw(): repintar cerraría los desplegables abiertos del perfil */
    const T = GAMES.length, st = $('#hms'); if (st) st.textContent = hmTxt(+b.dataset.d, +b.dataset.n, T);
    b.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'))
  }
  else if (g) { if (a == 'k') { g.onKey && g.onKey(b.dataset.k); pulso(b) } else if (g.actions && g.actions[a]) { const p0 = penP(prog(g.pk)); g.actions[a](b); if (PULSO.has(a)) pulso(b); const d = penP(prog(g.pk)) - p0, t = $('#tm'); if (d > 0 && t) { const s = document.createElement('span'); s.className = 'tb'; s.textContent = '+' + d + ' s'; t.appendChild(s); setTimeout(() => s.remove(), 1400) } } }
};
$('#app').oninput = e => { if (e.target.id == 'fq') fq = e.target.value };
$('#app').onkeydown = e => {
  if (e.target.id == 'nm') { if (e.key == 'Enter') { e.preventDefault(); $('[data-a=nm-save]').click() } else if (e.key == 'Escape') { $('[data-a=nm-cancel]').click() } return }
  if (e.key == 'Enter' && e.target.id == 'fq') { e.preventDefault(); const b = $('[data-a=am-buscar]'); b && b.click(); return }
  if (e.key == 'Enter' && e.target.id == 'us') { e.preventDefault(); const b = $('[data-a=usr-save]'); b && b.click() }
};
addEventListener('keydown', e => {
  const g = cur(); if (!g || !g.onKey) return;
  if (e.ctrlKey || e.metaKey || e.altKey || (e.target.tagName == 'BUTTON' && (e.key == 'Enter' || e.key == ' '))) return;
  const k = e.key, m = k == 'Enter' ? 'Enter' : k == 'Backspace' || k == 'Delete' ? 'Del' : k.length == 1 && /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(k) ? nz(k) : g.digits && /^[0-9]$/.test(k) ? k : null;
  if (m) { e.preventDefault(); g.onKey(m) }
});
(async () => {
  if (Nube.activo) {
    $('#app').innerHTML = `<h1>Daily Arcade</h1><p class="sub" role="status">Cargando el reto de hoy…</p><div class="gg" aria-hidden="true">${GAMES.map(() => '<div class="gt esq"><span class="gl"></span><strong></strong></div>').join('')}</div>`;
    try {
      try { await Nube.init() } catch (e) { if (!Nube.sb) throw e; console.warn('No se ha podido recuperar la sesión (¿sin conexión?)', e) }
      let r;
      try { r = await Nube.reto(DAY); if (r) try { localStorage.setItem('da-reto', JSON.stringify({ dia: DAY, palabra: r.palabra, frase: r.frase, autor: r.autor })) } catch (_) { } }
      catch (e) { let c = null; try { c = JSON.parse(localStorage.getItem('da-reto') || 'null') } catch (_) { } if (c && c.dia == DAY) r = c; else throw e } /* sin conexión: el reto de hoy guardado la última vez */
      if (!r) throw new Error('sin-reto');
      Content.setHoy({ p: r.palabra, f: r.frase, a: r.autor }); await alEntrar()
    }
    catch (e) {
      console.error(e); const sr = e.message == 'sin-reto';
      $('#app').innerHTML = `<h1>Daily Arcade</h1><section class="res" role="alert"><h2>${sr ? 'Hoy todavía no hay reto' : 'No hemos podido cargar el reto'}</h2><p>${sr ? 'Vuelve en un rato: se publica cada día a medianoche, hora de Madrid.' : 'Revisa tu conexión e inténtalo de nuevo. Tu progreso no se ha perdido.'}</p><div class="row"><button class="btn pri" onclick="location.reload()">Reintentar</button></div></section>${sr ? '' : `<details class="dt"><summary>Detalles técnicos</summary><p>${esc(String(e.message || e))}</p></details>`}`; return
    }
  }
  addEventListener('online', () => { Nube.subirTodo(S, DAY, IDS()).catch(() => { }) }); /* reintenta lo que no se pudo subir sin conexión */
  setInterval(tick, 1000); theme(); draw(); Duelo.init();
  if (Nube.user) cargarAmigos()
})();
