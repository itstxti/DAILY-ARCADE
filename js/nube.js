/* Daily Arcade · conexión con Supabase: cuentas, rol y reto del día. */
const Nube=(()=>{
 const activo=!!(window.SUPABASE_URL&&window.SUPABASE_ANON_KEY);
 const sb=activo&&window.supabase?window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY):null;
 const N={activo,sb,user:null,perfil:null};
 const TR={'Invalid login credentials':'Usuario, correo o contraseña incorrectos.','User already registered':'Ese correo ya tiene una cuenta.','Email not confirmed':'Confirma tu correo antes de entrar.'};
 N.tr=e=>TR[e.message]||(/at least 6/.test(e.message)?'La contraseña necesita al menos 6 caracteres.':/valid email|invalid format/i.test(e.message)?'Escribe un correo válido.':e.message||'Ha ocurrido un error.');
 N.init=async()=>{if(!sb)throw new Error('No se ha cargado la librería de Supabase (revisa tu conexión a internet).');const{data}=await sb.auth.getSession();N.user=data.session?data.session.user:null;N.perfil=null;
  if(N.user){let r;
   for(const c of ['nombre,rol,usuario,privacidad','nombre,rol,usuario','nombre,rol']){ /* por si aún no se han ejecutado los últimos SQL */
    r=await sb.from('profiles').select(c).eq('id',N.user.id).maybeSingle();if(!r.error)break}
   N.perfil=r.data}};
 N.entrarCon=async(id,password)=>{id=String(id).trim();
 if(!id)throw{message:'Escribe tu correo o tu usuario.'};
 if(id.includes('@'))return N.entrar(id,password);
 /* Con @usuario, el login lo hace la Edge Function «login» (supabase/functions/login): el correo no sale del servidor. */
 const{data,error}=await sb.functions.invoke('login',{body:{id,password}});
 if(error){const r=error.context,j=r&&r.json?await r.json().catch(()=>({})):{};
  throw{message:j.error=='rate'?'Demasiados intentos. Espera un minuto e inténtalo de nuevo.':j.error=='unconfirmed'?'Confirma tu correo antes de entrar.':j.error=='invalid'?'Usuario, correo o contraseña incorrectos.':'No se ha podido conectar. Inténtalo de nuevo.'}}
 const{error:e2}=await sb.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});if(e2)throw e2;
 await N.init()};
N.entrar=async(email,password)=>{const{error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;await N.init()};
 /* Google: redirige a Google y vuelve a esta misma página; init() recoge la sesión al volver. Ver README (Entrar con Google). */
 N.entrarGoogle=async()=>{const{error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}});if(error)throw error};
 N.registrar=async(email,password,nombre,usuario)=>{const{data,error}=await sb.auth.signUp({email,password,options:{data:{nombre,usuario}}});if(error)throw error;await N.init();return !!data.session};
 N.salir=async()=>{await sb.auth.signOut();N.user=N.perfil=null};
 N.reto=async dia=>{const{data,error}=await sb.from('retos').select('palabra,frase,autor').eq('dia',dia).maybeSingle();if(error)throw error;return data};
 N.guardarNombre=async n=>{if(N.user)await sb.from('profiles').update({nombre:n}).eq('id',N.user.id)};
 N.libre=async u=>{if(!u)return true;const{data,error}=await sb.rpc('usuario_libre',{u});if(error)throw error;return data!==false};
 N.guardarUsuario=async u=>{u=String(u).trim().toLowerCase().replace(/^@/,'');
  if(!/^[a-z0-9_]{3,15}$/.test(u))throw new Error('El usuario debe tener de 3 a 15 caracteres: minúsculas, números o _.');
  const{error}=await sb.from('profiles').update({usuario:u}).eq('id',N.user.id);
  if(error)throw new Error(error.code=='23505'?'Ese usuario ya está en uso.':N.tr(error));
  if(N.perfil)N.perfil.usuario=u;return u};
 N.guardarPrivacidad=async v=>{if(!['public','private'].includes(v))throw new Error('Opción no válida.');
  const{error}=await sb.from('profiles').update({privacidad:v}).eq('id',N.user.id);if(error)throw error;if(N.perfil)N.perfil.privacidad=v};

 /* ---------- Resultados en el servidor ----------
    Local: est.res[dia][juego]=datos. Servidor: tabla resultados (user_id, dia, juego, datos).
    Regla de fusión: lo que ya está en el servidor manda (un resultado enviado no se reescribe);
    lo que solo existe en este navegador se sube; lo que solo existe en el servidor se baja. */
 const eq=(a,b)=>a===b||(a&&b&&typeof a=='object'&&typeof b=='object'&&Array.isArray(a)==Array.isArray(b)&&Object.keys(a).length==Object.keys(b).length&&Object.keys(a).every(k=>eq(a[k],b[k]))); /* jsonb no conserva el orden de las claves */
 const JOK=/^[a-z0-9_]{1,20}$/,fila=(dia,juego,datos)=>({user_id:N.user.id,dia:+dia,juego,datos});
 const valida=(dia,juego,datos,hoy,ids)=>Number.isInteger(+dia)&&+dia>=1&&+dia<=hoy&&JOK.test(juego)&&(!ids||ids.includes(juego))&&datos&&typeof datos=='object'&&!Array.isArray(datos)&&JSON.stringify(datos).length<=4000;
 const subirFilas=async rows=>{for(let i=0;i<rows.length;i+=200){
  const{error}=await sb.from('resultados').upsert(rows.slice(i,i+200),{onConflict:'user_id,dia,juego',ignoreDuplicates:true});if(error)throw error}};
 const locales=(est,hoy,ids)=>{const o=[];Object.entries(est.res).forEach(([d,js])=>Object.entries(js||{}).forEach(([j,x])=>{if(valida(d,j,x,hoy,ids))o.push(fila(d,j,x))}));return o};
 /* Un resultado recién terminado. Si falla (sin conexión), se queda en local y se sube en la próxima sincronización. */
 N.guardarResultado=(dia,juego,datos)=>{if(!N.user||!sb||!valida(dia,juego,datos,1/0))return Promise.resolve();
  return subirFilas([fila(dia,juego,datos)]).catch(e=>console.warn('No se pudo guardar el resultado en el servidor; se reintentará.',e))};
 /* Descarga todos los resultados propios (de 1000 en 1000). */
 N.bajarResultados=async()=>{const out=[],T=1000;for(let d=0;;d+=T){
  const{data,error}=await sb.from('resultados').select('dia,juego,datos').order('dia').order('juego').range(d,d+T-1);if(error)throw error;
  out.push(...data);if(data.length<T)break}return out};
 /* Fusiona est (estado local) con el servidor. Devuelve true si el estado local ha cambiado. */
 N.sincronizar=async(est,hoy,ids)=>{if(!N.user)return false;
  const srv=await N.bajarResultados(),k=new Set();let cambio=false;
  srv.forEach(r=>{k.add(r.dia+'|'+r.juego);const cur=(est.res[r.dia]||{})[r.juego];
   if(!cur||!eq(cur,r.datos)){(est.res[r.dia]=est.res[r.dia]||{})[r.juego]=r.datos;cambio=true}});
  await subirFilas(locales(est,hoy,ids).filter(f=>!k.has(f.dia+'|'+f.juego)));
  return cambio};
 /* Antes de cerrar sesión: sube todo lo local sin descargar nada. Lanza error si no puede. */
 N.subirTodo=(est,hoy,ids)=>N.user?subirFilas(locales(est,hoy,ids)):Promise.resolve();
 N.borrarResultados=async()=>{const{error}=await sb.from('resultados').delete().eq('user_id',N.user.id);if(error)throw error};
 /* ---------- Amigos (todo pasa por funciones del servidor; ver supabase/migracion-02-amigos.sql) ---------- */
 N.buscarUsuario=async u=>{const{data,error}=await sb.rpc('buscar_usuario',{u});if(error)throw error;return data&&data[0]||null};
 N.solicitar=async u=>{const{data,error}=await sb.rpc('solicitar_amistad',{u});if(error)throw error;return data};
 N.responder=async(u,aceptar)=>{const{error}=await sb.rpc('responder_amistad',{u,aceptar});if(error)throw error};
 N.quitar=async u=>{const{error}=await sb.rpc('eliminar_amistad',{u});if(error)throw error};
 N.amistades=async()=>{const{data,error}=await sb.rpc('mis_amistades');if(error)throw error;return data||[]};
 N.rankingDia=async d=>{const{data,error}=await sb.rpc('ranking_dia',{d});if(error)throw error;return data||[]};
 N.rankingRachas=async()=>{const{data,error}=await sb.rpc('ranking_rachas');if(error)throw error;return data||[]};
 N.verPerfil=async u=>{const{data,error}=await sb.rpc('ver_perfil',{u});if(error)throw error;return data};
 N.bloquear=async u=>{const{error}=await sb.rpc('bloquear_usuario',{u});if(error)throw error};
 N.desbloquear=async u=>{const{error}=await sb.rpc('desbloquear_usuario',{u});if(error)throw error};
 N.bloqueados=async()=>{const{data,error}=await sb.rpc('mis_bloqueados');if(error)throw error;return data||[]};
 return N})();
