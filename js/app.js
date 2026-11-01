/* Daily Arcade · pantallas (inicio, perfil, ajustes) y arranque.
   No hace falta tocar este archivo para añadir juegos. */
const VT={public:'Cualquiera que te encuentre por tu @usuario podrá ver tu perfil: nombre, rachas y estadísticas por juego.',private:'Solo tus amigos verán tu perfil y te verás en sus rankings. Los demás te encuentran por tu @usuario, pero solo ven eso, y pueden enviarte una solicitud.'},VS={public:'Público',private:'Privado'};
/* Invitado = sin sesión. En modo local (sin Supabase) siempre lo es. Un invitado no tiene perfil que otros puedan ver,
   así que no se le ofrece elegir la privacidad. */
const inv=()=>!Nube.user,pct=(a,b)=>b?Math.round(100*a/b):0;
const UOK=/^[a-z0-9_]{3,15}$/,UMSG='El usuario debe tener de 3 a 15 caracteres: minúsculas, números o _.',nu=v=>String(v).trim().toLowerCase().replace(/^@/,'');
let vp='perfil'; /* de dónde se abrió Cuenta, para el botón Volver */
let en=false; /* editando el nombre en Perfil */
let eu=null; /* usuario en edición (null = no se está editando) */
let ask=false; /* confirmación de "Borrar mis resultados" */
const IDS=()=>GAMES.map(g=>g.id);
let AM=null,fq='',fr; /* AM: amistades (null = sin cargar). fq: texto buscado. fr: resultado (undefined = sin buscar, null = no encontrado) */
let cfm=null; /* amigo pendiente de confirmar "Quitar" */
let blq=null,BL=null; /* blq: usuario pendiente de confirmar "Bloquear". BL: usuarios que has bloqueado (null = sin cargar) */
function cargarBloqueados(){return Nube.bloqueados().then(l=>{BL=l}).catch(e=>{console.warn(e);BL=BL||[]}).then(()=>{if(V=='ajustes')draw()})}
let FP=null; /* perfil de amigo abierto: {u, n, res (misma forma que S.res), err} */
function verAmigo(u){const f=FP={u,n:null,res:null,err:''};V='amigo';msg='';draw();
 Nube.verPerfil(u).then(d=>{const res={},ids=IDS();
  (d.resultados||[]).forEach(r=>{if(Number.isInteger(r.d)&&r.d>=1&&r.d<=DAY&&ids.includes(r.j)&&r.x&&typeof r.x=='object')(res[r.d]=res[r.d]||{})[r.j]=r.x});
  f.res=res;f.n=d.nombre;f.u=d.usuario}).catch(e=>{console.warn(e);f.err=em(e)}).then(()=>{if(FP===f&&V=='amigo')draw()})}
let RK={tab:'dia',d:DAY,dia:null,rachas:null,err:''},rkTok=0; /* ranking: pestaña, día visto y datos (null = cargando) */
function cargarRanking(){const t=RK.tab,d=RK.d,k=++rkTok;RK.err='';
 (t=='dia'?Nube.rankingDia(d):Nube.rankingRachas())
  .then(l=>{if(k==rkTok)RK[t]=l}).catch(e=>{console.warn(e);if(k==rkTok){RK[t]=[];RK.err=em(e)}})
  .then(()=>{if(k==rkTok&&V=='ranking')draw()})}
const em=e=>e&&e.code=='P0001'&&e.message?e.message:'No se ha podido completar la acción. Inténtalo de nuevo.'; /* solo mostramos los mensajes que escribe el servidor */
const nrec=()=>(AM||[]).filter(a=>a.estado=='pendiente'&&a.direccion=='recibida').length;
function cargarAmigos(){
 return Nube.amistades().then(l=>{AM=l}).catch(e=>{console.warn(e);if(V=='amigos')msg='No se han podido cargar tus amigos.'}).then(()=>{if(V=='amigos'||V=='home')draw()})}
/* Ejecuta una acción de amistad y recarga la lista. */
function accion(p,ok,vol){msg='Un momento…';draw();
 p.then(r=>{msg=typeof ok=='function'?ok(r):ok||'';return Nube.amistades()}).then(l=>{AM=l}).catch(e=>{console.warn(e);msg=em(e)}).then(()=>{cfm=null;blq=null;if(vol&&V=='amigo'){V='amigos';FP=null}draw()})}

/* Al iniciar sesión (o recuperar la sesión al abrir la web): los datos del navegador pasan a ser de esta cuenta y se fusionan con los del servidor.
   Si el navegador tenía datos de OTRA cuenta, se descartan (nunca se suben a una cuenta ajena). Los de un invitado (uid null) sí se suben. */
async function alEntrar(){
 const u=Nube.user;if(!u)return;
 if(S.uid&&S.uid!==u.id){S.res={};S.pr={};S.me={n:'Invitado',v:'public'};AM=null}
 S.uid=u.id;
 if(Nube.perfil){S.me.n=Nube.perfil.nombre;S.me.v=Nube.perfil.privacidad=='public'||!Nube.perfil.privacidad?'public':'private'}
 sv();
 try{await Nube.sincronizar(S,DAY,IDS())}
 catch(e){console.warn('Sincronización fallida',e);msg='No se han podido sincronizar tus resultados con tu cuenta. Siguen guardados en este navegador y se reintentará.'}
 sv()}
async function cerrar(){
 msg='Guardando tus resultados…';draw();
 try{await Nube.subirTodo(S,DAY,IDS())}catch(e){console.warn(e);msg='No se han podido guardar tus últimos resultados en tu cuenta. Comprueba la conexión e inténtalo de nuevo.';draw();return}
 try{await Nube.salir()}catch(e){console.warn(e)}
 S={res:{},pr:{},me:{n:'Invitado',v:'public'},set:S.set,uid:null};Nube.user=Nube.perfil=null;AM=null;BL=null;blq=null;fq='';fr=undefined;sv();msg='';eu=null;draw()}

/* ---------- Ajustes ---------- */
function seg(a,k,o,lab){const on=a=='vis'?S.me.v:S.set[k];return `<div class="seg" role="group" aria-label="${lab}">${o.map(([v,l])=>`<button class="btn" data-a="${a}" data-v="${v}"${a=='set'?` data-k="${k}"`:''} aria-pressed="${on==v}">${l}</button>`).join('')}</div>`}
function sw(k,l,d){return `<div class="st"><span><b>${l}</b><small>${d}</small></span><button class="sw" role="switch" aria-checked="${!!S.set[k]}" aria-label="${l}" data-a="set" data-k="${k}"></button></div>`}
function secCuenta(){
 if(inv())return `<section class="res pb"><h2>Cuenta</h2><p>Juegas como invitado: tu perfil solo existe en este navegador y nadie más puede verlo.${Nube.activo?' Con una cuenta podrás elegir quién ve tu perfil.':''}</p>${Nube.activo?'<div class="row"><button class="btn pri" data-a="go" data-v="cuenta">Entrar o crear cuenta</button></div>':''}</section>`;
 return `<section class="res pb"><h2>Cuenta</h2><div class="st"><span><b>${esc(S.me.n)}</b><small>${esc(Nube.user.email)}</small></span><button class="btn" data-a="go" data-v="cuenta">Mi cuenta</button></div><div class="st v"><span><b>Privacidad del perfil</b><small>${VT[S.me.v]}</small></span>${seg('vis','',[['public','Público'],['private','Privado']],'Privacidad del perfil')}</div></section>`}
function ajustes(){
 return `<div class="bar"><button class="bk" data-a="go" data-v="home">‹ Inicio</button><h1>Ajustes</h1></div>
${secCuenta()}
${msg?`<p class="msg" role="status">${msg}</p>`:''}
<section class="res pb"><h2>Apariencia</h2><div class="st v"><span><b>Tema</b></span>${seg('set','th',[['auto','Sistema'],['light','Claro'],['dark','Oscuro']],'Tema')}</div>${sw('cb','Paleta para daltónicos','Cambia los colores de acierto en Palabra; los símbolos ✓ ● – se mantienen.')}</section>
<section class="res pb"><h2>Juegos</h2>${sw('tm','Mostrar cronómetro','En todos los juegos.')}${sw('hl','Resaltar conflictos','En Coronas, marca filas, columnas y regiones repetidas y coronas que se tocan. En Sudoku, números repetidos.')}</section>
${inv()?'':`<section class="res pb"><h2>Usuarios bloqueados</h2>${BL===null?'<p class="cap">Cargando…</p>':BL.length?BL.map(b=>`<div class="st"><span><b>${esc(b.nombre||'@'+b.usuario)}</b>${b.nombre?`<small>@${esc(b.usuario)}</small>`:''}</span><button class="lnk" data-a="bl-un" data-u="${b.usuario}">Desbloquear</button></div>`).join(''):'<p>No has bloqueado a nadie.</p>'}</section>`}
<section class="res pb"><h2>Datos</h2><p>${inv()?'Tus resultados se guardan solo en este navegador.':'Tus resultados se guardan en tu cuenta y en este navegador.'}</p>${ask?'<p><b>¿Borrar todos tus resultados?</b> '+(inv()?'':'Se borrarán también de tu cuenta. ')+'No se puede deshacer.</p><div class="row"><button class="btn dg" data-a="reset-si">Sí, borrar</button><button class="btn" data-a="reset-no">Cancelar</button></div>':'<div class="row"><button class="btn" data-a="reset">Borrar mis resultados</button></div>'}</section>`}

/* ---------- Perfil ---------- */
function blk(g,e,am){
 e=e||E(g.id);const w=e.filter(x=>x.st=='won'||x.st=='completed'),a=runs(e.map(x=>x.d)),v=runs(w.map(x=>x.d)),vs=g.winStreak!==false,
 c=(n,l,s)=>`<div><b>${n}</b><span>${l}${s?`<small>${s}</small>`:''}</span></div>`,sg=(n,l)=>n==1?l.replace(/s\b/g,''):l;
 return `<details class="res pb gm"${GAMES.length<=3?' open':''}><summary><span class="gi" style="background:var(${g.color})">${g.icon}</span><h2>${g.name}</h2><small>${e.length?a.cur+(a.cur==1?' día':' días')+' de racha':'Sin jugar'}</small></summary>`+
 (e.length?`<div class="gs">${c(e.length,sg(e.length,'partidas'))}${c(w.length,sg(w.length,g.winLabel),pct(w.length,e.length)+' %')}${c(a.cur,'días de racha','mejor '+a.best)}${vs?c(v.cur,sg(v.cur,'victorias seguidas'),'mejor '+v.best):''}</div>${g.stats?`<div class="gx">${(()=>{try{return g.stats(e,w)}catch(x){return ''}})()}</div>`:''}`
 :(am?'<p>Todavía no ha jugado este juego.</p>':`<p>Todavía no has jugado este reto.</p><div class="row"><button class="btn" data-a="go" data-v="${g.id}">Jugar ahora</button></div>`))+`</details>`}
function resumen(res){
 const all=days(res),gr=runs(all),T=GAMES.length,full=all.filter(d=>Object.keys(res[d]).length==T).length;
 return `<div class="sm"><div><b>${gr.cur}</b>racha actual</div><div><b>${gr.best}</b>mejor racha</div><div><b>${all.length}</b>días jugados</div></div>
<section class="res pb"><h2>Últimos 28 días</h2><div class="hm" aria-label="Actividad de los últimos 28 días">${Array.from({length:28},(_,i)=>{const d=DAY-27+i,n=Object.keys(res[d]||{}).length;return `<span${i==27?' class="hoy"':''} title="Reto ${d}: ${n}/${T}" style="opacity:${.12+n/T*.88}"></span>`}).join('')}</div><p class="cap">${full} ${full==1?'día':'días'} con los ${T} juegos completados.</p></section>`}
function perfil(){
 const me=S.me,
 us=Nube.perfil&&Nube.perfil.usuario,
 pie=inv()?`<div class="hs"><p>Juegas sin cuenta: tus resultados se guardan solo en este navegador.</p>${Nube.activo?'<div class="row"><button class="btn pri" data-a="go" data-v="cuenta">Entrar o crear cuenta</button></div>':''}</div>`
  :`<div class="hs"><button class="btn pri" data-a="go" data-v="amigos">Amigos${nrec()?` · ${nrec()} ${nrec()==1?'solicitud':'solicitudes'}`:''}</button></div>`;
 return `<div class="bar"><button class="bk" data-a="go" data-v="home">‹ Inicio</button><h1>Perfil</h1></div>
<section class="res hd"><div class="me"><span class="av lg">${esc((me.n[0]||'I').toUpperCase())}</span>${en
 ?`<span class="id" style="flex:1;align-items:stretch"><input id="nm" value="${esc(me.n)}" maxlength="20" placeholder="Tu nombre" aria-label="Nombre" autocomplete="off"><span class="row" style="margin:0"><button class="btn pri" data-a="nm-save">Guardar</button><button class="btn" data-a="nm-cancel">Cancelar</button></span></span>`
 :`<span class="id" style="flex:1"><b>${esc(me.n)}<button class="lnk ed" data-a="nm-edit" aria-label="Editar nombre" title="Editar nombre"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg></button></b>${us?`<small>@${esc(us)}</small>`:''}</span>${inv()?'':`<span class="tag" style="flex:none" title="Quién puede ver tu perfil. Se cambia en Ajustes.">${VS[me.v]}</span>`}`}</div>${pie}</section>
${resumen(S.res)}`+GAMES.map(g=>blk(g)).join('')}

/* ---------- Amigos (solo con sesión) ---------- */
function amigos(){
 const L=AM||[],T=GAMES.length,M=msg?`<p class="msg" role="status">${msg}</p>`:'',
  rec=L.filter(a=>a.estado=='pendiente'&&a.direccion=='recibida'),env=L.filter(a=>a.estado=='pendiente'&&a.direccion=='enviada'),ami=L.filter(a=>a.estado=='aceptada'),
  nom=a=>esc(a.nombre||'@'+a.usuario),ini=a=>esc(((a.nombre||a.usuario)[0]||'?').toUpperCase()),
  fila=(a,sub,acc)=>`<div class="st"><span class="av">${ini(a)}</span><span style="flex:1;min-width:0"><b>${nom(a)}</b><small>${sub}</small></span>${acc}</div>`,
  quitar=a=>cfm==a.usuario?`<span class="row" style="margin:0;flex:none"><button class="btn dg" data-a="am-del-si" data-u="${a.usuario}">Quitar</button><button class="btn" data-a="am-del-no">No</button></span>`:`<button class="lnk" data-a="am-del" data-u="${a.usuario}">Quitar</button>`,
  stats=a=>`${a.racha} ${a.racha==1?'día':'días'} de racha · mejor ${a.mejor} · hoy ${a.hoy}/${T}`,
  h0=a=>a.nombre?'@'+a.usuario:'',j=(...x)=>x.filter(Boolean).join(' · ');
 let res='';
 if(fr===null)res='<p class="cap">No hemos encontrado a nadie con ese usuario.</p>';
 else if(fr){const a=fr,r=a.relacion,
  ver=(a.publico||r=='amigos')&&r!='bloqueado'?`<button class="lnk" data-a="am-ver" data-u="${a.usuario}">Ver perfil</button>`:'',
  main=r=='bloqueado'?`<button class="btn" data-a="bl-un" data-u="${a.usuario}">Desbloquear</button>`:r=='ninguna'?`<button class="btn pri" data-a="am-add" data-u="${a.usuario}">Añadir</button>`:r=='recibida'?`<button class="btn pri" data-a="am-ok" data-u="${a.usuario}">Aceptar</button>`:`<small>${r=='yo'?'Eres tú':r=='amigos'?'Ya sois amigos':'Solicitud enviada'}</small>`,
  acc=r=='yo'?main:`<span class="row" style="margin:0;flex:none;gap:14px;align-items:center">${ver}${main}</span>`;
  res=`<div style="margin-top:10px">${fila(a,j(h0(a),r=='bloqueado'?'Bloqueado':r!='yo'&&r!='amigos'&&!a.publico?'Perfil privado':''),acc)}</div>`}
 return `<div class="bar"><button class="bk" data-a="go" data-v="home">‹ Inicio</button><h1>Amigos</h1></div>
<div class="row"><button class="btn pri" data-a="go" data-v="ranking" style="flex:1">Ver ranking</button></div>
<section class="res pb"><h2>Añadir amigos</h2><p>Escribe el @usuario exacto de tu amigo. Tu usuario es <b>@${esc((Nube.perfil&&Nube.perfil.usuario)||'')}</b>.</p><div class="me"><span class="at">@</span><input id="fq" value="${esc(fq)}" maxlength="16" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="usuario" aria-label="Usuario de tu amigo"><button class="btn pri" data-a="am-buscar">Buscar</button></div>${res}</section>
${M}
${rec.length?`<section class="res pb"><h2>Solicitudes recibidas</h2>${rec.map(a=>blq==a.usuario
 ?fila(a,'¿Bloquear? No podrá volver a encontrarte.',`<span class="row" style="margin:0;flex:none"><button class="btn dg" data-a="bl-si" data-u="${a.usuario}">Bloquear</button><button class="btn" data-a="bl-no">No</button></span>`)
 :fila(a,j(h0(a),a.nombre?`<button class="lnk" data-a="am-ver" data-u="${a.usuario}">Ver perfil</button>`:'',`<button class="lnk" data-a="bl-ask" data-u="${a.usuario}">Bloquear</button>`),`<span class="row" style="margin:0;flex:none"><button class="btn pri" data-a="am-ok" data-u="${a.usuario}">Aceptar</button><button class="lnk" data-a="am-no" data-u="${a.usuario}">Rechazar</button></span>`)).join('')}</section>`:''}
<section class="res pb"><h2>Mis amigos</h2>${AM===null?'<p class="cap">Cargando…</p>':ami.length?ami.map(a=>fila(a,j(h0(a),stats(a)),`<span class="row" style="margin:0;flex:none;gap:14px;align-items:center">${a.visible&&cfm!=a.usuario?`<button class="lnk" data-a="am-ver" data-u="${a.usuario}">Ver perfil</button>`:''}${quitar(a)}</span>`)).join(''):'<p class="cap">Todavía no tienes amigos añadidos.</p>'}</section>
${env.length?`<section class="res pb"><h2>Solicitudes enviadas</h2>${env.map(a=>fila(a,j(h0(a),'pendiente'),`<button class="lnk" data-a="am-can" data-u="${a.usuario}">Cancelar</button>`)).join('')}</section>`:''}
<p class="foot">Con el perfil Público, cualquiera que te encuentre por tu @usuario puede verlo. Con Privado, solo tus amigos (Ajustes).</p>`}

/* ---------- Ranking entre amigos ---------- */
function ranking(){
 const T=GAMES.length,tab=RK.tab,L=RK[tab],
  tabs=`<div class="seg" role="group" aria-label="Tipo de ranking">${[['dia','Del día'],['rachas','Rachas']].map(([v,l])=>`<button class="btn" data-a="rk-tab" data-v="${v}" aria-pressed="${tab==v}">${l}</button>`).join('')}</div>`,
  nav=tab=='dia'?`<div class="rn"><button class="bk" data-a="rk-d" data-v="-1"${RK.d<=1?' disabled':''} aria-label="Día anterior">‹</button><b>Reto nº ${RK.d}${RK.d==DAY?' · hoy':''}</b><button class="bk" data-a="rk-d" data-v="1"${RK.d>=DAY?' disabled':''} aria-label="Día siguiente">›</button></div>`:'',
  fila=(a,sub,pt)=>`<div class="st${a.yo?' yo':''}"><span class="pos">${a.pos==null?'–':a.pos}</span><span style="flex:1;min-width:0"><b>${esc(a.nombre||'@'+a.usuario)}${a.yo?' <span class="tag">Tú</span>':''}</b><small>${sub}</small></span><span class="pt">${pt}</span></div>`,
  fd=a=>a.jugados==0?fila(a,'Sin jugar',''):fila(a,`${a.ganados} ${a.ganados==1?'ganado':'ganados'} · ${a.jugados}/${T} jugados${a.tiempo?' · '+mmss(+a.tiempo):''}`,`${a.ganados}<small>de ${T}</small>`),
  fr2=a=>fila(a,`mejor ${a.mejor} · ${a.dias} ${a.dias==1?'día jugado':'días jugados'}`,`${a.racha}<small>${a.racha==1?'día':'días'}</small>`),
  solo=L&&L.length==1&&!RK.err?'<p class="cap" style="margin-top:12px">Aquí solo estás tú. <button class="lnk" data-a="go" data-v="amigos">Añade amigos</button> para competir.</p>':'',
  regla=tab=='dia'?'Gana quien más juegos gane; si empatan, el menor tiempo total.':'Se ordena por racha actual; si empatan, por la mejor racha.';
 return `<div class="bar"><button class="bk" data-a="go" data-v="amigos">‹ Amigos</button><h1>Ranking</h1></div>
${tabs}${nav}
<section class="res pb">${L===null?'<p class="cap">Cargando…</p>':RK.err?`<p class="msg" role="status">${RK.err}</p>`:L.map(tab=='dia'?fd:fr2).join('')+solo}</section>
<p class="foot">${regla} Solo salen tú y tus amigos. Los resultados los envía cada jugador desde su navegador: es un ranking entre amigos, no una clasificación oficial.</p>`}

/* ---------- Perfil de un amigo (solo lectura) ---------- */
function perfilAmigo(){
 const f=FP,back='<div class="bar"><button class="bk" data-a="go" data-v="amigos">‹ Amigos</button><h1>Perfil</h1></div>';
 if(!f.res)return back+(f.err?`<p class="msg" role="status">${f.err}</p>`:'<p class="cap">Cargando…</p>');
 const nm=f.n||f.u,a=(AM||[]).find(x=>x.usuario==f.u),rel=!a?'ninguna':a.estado=='aceptada'?'amigos':a.direccion,
  bt=(ac,t,c)=>`<button class="btn${c?' '+c:''}" style="flex:1" data-a="${ac}" data-u="${f.u}">${t}</button>`,
  der=rel=='amigos'?'<span class="tag">Amigo</span>':rel=='ninguna'?`<button class="btn pri" data-a="am-add" data-u="${f.u}">Añadir amigo</button>`:`<span class="tag">${rel=='recibida'?'Solicitud recibida':'Solicitud enviada'}</span>`,
  fil=rel=='amigos'?(cfm==f.u?`<p>¿Quitar a ${esc(nm)} de tus amigos?</p><div class="row">${bt('am-del-si','Quitar','dg')}<button class="btn" style="flex:1" data-a="am-del-no">Cancelar</button></div>`:`<div class="row">${bt('am-del','Quitar amigo')}</div>`)
   :rel=='recibida'?`<div class="row">${bt('am-ok','Aceptar','pri')}${bt('am-no','Rechazar')}</div>`
   :rel=='enviada'?`<div class="row">${bt('am-can','Cancelar solicitud')}</div>`:'';
 return back+`<section class="res hd"><div class="me"><span class="av lg">${esc((nm[0]||'?').toUpperCase())}</span><span class="id" style="flex:1"><b>${esc(nm)}</b><small>@${esc(f.u)}</small></span><span style="flex:none">${der}</span></div><div class="hs">${blq==f.u?`<p>¿Bloquear a ${esc(nm)}? Dejará de poder encontrarte y ver tu perfil, y se eliminará vuestra amistad o solicitud. No se enterará.</p><div class="row">${bt('bl-si','Bloquear','dg')}<button class="btn" style="flex:1" data-a="bl-no">Cancelar</button></div>`:fil+`<p class="cap"${fil?' style="margin-top:12px"':''}><button class="lnk" data-a="bl-ask" data-u="${f.u}">Bloquear a @${esc(f.u)}</button></p>`}</div></section>${msg?`<p class="msg" role="status">${msg}</p>`:''}${resumen(f.res)}`+GAMES.map(g=>blk(g,E(g.id,f.res),true)).join('')}

/* ---------- Cuenta (solo con Supabase) ---------- */
function cuenta(){
 const u=Nube.user,p=Nube.perfil,adm=p&&p.rol=='admin',us=p&&p.usuario,nm=S.me.n||(p&&p.nombre)||'Jugador',
  M=`<p class="msg" role="status">${msg}</p>`;
 if(!u)return `<div class="bar"><button class="bk" data-a="go" data-v="${vp}">‹ ${vp=='ajustes'?'Ajustes':'Perfil'}</button><h1>Cuenta</h1></div>
<section class="res"><h2>Entrar o crear cuenta</h2><p>Es opcional. Con una cuenta tus resultados y rachas se guardan en el servidor y los recuperas en cualquier dispositivo. Lo que ya hayas jugado en este navegador se sube al entrar.</p><div class="me" style="flex-direction:column;align-items:stretch;gap:8px"><input id="em" type="email" placeholder="Correo" autocomplete="email"><input id="pw" type="password" placeholder="Contraseña (mínimo 6)" autocomplete="current-password"><input id="nm2" placeholder="Nombre (solo al crear la cuenta)" maxlength="20"><input id="us2" placeholder="Usuario para tus amigos (opcional, solo al crear)" maxlength="16" autocapitalize="none" autocomplete="off" spellcheck="false"></div><div class="row"><button class="btn pri" data-a="entrar">Entrar</button><button class="btn" data-a="registrar">Crear cuenta</button></div></section>${M}`;
 const fu=!us?'':eu===null
  ?`<div class="st"><span><b>Usuario</b><small>@${esc(us)}</small></span><button class="lnk" data-a="usr-edit">Cambiar</button></div>`
  :`<div class="st v"><span><b>Usuario</b><small>Con él te encontrarán tus amigos. De 3 a 15 caracteres: minúsculas, números o _.</small></span><div class="me"><span class="at">@</span><input id="us" value="${esc(eu)}" maxlength="16" autocapitalize="none" autocomplete="off" spellcheck="false" aria-label="Usuario"></div><div class="row"><button class="btn pri" data-a="usr-save">Guardar</button><button class="btn" data-a="usr-cancel">Cancelar</button></div></div>`;
 return `<div class="bar"><button class="bk" data-a="go" data-v="${vp}">‹ ${vp=='ajustes'?'Ajustes':'Perfil'}</button><h1>Cuenta</h1></div>
<section class="res hd"><div class="me"><span class="av lg">${esc((nm[0]||'J').toUpperCase())}</span><span class="id"><b>${esc(nm)}</b>${us?`<small>@${esc(us)}</small>`:''}<span class="tag${adm?' ad':''}">${adm?'Administrador':'Jugador'}</span></span></div></section>
<section class="res pb"><h2>Datos</h2>
${fu}
<div class="st"><span><b>Nombre</b><small>${esc(nm)}</small></span><button class="lnk" data-a="go" data-v="perfil">Cambiar</button></div>
<div class="st"><span><b>Correo</b><small>${esc(u.email)}</small></span></div></section>
${M}
${adm?'<section class="res pb"><h2>Administración</h2><p>Gestiona el reto de cada día.</p><div class="row"><a class="btn pri" href="admin.html">Abrir el panel</a></div></section>':''}
<button class="btn out" data-a="salir">Cerrar sesión</button>`}

/* ---------- Inicio ---------- */
function status(g){
 const r=R(g.id),p=S.pr[DAY+g.pk];
 if(g.status)return g.status(r,p);
 return r?'Completado':p&&p.t0?'En curso':'Sin jugar'}
const SV=d=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={user:SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),fr:SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 4.5 1.9 4.5 5"/>'),cfg:SV('<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>')};
function home(){
 const st=streak(),f=new Date(D0).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
 return `<header class="top"><h1>Daily Arcade</h1><span style="display:flex;gap:8px;align-items:center">${Nube.user?`<button class="bk ic" data-a="go" data-v="amigos" aria-label="Amigos${nrec()?` (${nrec()} solicitudes)`:''}" title="Amigos">${IC.fr}${nrec()?`<span class="bd" aria-hidden="true">${nrec()}</span>`:''}</button>`:''}<button class="bk ic" data-a="go" data-v="perfil" aria-label="Perfil" title="Perfil">${IC.user}</button><button class="bk ic" data-a="go" data-v="ajustes" aria-label="Ajustes" title="Ajustes">${IC.cfg}</button></span></header>
<div class="hb"><div class="sn"><b>${st}</b>${st==1?'día':'días'} de racha</div><div><b>Reto nº ${DAY}</b>${f}</div><div><b id="cd">--:--:--</b>próximo reto</div></div>`+
 GAMES.map(g=>`<button class="gc" data-a="go" data-v="${g.id}"><span class="gl" style="background:var(${g.color})">${g.icon}</span><span><strong>${g.name}</strong><small>${g.desc}</small><em>${status(g)}</em></span></button>`).join('')+
 `<p class="foot">Sin cuenta: los resultados se guardan solo en este navegador. Cada día cambia el reto a medianoche, hora de Madrid.</p>`}

/* ---------- Control ---------- */
function draw(){
 const g=cur();
 $('#app').innerHTML=V=='perfil'?perfil():V=='ajustes'?ajustes():V=='cuenta'&&Nube.activo?cuenta():V=='amigos'&&Nube.user?amigos():V=='ranking'&&Nube.user?ranking():V=='amigo'&&Nube.user&&FP?perfilAmigo():g?g.render():(V='home',home());
 tick()}
function tick(){
 const q=parts();if(q.day!==P.day)return location.reload();
 const rem=86400-(q.hour*3600+q.minute*60+q.second),c=$('#cd');
 if(c)c.textContent=[Math.floor(rem/3600),Math.floor(rem%3600/60),rem%60].map(v=>String(v).padStart(2,'0')).join(':');
 const t=$('#tm'),g=cur(),p=g&&prog(g.pk);
 if(t&&p&&p.t0&&!R(V))t.textContent=mmss(Date.now()-p.t0)}
async function copy(){const t=$('#sh').textContent,b=$('[data-a=copy]');try{await navigator.clipboard.writeText(t);b.textContent='Copiado'}catch(e){const r=document.createRange();r.selectNodeContents($('#sh'));const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='Texto seleccionado: cópialo'}}
$('#app').onclick=e=>{
 const sm=e.target.closest('.how>summary');if(sm){const d=sm.parentNode;HW[d.dataset.g]=!d.open;return}
 const b=e.target.closest('[data-a]');if(!b)return;
 const a=b.dataset.a,g=cur();
 if(a=='go'){if(b.dataset.v=='cuenta')vp=V=='ajustes'?'ajustes':'perfil';V=b.dataset.v;msg='';sel=null;hist=[];ask=false;eu=null;en=false;cfm=null;blq=null;fr=undefined;fq='';if(V=='ranking'){RK={tab:RK.tab,d:DAY,dia:null,rachas:null,err:''}}draw();if(V=='amigos'&&Nube.user)cargarAmigos();if(V=='ranking'&&Nube.user)cargarRanking();if(V=='ajustes'&&Nube.user)cargarBloqueados()}
 else if(a=='set'){const k=b.dataset.k;S.set[k]=k=='th'?b.dataset.v:!S.set[k];sv();theme();draw()}
 else if(a=='copy')copy();
 else if(a=='entrar'||a=='registrar'){
  const em=$('#em').value.trim(),pw=$('#pw').value,nm=($('#nm2').value.trim()||'Jugador').slice(0,20),us=a=='registrar'?nu($('#us2').value):'';
  if(us&&!UOK.test(us)){msg=UMSG;draw();return}
  msg='Un momento…';draw();
  (a=='entrar'?Nube.entrar(em,pw):Nube.libre(us).then(ok=>{if(!ok)throw{message:'Ese usuario ya está en uso.'};return Nube.registrar(em,pw,nm,us)}).then(s=>{if(!s)throw{message:'Cuenta creada. Revisa tu correo para confirmarla y luego entra.'}}))
   .then(async()=>{msg='';await alEntrar();draw()}).catch(e=>{msg=e.message&&!e.status?e.message:Nube.tr(e);draw()})}
 else if(a=='salir')cerrar()
 else if(a=='usr-edit'){eu=(Nube.perfil&&Nube.perfil.usuario)||'';msg='';draw();const i=$('#us');if(i){i.focus();i.select()}}
 else if(a=='usr-cancel'){eu=null;msg='';draw()}
 else if(a=='usr-save'){const v=nu($('#us').value);
  if(!UOK.test(v)){eu=v;msg=UMSG;draw();return}
  if(v==Nube.perfil.usuario){eu=null;msg='';draw();return}
  eu=v;msg='Un momento…';draw();
  Nube.guardarUsuario(v).then(()=>{eu=null;msg='Usuario cambiado.';draw()}).catch(e=>{msg=e.message&&!e.status?e.message:Nube.tr(e);draw()})}
 else if(a=='am-ver')verAmigo(b.dataset.u)
 else if(a=='nm-edit'){en=true;draw();const i=$('#nm');if(i){i.focus();i.select()}}
 else if(a=='nm-cancel'){en=false;draw()}
 else if(a=='nm-save'){const v=$('#nm').value.trim().slice(0,20);if(v){S.me.n=v;sv();if(Nube.user)Nube.guardarNombre(v)}en=false;draw()}
 else if(a=='bl-ask'){blq=b.dataset.u;draw()}
 else if(a=='bl-no'){blq=null;draw()}
 else if(a=='bl-si')accion(Nube.bloquear(b.dataset.u).then(()=>{BL=null}),'Usuario bloqueado.',1)
 else if(a=='bl-un'){msg='Un momento…';draw();
  Nube.desbloquear(b.dataset.u).then(()=>Promise.all([Nube.bloqueados(),Nube.amistades()])).then(([l,am])=>{BL=l;AM=am;fr=undefined;msg='Usuario desbloqueado.'}).catch(e=>{console.warn(e);msg=em(e)}).then(()=>draw())}
 else if(a=='rk-tab'){RK.tab=b.dataset.v;RK[RK.tab]=null;draw();cargarRanking()}
 else if(a=='rk-d'){const n=RK.d+ +b.dataset.v;if(n<1||n>DAY)return;RK.d=n;RK.dia=null;draw();cargarRanking()}
 else if(a=='am-buscar'){const v=nu($('#fq').value);fq=v;fr=undefined;
  if(!UOK.test(v)){msg=UMSG;draw();return}
  msg='Buscando…';draw();Nube.buscarUsuario(v).then(r=>{msg='';fr=r;draw()}).catch(e=>{console.warn(e);msg=em(e);draw()})}
 else if(a=='am-add')accion(Nube.solicitar(b.dataset.u),r=>{fr=undefined;fq='';return r=='aceptada'?'¡Ya sois amigos!':'Solicitud enviada.'})
 else if(a=='am-ok')accion(Nube.responder(b.dataset.u,true),()=>{fr=undefined;return 'Ya sois amigos.'})
 else if(a=='am-no')accion(Nube.responder(b.dataset.u,false),'Solicitud rechazada.')
 else if(a=='am-can')accion(Nube.quitar(b.dataset.u),'Solicitud cancelada.')
 else if(a=='am-del'){cfm=b.dataset.u;draw()}
 else if(a=='am-del-no'){cfm=null;draw()}
 else if(a=='am-del-si')accion(Nube.quitar(b.dataset.u),'Amigo eliminado.',1)
 else if(a=='reset'){ask=true;draw()}
 else if(a=='reset-no'){ask=false;draw()}
 else if(a=='reset-si'){const hecho=()=>{S={res:{},pr:{},me:S.me,set:S.set,uid:S.uid};ask=false;msg='';sv();draw()};
  if(Nube.user){msg='Borrando…';draw();Nube.borrarResultados().then(hecho).catch(e=>{console.warn(e);ask=false;msg='No se han podido borrar tus resultados de la cuenta. Inténtalo de nuevo.';draw()})}else hecho()}
 else if(a=='vis'){if(Nube.user){const o=S.me.v,v=b.dataset.v;if(v==o)return;S.me.v=v;sv();msg='';draw();
   Nube.guardarPrivacidad(v).catch(e=>{console.warn(e);S.me.v=o;sv();msg='No se ha podido guardar la privacidad. Inténtalo de nuevo.';draw()})}else draw()}
 else if(g){if(a=='k'){g.onKey&&g.onKey(b.dataset.k)}else if(g.actions&&g.actions[a])g.actions[a](b)}};
$('#app').oninput=e=>{if(e.target.id=='fq')fq=e.target.value};
$('#app').onkeydown=e=>{if(e.target.id=='nm'){if(e.key=='Enter'){e.preventDefault();$('[data-a=nm-save]').click()}else if(e.key=='Escape'){$('[data-a=nm-cancel]').click()}return}
 if(e.key=='Enter'&&e.target.id=='fq'){e.preventDefault();const b=$('[data-a=am-buscar]');b&&b.click();return}
 if(e.key=='Enter'&&e.target.id=='us'){e.preventDefault();const b=$('[data-a=usr-save]');b&&b.click()}};
addEventListener('keydown',e=>{
 const g=cur();if(!g||!g.onKey)return;
 if(e.ctrlKey||e.metaKey||e.altKey||(e.target.tagName=='BUTTON'&&(e.key=='Enter'||e.key==' ')))return;
 const k=e.key,m=k=='Enter'?'Enter':k=='Backspace'||k=='Delete'?'Del':k.length==1&&/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(k)?nz(k):g.digits&&/^[0-9]$/.test(k)?k:null;
 if(m){e.preventDefault();g.onKey(m)}});
(async()=>{
 if(Nube.activo){
  $('#app').innerHTML='<p class="sub">Cargando el reto de hoy…</p>';
  try{await Nube.init();const r=await Nube.reto(DAY);if(!r)throw new Error('sin-reto');
   Content.setHoy({p:r.palabra,f:r.frase,a:r.autor});await alEntrar()}
  catch(e){console.error(e);$('#app').innerHTML=`<h1>Daily Arcade</h1><p class="sub">${e.message=='sin-reto'?'Hoy todavía no hay reto. Vuelve en un rato.':'No se ha podido conectar. Inténtalo de nuevo.'}</p>${e.message=='sin-reto'?'':`<p class="foot">Detalle técnico: ${esc(String(e.message||e))}</p>`}<button class="btn pri" onclick="location.reload()">Reintentar</button>`;return}}
 addEventListener('online',()=>{Nube.subirTodo(S,DAY,IDS()).catch(()=>{})}); /* reintenta lo que no se pudo subir sin conexión */
 setInterval(tick,1000);theme();draw();
 if(Nube.user)cargarAmigos()})();
