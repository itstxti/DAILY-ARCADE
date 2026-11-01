/* Juego: Luces — tablero 5×5 de casillas encendidas. Al pulsar una se invierten ella y sus vecinas
   (arriba, abajo, izquierda y derecha). Hay que apagarlas todas con las menos pulsaciones posibles.
   El reto sale de la fecha y siempre tiene solución: se parte del tablero apagado y se aplican pulsaciones.
   El mínimo de pulsaciones se calcula resolviendo el sistema de ecuaciones módulo 2 (y mirando sus 4 soluciones).
   La victoria se comprueba por reglas: todas apagadas. */
(function(){
const N=5,T=N*N;
const MIN_DIA=[10,5,5,7,7,8,9][WD]; // mínimo de pulsaciones buscado: lunes y martes, el más fácil
const bits=m=>{let c=0;for(;m;m&=m-1)c++;return c};

/* EF[j] = máscara de las luces que cambian al pulsar j. */
const EF=Array.from({length:T},(_,j)=>{
 const x=j%N,y=j/N|0;let m=1<<j;
 if(x>0)m|=1<<(j-1);if(x<N-1)m|=1<<(j+1);if(y>0)m|=1<<(j-N);if(y<N-1)m|=1<<(j+N);
 return m});
/* Como el efecto es simétrico, la fila i de la matriz del sistema es EF[i]. */

/* Mejor solución (menos pulsaciones) para un tablero b (máscara). Devuelve la máscara de pulsaciones o null si no tiene solución. */
function resolver(b){
 const rows=EF.map((m,i)=>m|(((b>>i)&1)<<T));
 const piv=[],libres=[];let r=0;
 for(let c=0;c<T;c++){
  let k=-1;for(let i=r;i<T;i++)if((rows[i]>>c)&1){k=i;break}
  if(k<0){libres.push(c);continue}
  [rows[r],rows[k]]=[rows[k],rows[r]];
  for(let i=0;i<T;i++)if(i!=r&&((rows[i]>>c)&1))rows[i]^=rows[r];
  piv.push(c);r++}
 for(let i=r;i<T;i++)if((rows[i]>>T)&1)return null;       // sin solución
 let x=0;for(let k=0;k<r;k++)if((rows[k]>>T)&1)x|=1<<piv[k];
 const nulos=libres.map(f=>{let v=1<<f;for(let k=0;k<r;k++)if((rows[k]>>f)&1)v|=1<<piv[k];return v});
 let mejor=x;
 for(let s=1;s<(1<<nulos.length);s++){let y=x;nulos.forEach((v,q)=>{if((s>>q)&1)y^=v});if(bits(y)<bits(mejor))mejor=y}
 return mejor}

const aplica=(b,j)=>b^EF[j];
function gen(){
 const r=rng(DAY*37+5);let ult=null;
 for(let t=0;t<600;t++){
  const k=MIN_DIA+Math.floor(r()*4),orden=shuf([...Array(T).keys()],r).slice(0,Math.min(T,k));
  let b=0;orden.forEach(j=>{b=aplica(b,j)});
  if(!b)continue;
  const sol=resolver(b),min=bits(sol);
  ult={ini:b,min};
  if(min>=MIN_DIA)return ult}
 return ult||{ini:EF[12],min:1}}
let _p;const P=()=>_p=_p||gen();

/* Tablero actual: se parte del inicial y se aplican las pulsaciones (p.m). */
const ini=p=>{if(!Array.isArray(p.m)){p.m=[];p.n=0;p.h=0}};
const estado=p=>{let b=P().ini;p.m.forEach(j=>{b=aplica(b,j)});return b};
const pl=(n,a,b)=>n==1?a:b;

function luces(){
 const p=prog('l');ini(p);
 const r=R('luces'),Z=P(),b=r?0:estado(p),on=bits(b);
 let z='';
 for(let i=0;i<T;i++){
  const x=i%N,y=i/N|0,e=(b>>i)&1;
  z+=`<button class="lz${e?' on':''}${!r&&p.pi===i?' pista':''}" data-a="lz" data-i="${i}"${r?' disabled':''} aria-pressed="${!!e}" aria-label="Fila ${y+1}, columna ${x+1}, ${e?'encendida':'apagada'}"></button>`}
 let h=`<div class="lzb" role="group" aria-label="Tablero de luces de 5 por 5">${z}</div>`;
 if(r){
  const ex=r.n-r.par;
  h+=res(`¡Todas apagadas en ${r.n} ${pl(r.n,'pulsación','pulsaciones')}!`,ex<=0&&!r.h?`Es el mínimo posible (${r.par}). Tiempo: ${mmss(r.t)}.`:`El mínimo era ${r.par}${ex>0?` (${ex} de más)`:''}. Tiempo: ${mmss(r.t)}.`,
   `Daily Arcade · Luces #${DAY} · ${r.n}/${r.par} pulsaciones${r.h?' · '+r.h+pl(r.h,' pista',' pistas'):''} · ${mmss(r.t)}`)}
 else h+=`${S.set.tm?`<p class="tm" id="tm">${p.t0?mmss(Date.now()-p.t0):'0:00'}</p>`:''}<p class="cap" style="text-align:center;margin:0">${on} ${pl(on,'luz encendida','luces encendidas')} · ${p.n} ${pl(p.n,'pulsación','pulsaciones')}</p><p class="msg" role="status">${msg}</p><div class="row" style="justify-content:center"><button class="btn" data-a="reiniciar">Reiniciar</button><button class="btn" data-a="pista">Pista</button></div><p class="foot" style="margin-top:8px;text-align:center">Al reiniciar, las pulsaciones y el tiempo siguen contando.</p>`;
 return shell('Luces',h)}

function lz(b){
 const p=prog('l');ini(p);
 if(R('luces'))return;
 const j=+b.dataset.i;p.t0=p.t0||Date.now();
 p.m.push(j);p.n++;p.pi=null;msg='';
 if(!estado(p))fin('luces',{st:'completed',n:p.n,par:P().min,h:p.h||0,t:Date.now()-p.t0});
 sv();draw()}

function reiniciar(){
 const p=prog('l');ini(p);
 if(R('luces')||!p.m.length)return;
 p.m=[];p.pi=null;msg='';sv();draw()}      // el contador de pulsaciones y el tiempo no se reinician

function pista(){
 const p=prog('l');ini(p);
 if(R('luces'))return;
 const s=resolver(estado(p));if(s==null||!s)return;
 const c=[];for(let j=0;j<T;j++)if((s>>j)&1)c.push(j);
 p.t0=p.t0||Date.now();p.h=(p.h||0)+1;
 p.pi=c.find(j=>j!=p.pi)??c[0];
 msg=`Pista: pulsa la casilla marcada (quedan ${c.length} ${pl(c.length,'pulsación','pulsaciones')} como mínimo desde aquí).`;
 sv();draw()}

DailyArcade.register({
 id:'luces',name:'Luces',desc:'Apaga todas las luces con las menos pulsaciones posibles.',color:'--sun',icon:'☼',
 how:["Apaga <b>todas las luces</b> del tablero.","Al pulsar una casilla se invierten <b>ella y sus vecinas</b> (arriba, abajo, izquierda y derecha).","Cuenta cada pulsación: intenta acercarte al <b>mínimo</b>. Pulsar dos veces la misma casilla la deja como estaba."],
 demo:(()=>{const e=[0,1,0,1,1,1,0,1,0];return `<p class="cap">Al pulsar la casilla del centro se invierten las casillas en amarillo:</p><div class="lzb" style="grid-template-columns:repeat(3,1fr);width:120px;gap:3px">${e.map(v=>`<span class="lz${v?' on':''}"></span>`).join('')}</div>`})(),
 pk:'l',
 winLabel:'completadas',
 winStreak:false,       // no se puede perder: solo se completa
 render:luces,
 actions:{lz,reiniciar,pista},
 status:(r,p)=>r?`Completada · ${r.n}/${r.par} pulsaciones · ${mmss(r.t)}`:(p&&p.t0?'En curso':'Sin jugar'),
 stats:(e,w)=>w.length?kpi([[mmss(Math.min(...w.map(x=>x.t))),'mejor tiempo'],[w.filter(x=>x.n==x.par&&!x.h).length,'en el mínimo'],[avg(w.map(x=>x.n-x.par)).toFixed(1),'pulsaciones de más']]):''
});
})();
