/* Juego: Tuberías — une cada pareja de puntos del mismo color con un camino, sin que se crucen
   y rellenando TODO el tablero 6×6.
   El reto sale de la fecha y siempre tiene solución: primero se traza un camino que recorre todo el
   tablero, se corta en tramos (uno por color) y después se colocan los extremos de cada tramo.
   La victoria se comprueba solo con las reglas (parejas unidas, casillas llenas), no con una solución guardada. */
(function(){
const N=6,T=N*N,K=[7,5,5,6,6,6,7][WD]; // colores (parejas): domingo y sábado, los más difíciles
const COL=['#E5484D','#3E6FE0','#F6B73C','#2FA36B','#9B6BE8','#F28B30','#22B8CF','#E879B9'],LET='ABCDEFGH';
const vec=i=>{const x=i%N,y=i/N|0,o=[];if(y>0)o.push(i-N);if(y<N-1)o.push(i+N);if(x>0)o.push(i-1);if(x<N-1)o.push(i+1);return o};
const ady=(a,b)=>Math.abs((a%N)-(b%N))+Math.abs((a/N|0)-(b/N|0))==1;

/* Camino que recorre todo el tablero (método "backbite", con semilla). */
function hamilton(r){
 let c=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)c.push(y*N+(y%2?N-1-x:x));
 for(let t=0;t<3000;t++){
  const fin=r()<.5;if(!fin)c.reverse();
  const h=c[c.length-1],ant=c[c.length-2],cand=vec(h).filter(v=>v!=ant),n=cand[Math.floor(r()*cand.length)],k=c.indexOf(n);
  c=c.slice(0,k+1).concat(c.slice(k+1).reverse());
  if(!fin)c.reverse()}
 return c}

function gen(){
 const r=rng(DAY*41+9),cam=hamilton(r),L=Array(K).fill(3);
 for(let q=T-3*K;q>0;q--)L[Math.floor(r()*K)]++;           // longitudes de los tramos (mínimo 3 casillas)
 const tr=[];let i=0;
 L.forEach(l=>{tr.push(cam.slice(i,i+l));i+=l});
 shuf(tr,r); // los colores se reparten al azar entre los tramos; los extremos de cada tramo son los puntos de ese color
 return{pares:tr.map(x=>[x[0],x[x.length-1]])}}
let _p;const P=()=>_p=_p||gen();

/* extremo[i] = color del punto que hay en la casilla i (o -1) */
const extremos=()=>{const e=Array(T).fill(-1);P().pares.forEach(([a,b],c)=>{e[a]=c;e[b]=c});return e};
let _e;const EX=()=>_e=_e||extremos();

const ini=p=>{if(!Array.isArray(p.t)||p.t.length!=K)p.t=Array.from({length:K},()=>[])};
/* dueño[i] = color cuyo camino pasa por la casilla i (o -1). Los puntos siempre son de su color. */
function duenos(t){const d=EX().slice();t.forEach((c,k)=>c.forEach(i=>{d[i]=k}));return d}
const unido=(t,c)=>{const x=t[c],[a,b]=P().pares[c];return x.length>1&&((x[0]==a&&x[x.length-1]==b)||(x[0]==b&&x[x.length-1]==a))};
const gana=t=>t.every((_,c)=>unido(t,c))&&duenos(t).every(v=>v>=0);

/* Mueve el camino del color c hasta la casilla i. Devuelve true si algo cambió. */
function mover(t,c,i){
 const x=t[c],[a,b]=P().pares[c],ex=EX();
 if(!x.length)return false;
 const h=x[x.length-1];
 if(h==i)return false;
 const k=x.indexOf(i);
 if(k>=0){x.length=k+1;return true}                       // volver atrás
 if(!ady(h,i))return false;
 if(unido(t,c))return false;                               // ya está unido: para seguir hay que retroceder
 if(ex[i]>=0&&ex[i]!=c)return false;                       // no se puede pisar el punto de otro color
 if(ex[i]==c&&i!=x[0]&&i!=a&&i!=b)return false;
 // si la casilla es de otro camino, ese camino se corta desde ahí hasta su final
 t.forEach((y,d)=>{if(d!=c){const q=y.indexOf(i);if(q>=0)y.length=q}});
 x.push(i);return true}

function hacia(t,c,i){
 let ch=false;
 for(let g=0;g<N*2;g++){
  const x=t[c];if(!x.length)break;
  const h=x[x.length-1];
  if(h==i)break;
  if(ady(h,i)||x.includes(i)){if(mover(t,c,i))ch=true;break}
  const dx=(i%N)-(h%N),dy=(i/N|0)-(h/N|0),s=Math.abs(dx)>=Math.abs(dy)?h+Math.sign(dx):h+Math.sign(dy)*N;
  if(x.includes(s)||!mover(t,c,s))break;ch=true}
 return ch}

function svgTablero(t,dis){
 const d=duenos(t),ex=EX();
 let s=`<svg viewBox="0 0 ${N} ${N}" role="img" aria-label="Tablero de Tuberías de 6 por 6. ${t.filter((_,c)=>unido(t,c)).length} de ${K} parejas unidas." style="display:block;width:100%;height:auto">`;
 for(let i=0;i<T;i++){
  const v=d[i];
  s+=`<rect x="${i%N}" y="${i/N|0}" width="1" height="1" style="fill:${v>=0?`color-mix(in srgb,${COL[v]} 20%,var(--card))`:'var(--card)'};stroke:var(--line);stroke-width:.03"/>`}
 t.forEach((x,c)=>{
  if(x.length>1)s+=`<polyline points="${x.map(i=>(i%N+.5)+','+((i/N|0)+.5)).join(' ')}" fill="none" style="stroke:${COL[c]};stroke-width:.36;stroke-linecap:round;stroke-linejoin:round"/>`});
 P().pares.forEach(([a,b],c)=>[a,b].forEach(i=>{
  s+=`<circle cx="${i%N+.5}" cy="${(i/N|0)+.5}" r=".31" style="fill:${COL[c]};stroke:var(--ink);stroke-width:.04"/>`
   +`<text x="${i%N+.5}" y="${(i/N|0)+.5}" text-anchor="middle" dominant-baseline="central" style="fill:#14213D;font:800 .3px 'Bricolage Grotesque',system-ui,sans-serif">${LET[c]}</text>`}));
 return s+'</svg>'}

const llenas=t=>duenos(t).filter(v=>v>=0).length;
function pinta(){
 const p=prog('t');ini(p);
 const b=$('#tbb');if(b)b.innerHTML=svgTablero(p.t);
 const c=$('#tbc');if(c)c.textContent=info(p.t)}
const info=t=>`${t.filter((_,c)=>unido(t,c)).length} / ${K} parejas · ${llenas(t)} / ${T} casillas`;

function tuberias(){
 const p=prog('t');ini(p);const r=R('tuberias');
 let b=`<div id="tbb" class="cm" data-b="tuberias" style="${r?'':'touch-action:none;'}max-width:372px;margin:12px auto;border:3px solid var(--ink);border-radius:10px;overflow:hidden;user-select:none;-webkit-user-select:none">${svgTablero(p.t,!!r)}</div>`;
 if(r)b+=res(`¡Tuberías unidas en ${mmss(r.t)}!`,`Las ${K} parejas están unidas y el tablero está lleno. Vuelve mañana para un reto nuevo.`,`Daily Arcade · Tuberías #${DAY} · 6×6 · ${K} colores · ${mmss(r.t)}`);
 else b+=`${S.set.tm?`<p class="tm" id="tm">${p.t0?mmss(Date.now()-p.t0):'0:00'}</p>`:''}<p class="cap" id="tbc" style="text-align:center;margin:0">${info(p.t)}</p><p class="msg" role="status">${msg}</p><div class="row" style="justify-content:center"><button class="btn" data-a="undo">Deshacer</button><button class="btn" data-a="reiniciar">Reiniciar</button></div><p class="foot" style="margin-top:8px;text-align:center">Arrastra desde un punto. Si cruzas otro camino, lo cortas.</p>`;
 return shell('Tuberías',b)}

/* ----- Interacción con el puntero ----- */
let act=null,drag=false,snap=null; // act: color activo (se puede seguir tocando casillas contiguas); snap: copia para Deshacer
const casilla=(e,el)=>{const q=el.getBoundingClientRect(),x=Math.floor((e.clientX-q.left)/q.width*N),y=Math.floor((e.clientY-q.top)/q.height*N);return x<0||y<0||x>=N||y>=N?-1:y*N+x};
const copia=t=>t.map(x=>x.slice());
function final(p){
 if(!R('tuberias')&&gana(p.t)){fin('tuberias',{st:'completed',t:Date.now()-p.t0,k:K});sv();draw();return true}
 return false}
const A=$('#app');
A.addEventListener('pointerdown',e=>{
 if(V!='tuberias'||R('tuberias'))return;
 const b=e.target.closest('#tbb');if(!b)return;
 const i=casilla(e,b);if(i<0)return;
 const p=prog('t');ini(p);e.preventDefault();
 try{b.setPointerCapture(e.pointerId)}catch(x){}
 p.t0=p.t0||Date.now();msg='';
 const antes=copia(p.t),ex=EX(),d=duenos(p.t)[i];
 let c=null;
 if(ex[i]>=0){c=ex[i];p.t[c]=[i]}                          // punto: se empieza (o recomienza) desde él
 else if(d>=0){c=d;const k=p.t[c].indexOf(i);p.t[c].length=k+1} // casilla de un camino: se corta ahí y se sigue
 else if(act!=null&&p.t[act].length&&!unido(p.t,act)&&ady(p.t[act][p.t[act].length-1],i)){c=act;mover(p.t,c,i)} // tocar contigua al camino activo
 if(c==null){act=null;pinta();return}
 act=c;drag=true;snap=antes;
 if(!final(p)){sv();pinta()}});
A.addEventListener('pointermove',e=>{
 if(!drag||act==null||V!='tuberias'||R('tuberias'))return;
 const b=e.target.closest('#tbb');if(!b)return;
 const i=casilla(e,b);if(i<0)return;
 const p=prog('t');ini(p);
 if(hacia(p.t,act,i)){if(!final(p))pinta()}});
const suelta=()=>{
 if(!drag)return;drag=false;
 if(V!='tuberias'||R('tuberias'))return;
 const p=prog('t');ini(p);
 if(snap&&JSON.stringify(snap)!=JSON.stringify(p.t)){(p.u=p.u||[]).push(snap);if(p.u.length>40)p.u.shift()}
 snap=null;sv();pinta()};
A.addEventListener('pointerup',suelta);A.addEventListener('pointercancel',suelta);

function undo(){
 const p=prog('t');ini(p);
 if(R('tuberias')||!(p.u&&p.u.length))return;
 p.t=p.u.pop();act=null;msg='';sv();draw()}
function reiniciar(){
 const p=prog('t');ini(p);
 if(R('tuberias'))return;
 if(p.t.some(x=>x.length)){(p.u=p.u||[]).push(copia(p.t))}
 p.t=Array.from({length:K},()=>[]);act=null;msg='';sv();draw()}

DailyArcade.register({
 id:'tuberias',name:'Tuberías',desc:'Une las parejas de puntos del mismo color y rellena todo el tablero.',color:'--aqua',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h7a5 5 0 0 1 5 5v7"/><path d="M4 4.5v7M12.5 20h7"/></svg>',
 how:["Une cada pareja de puntos del <b>mismo color</b> con un camino.","Los caminos <b>no pueden cruzarse</b> y entre todos tienen que <b>rellenar el tablero</b>.","Arrastra desde un punto. Si pasas por otro camino, lo cortas. Las letras ayudan a distinguir los colores."],
 demo:(()=>{const c=[[0,1,2],[3,6,7],[4,5,8]],cl=['#E5484D','#3E6FE0','#2FA36B'],ex=[[0,2],[3,7],[4,8]];let s=`<svg viewBox="0 0 3 3" style="display:block;width:120px;margin:6px auto;border:3px solid var(--ink);border-radius:8px">`;
  for(let i=0;i<9;i++)s+=`<rect x="${i%3}" y="${i/3|0}" width="1" height="1" style="fill:var(--card);stroke:var(--line);stroke-width:.03"/>`;
  c.forEach((x,k)=>{s+=`<polyline points="${x.map(i=>(i%3+.5)+','+((i/3|0)+.5)).join(' ')}" fill="none" style="stroke:${cl[k]};stroke-width:.32;stroke-linecap:round;stroke-linejoin:round"/>`});
  ex.forEach((e,k)=>e.forEach(i=>{s+=`<circle cx="${i%3+.5}" cy="${(i/3|0)+.5}" r=".3" style="fill:${cl[k]};stroke:var(--ink);stroke-width:.04"/>`}));
  return `<p class="cap">Ejemplo en 3×3: tres parejas unidas y ninguna casilla vacía.</p>${s}</svg>`})(),
 pk:'t',
 winLabel:'completadas',
 winStreak:false,       // no se puede perder: solo se completa
 render:tuberias,
 actions:{undo,reiniciar},
 status:(r,p)=>r?`Completada · ${mmss(r.t)}`:(p&&p.t0?'En curso':'Sin jugar'),
 stats:(e,w)=>w.length?kpi([[mmss(Math.min(...w.map(x=>x.t))),'mejor tiempo'],[mmss(avg(w.map(x=>x.t))),'tiempo medio']]):''
});
})();
