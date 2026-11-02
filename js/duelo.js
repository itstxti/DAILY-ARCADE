/* Daily Arcade · duelos entre amigos (mejor de 5).
   El servidor (supabase/duelos.sql) manda: elige los juegos y las semillas, mide el tiempo y decide quién gana.
   Este archivo solo pinta lo que dice el servidor y juega cada ronda con el juego normal, en "modo duelo":
   mientras hay una ronda en juego (DU en core.js), R/prog/fin trabajan en un espacio aparte y no tocan tus resultados diarios.

   Fases de un duelo, vistas desde aquí:  cuenta (cuenta atrás) → juego → espera (ya enviaste, falta el rival) → cuenta … → fin.
   Mientras estás dentro (D.dentro), V = 'duelo' en las pantallas de cuenta atrás y resultado, y V = id del juego durante la ronda. */
const Duelo = (() => {
  const D = { lista: null, cfg: { invitacion: 300, rondas: 5, victorias: 3 }, off: 0, dentro: null, key: '', conf: false, cargando: false, ult: 0, envOk: 0, ban: '' };
  const now = () => Date.now() + D.off; /* hora del servidor */
  const POR_INTENTOS = { palabra: ['intento', 'intentos'], escalera: ['paso', 'pasos'], luces: ['pulsación', 'pulsaciones'], operaciones: ['operación', 'operaciones'] };
  const gj = id => GAMES.find(g => g.id == id);
  const nj = id => (gj(id) || { name: id }).name;
  const nom = u => esc((u && (u.nombre || '@' + u.usuario)) || 'Rival');
  const cd = ms => mmss(Math.max(0, ms));
  const act = () => (D.lista || []).find(d => d.estado == 'en_curso');
  const mio = id => (D.lista || []).find(d => d.id == id);
  const vivas = () => (D.lista || []).filter(d => d.estado == 'pendiente' && d.expira > now());
  const recibidas = () => vivas().filter(d => d.soy == 'rival');
  const enviadas = () => vivas().filter(d => d.soy == 'retador');
  const ult = d => d.rondas[d.rondas.length - 1];
  const fase = d => d.estado == 'terminado' ? 'fin' : d.estado != 'en_curso' ? 'nada' : now() < ult(d).empieza ? 'cuenta' : ult(d).yo_fin ? 'espera' : 'juego';

  /* ---------- Datos ---------- */
  function lista(r) { D.off = r.ahora - Date.now(); D.cfg = r.cfg; D.lista = r.duelos; D.ult = Date.now(); cambio() }
  function uno(d) { /* un duelo que llega suelto (enviar, rendirse, estado) sustituye al que teníamos */
    const l = D.lista || (D.lista = []), i = l.findIndex(x => x.id == d.id); if (i < 0) l.unshift(d); else l[i] = d; cambio()
  }
  function cargar() {
    if (D.cargando || !Nube.user || !navigator.onLine) return Promise.resolve();
    D.cargando = true;
    return Nube.misDuelos().then(lista).catch(e => console.warn('duelos', e)).then(() => { D.cargando = false })
  }
  function consultar(id) { /* consulta ligera de un duelo en juego */
    if (D.cargando || !navigator.onLine) return Promise.resolve();
    D.cargando = true;
    return Nube.estadoDuelo(id).then(r => { D.off = r.ahora - Date.now(); D.ult = Date.now(); uno(r.duelo) }).catch(e => console.warn('duelo', e)).then(() => { D.cargando = false })
  }
  function reset() { if (DU) salirRonda(); D.lista = null; D.dentro = null; D.key = ''; D.conf = false; pintaBanner() }

  /* ---------- Bucle: consulta al servidor y detecta cambios de fase ---------- */
  function bucle() {
    if (!Nube.user) { if (D.lista || D.dentro) reset(); return }
    if (D.lista === null) { cargar(); return }
    const a = act(), t = Date.now() - D.ult, oculto = document.hidden;
    const cada = D.dentro && a ? 1500 : a || enviadas().length ? 2000 : oculto ? 20000 : 6000;
    if (t >= cada) { if (D.dentro && a) consultar(a.id); else cargar() }
    if (DU && DU.env && Date.now() - D.envOk > 2000) enviar(); /* reintenta un resultado que no llegó */
    sync(); parche()
  }

  /* Llama a esto cuando cambian los datos o pasa el tiempo: decide si hay que cambiar de pantalla. */
  function cambio() { sync(); if (!D.dentro) { if (V == 'duelos') draw() } pintaBanner() }
  function sync() {
    const a = act();
    /* Si hay un duelo en curso y estás en una pantalla "segura" (no jugando un reto diario), entras solo. */
    if (a && !D.dentro && !DU && ['home', 'amigos', 'ranking', 'duelos', 'duelo'].includes(V)) { D.dentro = a.id; D.conf = false }
    const d = D.dentro && mio(D.dentro);
    if (!d) { if (D.dentro && D.lista) { D.dentro = null; D.key = ''; if (DU) salirRonda(); if (V == 'duelo') { V = 'duelos'; draw() } } return }
    const f = fase(d), k = d.id + '|' + d.estado + '|' + d.ronda + '|' + f; if (k == D.key) return;
    const prev = D.key; D.key = k;
    if (f == 'juego' || f == 'espera') { const r = ult(d); if (!DU || DU.n != r.n || DU.id != d.id) empezarRonda(d, r); else draw() }
    else { /* cuenta, fin */
      if (DU) salirRonda();
      if (f == 'fin' && prev && !prev.endsWith('|fin')) D.conf = false;
      V = 'duelo'; draw()
    }
  }

  /* ---------- Una ronda, con el juego de siempre ---------- */
  function empezarRonda(d, r) {
    const g = gj(r.juego); if (!g) { toast('Este duelo usa un juego que tu versión no tiene. Actualiza la web.'); return }
    if (DU) salirRonda();
    DU = { id: d.id, n: r.n, juego: r.juego, pr: {}, res: {}, t0: Date.now() - (now() - r.empieza), env: null };
    SD = r.semilla; Content.setDuelo(r.contenido);
    sel = null; hist = []; msg = '';
    prog(g.pk).t0 = DU.t0; /* el cronómetro cuenta desde que empezó la ronda, no desde tu primer movimiento */
    if (r.yo) DU.res[r.juego] = r.yo;
    V = r.juego; draw()
  }
  function salirRonda() { DU = null; SD = DAY; Content.setDuelo(null); sel = null; hist = []; msg = '' }
  /* Lo llama fin() de core.js cuando el juego termina (resuelto, rendido…). */
  function fin(g, o) {
    if (!DU || DU.res[g]) return;
    o = Object.assign({}, o, { t: Math.max(0, Date.now() - DU.t0) }); /* el tiempo cuenta desde el inicio de la ronda */
    DU.res[g] = o; DU.env = o; enviar()
  }
  function enviar() {
    if (!DU || !DU.env || DU.vuelo) return;
    const mi = DU, o = DU.env; mi.vuelo = true; D.envOk = Date.now();
    Nube.enviarDuelo(mi.id, mi.n, o)
      .then(d => { mi.env = null; uno(d) })
      .catch(e => { console.warn('enviar duelo', e); if (e && e.code == 'P0001') { mi.env = null; toast(em(e)) } })
      .then(() => { mi.vuelo = false })
  }

  /* ---------- Piezas de pantalla ---------- */
  const marcador = d => `<div class="dus"><span><b>Tú</b><i>${d.yo}</i></span><em>–</em><span><i>${d.ellos}</i><b>${nom(d.rival)}</b></span></div>`;
  const unidad = (j, n) => (POR_INTENTOS[j] || ['', ''])[n == 1 ? 0 : 1];
  function fmt(j, x, tt) {
    if (!x) return 'sin enviar';
    if (x.st != 'won' && x.st != 'completed') return 'no resuelto';
    const n = j == 'palabra' ? (x.g || []).length : x.n;
    return (POR_INTENTOS[j] ? `${n} ${unidad(j, n)} · ` : '') + mmss(tt || 0)
  }
  function ronda(r, d) {
    const q = nom(d.rival), v = r.ganador == 'yo' ? 'Ganaste' : r.ganador == 'rival' ? 'Ganó ' + q : 'Tablas';
    return `<div class="st"><span style="flex:1;min-width:0"><b>Ronda ${r.n} · ${esc(nj(r.juego))}</b><small>Tú: ${fmt(r.juego, r.yo, r.tt_yo)} · ${q}: ${fmt(r.juego, r.rival, r.tt_rival)}</small></span><span class="tag${r.ganador == 'yo' ? ' ad' : ''}">${v}</span></div>`
  }
  const pasos = d => {
    const t = D.cfg.rondas || 5, w = D.cfg.victorias || 3;
    return `Mejor de ${t}: gana quien llegue a ${w} rondas`
  };

  /* Cabecera de la ronda en juego (la usa shell() de core.js). */
  function shell(t, b) {
    const d = D.dentro && mio(D.dentro); if (!d) return b;
    const r = ult(d);
    return `<div class="duh">${marcador(d)}<div class="dui">Ronda ${d.ronda} de ${D.cfg.rondas || 5} · <span id="dut">${cd(r.limite - now())}</span></div></div>
<div class="bar"><h1>${t}</h1>${D.conf ? '' : '<button class="lnk" data-a="du-rendir">Rendirse</button>'}</div>${D.conf ? confirmar(d) : ''}${b}`
  }
  const confirmar = d => `<section class="res"><p><b>¿Rendirte?</b> Perderás el duelo contra ${nom(d.rival)}.</p><div class="row"><button class="btn dg" data-a="du-rendir-si">Sí, rendirme</button><button class="btn" data-a="du-rendir-no">Seguir jugando</button></div></section>`;
  /* Tarjeta que sustituye a la de "compartir resultado" cuando terminas una ronda. */
  function res(t) {
    const d = D.dentro && mio(D.dentro); if (!d) return '';
    return `<section class="res"><h2>${t}</h2><p id="dur">${textoEspera(d)}</p></section>`
  }
  function textoEspera(d) {
    const r = ult(d), q = nom(d.rival);
    if (DU && DU.env) return 'Enviando tu resultado…';
    if (r.cerrada) return 'Ronda terminada.';
    const sobra = r.limite - now();
    return r.rival_fin ? `${q} ya ha terminado. Esperando el resultado…` : `Esperando a ${q}… (le quedan ${cd(sobra)})`
  }

  /* Pantallas fuera del juego: cuenta atrás y resultado final. */
  function pantalla() {
    const d = D.dentro && mio(D.dentro);
    if (!d) return `<div class="bar"><h1>Duelo</h1></div><p class="cap">Cargando…</p>`;
    const f = fase(d), q = nom(d.rival), cab = `<div class="bar"><h1>Duelo</h1></div>`;
    if (f == 'fin') return cab + final(d);
    const r = ult(d), prev = d.rondas[d.rondas.length - 2];
    return `${cab}<section class="res duc">${marcador(d)}<p class="cap">${pasos(d)}</p>
<h2>Ronda ${d.ronda} de ${D.cfg.rondas || 5}</h2><p class="cap">${d.ronda == 1 ? 'Primer juego' : 'Siguiente juego'}</p><p class="duj">${esc(nj(r.juego))}</p>
<p class="duq"><span id="duc">${Math.max(0, Math.ceil((r.empieza - now()) / 1000))}</span></p><p class="cap">Prepárate: empieza para los dos a la vez.</p></section>
${prev ? `<section class="res pb"><h2>Ronda anterior</h2>${ronda(prev, d)}</section>` : ''}
${D.conf ? confirmar(d) : '<div class="row"><button class="btn" data-a="du-rendir">Rendirse</button></div>'}`
  }
  function final(d) {
    const q = nom(d.rival), g = d.ganador == 'yo', e = d.ganador == null,
      tit = e ? 'Empate' : g ? '¡Has ganado el duelo!' : 'Has perdido el duelo',
      por = { rendicion: g ? `${q} se ha rendido.` : 'Te has rendido.', abandono: g ? `${q} ha dejado de jugar.` : 'Has dejado de jugar.', puntos: '', empate: 'Después de todas las rondas, igualados.' }[d.motivo] || '';
    return `<section class="res duf ${e ? 'e' : g ? 'w' : 'l'}">${marcador(d)}<h2>${tit}</h2>${por ? `<p>${por}</p>` : ''}</section>
${d.rondas.length ? `<section class="res pb"><h2>Rondas</h2>${d.rondas.filter(r => r.cerrada).map(r => ronda(r, d)).join('') || '<p class="cap">No se llegó a jugar ninguna.</p>'}</section>` : ''}
<div class="row"><button class="btn pri" style="flex:1" data-a="du-revancha" data-u="${esc(d.rival.usuario)}">Revancha</button><button class="btn" style="flex:1" data-a="du-salir">Salir</button></div>`
  }

  /* Lista de duelos (pantalla «Duelos»). */
  function hace(ms) { const m = Math.round((now() - ms) / 60000); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d` }
  function lobby() {
    const L = D.lista, M = msg ? `<p class="msg" role="status">${msg}</p>` : '', a = act(), rec = recibidas(), env = enviadas(),
      hist = (L || []).filter(d => !['pendiente', 'en_curso'].includes(d.estado)),
      am = (AM || []).filter(x => x.estado == 'aceptada'), ocup = !!a || false;
    const fila = (u, sub, acc) => `<div class="st"><span class="av">${esc(((u.nombre || u.usuario || '?')[0] || '?').toUpperCase())}</span><span style="flex:1;min-width:0"><b>${nom(u)}</b><small>${sub}</small></span>${acc}</div>`;
    const lab = d => d.estado == 'terminado' ? (d.ganador == 'yo' ? 'Ganaste' : d.ganador == 'rival' ? 'Perdiste' : 'Empate') + ` ${d.yo}–${d.ellos}` : { rechazado: d.soy == 'retador' ? 'Lo rechazó' : 'Rechazado', cancelado: 'Cancelado', expirado: 'Caducó' }[d.estado] || d.estado;
    return `<div class="bar"><button class="bk" data-a="go" data-v="amigos">‹ Amigos</button><h1>Duelos</h1></div>
<p class="sub" style="margin:0 0 8px">${pasos({})}. Hasta 5 juegos al azar: gana la ronda quien lo resuelva con menos intentos o más rápido. Las invitaciones caducan a los ${Math.round((D.cfg.invitacion || 300) / 60)} minutos.</p>${M}
${a ? `<section class="res pb"><h2>En curso</h2>${fila(a.rival, `${a.yo}–${a.ellos} · ronda ${a.ronda}`, '<button class="btn pri" data-a="du-ir" data-id="' + a.id + '">Volver al duelo</button>')}</section>` : ''}
${rec.length ? `<section class="res pb"><h2>Te han retado</h2>${rec.map(d => fila(d.rival, `Caduca en <span data-exp="${d.expira}">${cd(d.expira - now())}</span>`, `<span class="row" style="margin:0;flex:none"><button class="btn pri" data-a="du-ok" data-id="${d.id}">Aceptar</button><button class="lnk" data-a="du-no" data-id="${d.id}">Rechazar</button></span>`)).join('')}</section>` : ''}
${env.length ? `<section class="res pb"><h2>Esperando respuesta</h2>${env.map(d => fila(d.rival, `Caduca en <span data-exp="${d.expira}">${cd(d.expira - now())}</span>`, `<button class="lnk" data-a="du-can" data-id="${d.id}">Cancelar</button>`)).join('')}</section>` : ''}
<section class="res pb"><h2>Retar a un amigo</h2>${AM === null ? '<p class="cap">Cargando…</p>' : am.length ? am.map(x => { const bus = env.some(d => d.rival.usuario == x.usuario) || rec.some(d => d.rival.usuario == x.usuario); return fila(x, bus ? 'Invitación pendiente' : '', bus || ocup ? '' : `<button class="btn pri" data-a="du-retar" data-u="${x.usuario}">Retar</button>`) }).join('') : '<p class="cap">Todavía no tienes amigos. <button class="lnk" data-a="go" data-v="amigos">Añade alguno</button> para retarlo.</p>'}${ocup ? '<p class="cap">Termina tu duelo en curso para retar a otro amigo.</p>' : ''}</section>
<section class="res pb"><h2>Historial</h2>${L === null ? '<p class="cap">Cargando…</p>' : hist.length ? hist.map(d => fila(d.rival, `${lab(d)} · ${hace(d.cerrado || d.creado)}`, d.estado == 'terminado' && !ocup ? `<button class="lnk" data-a="du-retar" data-u="${esc(d.rival.usuario)}">Revancha</button>` : '')).join('') : '<p class="cap">Aquí saldrán tus últimos duelos (7 días).</p>'}</section>`
  }

  /* Pantallas que pinta draw() en app.js: devuelve null si no le toca a los duelos. */
  function vista() {
    if (V == 'duelos') return lobby();
    if (V == 'duelo') { if (!D.dentro) { V = 'duelos'; return lobby() } return pantalla() }
    return null
  }

  /* ---------- Aviso de invitación (como en el ajedrez): flota sobre cualquier pantalla ---------- */
  let el = null;
  function pintaBanner() {
    if (!el) { el = document.createElement('div'); el.id = 'dub'; el.setAttribute('role', 'alert'); el.onclick = e => { const b = e.target.closest('[data-a]'); if (b) accion(b.dataset.a, b) }; document.body.appendChild(el) }
    const rec = D.dentro ? [] : recibidas(), a = D.dentro || DU ? null : act();
    const k = rec.map(d => d.id).join() + '|' + (a ? a.id : '');
    if (k == D.ban) return; D.ban = k;
    if (rec.length) {
      const d = rec[0];
      el.innerHTML = `<div class="dub"><span class="dubi" aria-hidden="true">${IC.du}</span><span class="dubt"><span><b>${nom(d.rival)}</b> te reta a un duelo</span><small>Mejor de ${D.cfg.rondas || 5} · caduca en <span id="dubx" data-exp="${d.expira}">${cd(d.expira - now())}</span>${rec.length > 1 ? ` · +${rec.length - 1} más` : ''}</small></span><span class="row" style="margin:0;flex:none"><button class="btn pri" data-a="du-ok" data-id="${d.id}">Aceptar</button><button class="btn" data-a="du-no" data-id="${d.id}">Rechazar</button></span></div>`; el.className = 'on'
    } else if (a) {
      el.innerHTML = `<div class="dub"><span class="dubi" aria-hidden="true">${IC.du}</span><span class="dubt"><span><b>Duelo con ${nom(a.rival)}</b> en curso</span><small>${a.yo}–${a.ellos} · ronda ${a.ronda}</small></span><button class="btn pri" data-a="du-ir" data-id="${a.id}">Ir al duelo</button></div>`; el.className = 'on'
    } else { el.className = ''; el.innerHTML = '' }
  }
  /* Actualiza contadores sin volver a pintar la pantalla (no se pierde nada de lo que estés haciendo). */
  function parche() {
    const t = Date.now() + D.off, set = (id, v) => { const e = document.getElementById(id); if (e && e.textContent != v) e.textContent = v };
    document.querySelectorAll('[data-exp]').forEach(e => { const v = cd(+e.dataset.exp - t); if (e.textContent != v) e.textContent = v });
    const d = D.dentro && mio(D.dentro); if (!d || d.estado != 'en_curso') { if (D.lista && (recibidas().length + enviadas().length) != document.querySelectorAll('#dub .dub, [data-a=du-can]').length) pintaBanner(); return }
    const r = ult(d);
    set('duc', String(Math.max(0, Math.ceil((r.empieza - t) / 1000)))); set('dut', cd(r.limite - t));
    const w = document.getElementById('dur'); if (w) { const v = textoEspera(d); if (w.textContent != v) w.textContent = v }
  }

  /* ---------- Acciones (botones data-a="du-…") ---------- */
  function aviso(p, ok) { return p.then(r => { if (ok) toast(typeof ok == 'function' ? ok(r) : ok); return cargar() }).catch(e => { console.warn(e); toast(em(e)) }) }
  function accion(a, b) {
    const id = b && b.dataset.id, u = b && b.dataset.u;
    if (a == 'du-ok') {
      toast('Aceptando…');
      Nube.responderDuelo(id, true).then(r => {
        if (r == 'caducado') { toast('La invitación ha caducado.'); return cargar() }
        return cargar().then(() => { D.dentro = id; D.conf = false; D.key = ''; sync() })
      }).catch(e => { console.warn(e); toast(em(e)); cargar() })
    }
    else if (a == 'du-no') aviso(Nube.responderDuelo(id, false), 'Invitación rechazada.')
    else if (a == 'du-can') aviso(Nube.cancelarDuelo(id), 'Invitación cancelada.')
    else if (a == 'du-retar') aviso(Nube.retar(u), () => { if (!D.dentro) { V = 'duelos'; draw() } return `Reto enviado a @${u}. Caduca en ${Math.round((D.cfg.invitacion || 300) / 60)} min.` })
    else if (a == 'du-revancha') { D.dentro = null; D.key = ''; V = 'duelos'; aviso(Nube.retar(u), `Reto enviado a @${u}.`).then(() => draw()) }
    else if (a == 'du-ir') { D.dentro = id; D.conf = false; D.key = ''; sync() }
    else if (a == 'du-rendir') { D.conf = true; draw() }
    else if (a == 'du-rendir-no') { D.conf = false; draw() }
    else if (a == 'du-rendir-si') {
      const i = D.dentro; D.conf = false;
      Nube.rendirse(i).then(uno).catch(e => { console.warn(e); toast(em(e)); draw() })
    }
    else if (a == 'du-salir') { D.dentro = null; D.key = ''; if (DU) salirRonda(); V = 'duelos'; draw(); cargar() }
  }
  const badge = () => recibidas().length + (act() && !D.dentro ? 1 : 0);
  /* Abrir la pantalla «Duelos». */
  function abrir() { cargar().then(() => { if (V == 'duelos') draw() }); if (AM === null && Nube.user) cargarAmigos() }
  function init() { setInterval(bucle, 500); addEventListener('visibilitychange', () => { if (!document.hidden) D.ult = 0 }); addEventListener('online', () => { D.ult = 0 }) }

  return { init, vista, shell, res, fin, accion, abrir, badge, reset, ocupado: () => !!(DU || D.dentro), cargar }
})();
