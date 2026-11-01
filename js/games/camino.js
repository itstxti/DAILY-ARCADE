/* Juego: Camino — traza una línea continua que pase por TODAS las casillas del tablero 6×6
   y toque los puntos numerados en orden (1, 2, 3…). El último número es el final del camino.
   El reto sale de la fecha y siempre tiene solución: se traza primero un camino que recorre todo
   el tablero y después se colocan los números a lo largo de él.
   La victoria se comprueba solo con las reglas (casillas, orden, final), no con una solución guardada. */
(function(){
const N=6,T=N*N,NS=[5,9,9,8,8,7,6][WD]; // cantidad de números: más números = más fácil (domingo, el más difícil)
const vec=i=>{const x=i%N,y=i/N|0,o=[];if(y>0)o.push(i-N);if(y<N-1)o.push(i+N);if(x>0)o.push(i-1);if(x<N-1)o.push(i+1);return o};
const ady=(a,b)=>Math.abs((a%N)-(b%N))+Math.abs((a/N|0)-(b/N|0))==1;

/* Camino hamiltoniano al azar (con semilla) por el método "backbite":
   se parte de una serpiente y se dan muchas vueltas a trozos del camino. */
function hamilton(r){
 let c=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)c.push(y*N+(y%2?N-1-x:x));
 for(let t=0;t<3000;t++){
  const fin=r()<.5;if(!fin)c.reverse();
  const h=c[c.length-1],ant=c[c.length-2],cand=vec(h).filter(v=>v!=ant),n=cand[Math.floor(r()*cand.length)],k=c.indexOf(n);
  c=c.slice(0,k+1).concat(c.slice(k+1).reverse());
  if(!fin)c.reverse()}
 return c}

function gen(){
 const r=rng(DAY*31+7),cam=hamilton(r),pos=[0,T-1];
 // números repartidos a lo largo del camino, con algo de desorden pero sin amontonarse
 for(let i=1;i<NS-1;i++){const base=i*(T-1)/(NS-1),p=Math.max(1,Math.min(T-2,Math.round(base+(r()-.5)*2)));if(!pos.includes(p))pos.push(p)}
 pos.sort((a,b)=>a-b);
 return{nums:pos.map(p=>cam[p])} // nums[k] = casilla del número k+1
}
let _p;const P=()=>_p=_p||gen();

const ini=p=>{if(!Array.isArray(p.c))p.c=[]};
const num=i=>P().nums.indexOf(i)+1; // 0 si la casilla no lleva número
/* Siguiente número que hay que tocar según lo recorrido hasta ahora. */
const sig=c=>{let k=0;for(const i of c){const n=num(i);if(n)k=n}return k+1};
const NS_=()=>P().nums.length;
const completo=c=>c.length==T&&c[c.length-1]==P().nums[NS_()-1]&&new Set(c).size==T;

/* Intenta avanzar (o retroceder) hasta la casilla i. Devuelve true si el camino cambió. */
function paso(p,i){
 const c=p.c;
 if(!c.length){if(num(i)==1){c.push(i);return true}msg='Empieza por el número 1.';return false}
 const h=c[c.length-1];
 if(i==h)return false;
 const k=c.indexOf(i);
 if(k>=0){c.length=k+1;msg='';return true}                        // volver atrás sobre tu camino
 if(!ady(h,i))return false;
 if(num(h)==NS_()){msg='El último número es el final del camino.';return false}
 const n=num(i);
 if(n&&n!=sig(c)){msg=`Primero tienes que pasar por el ${sig(c)}.`;return false}
 c.push(i);msg='';return true}

/* Avanza hacia la casilla i de una en una (por si el dedo va rápido y salta casillas). */
function hacia(p,i){
 let ch=false;
 for(let g=0;g<N*2;g++){
  if(!p.c.length){if(paso(p,i))ch=true;break}
  const h=p.c[p.c.length-1];
  if(h==i||p.c.includes(i)){if(paso(p,i))ch=true;break}
  if(ady(h,i)){if(paso(p,i))ch=true;break}
  const dx=(i%N)-(h%N),dy=(i/N|0)-(h/N|0),s=Math.abs(dx)>=Math.abs(dy)?h+Math.sign(dx):h+Math.sign(dy)*N;
  if(p.c.includes(s)||!paso(p,s))break;ch=true}
 return ch}

const col=()=>'var(--sky)';
function svgTablero(c,dis,mini){
 const Z=P(),n=Z.nums.length,k=sig(c)-1,vis=new Set(c);
 let s=`<svg viewBox="0 0 ${N} ${N}" role="img" aria-label="Tablero de Camino de 6 por 6. ${c.length} de ${T} casillas recorridas." style="display:block;width:100%;height:auto">`;
 for(let i=0;i<T;i++)s+=`<rect x="${i%N}" y="${i/N|0}" width="1" height="1" style="fill:${vis.has(i)?'color-mix(in srgb,var(--sky) 22%,var(--card))':'var(--card)'};stroke:var(--line);stroke-width:.03"/>`;
 if(c.length>1)s+=`<polyline points="${c.map(i=>(i%N+.5)+','+((i/N|0)+.5)).join(' ')}" fill="none" style="stroke:${col()};stroke-width:.34;stroke-linecap:round;stroke-linejoin:round"/>`;
 else if(c.length==1)s+=`<circle cx="${c[0]%N+.5}" cy="${(c[0]/N|0)+.5}" r=".17" style="fill:${col()}"/>`;
 Z.nums.forEach((i,j)=>{
  const hecho=j<k,prox=j==k&&!dis;
  s+=`<circle cx="${i%N+.5}" cy="${(i/N|0)+.5}" r=".3" style="fill:${hecho?'var(--card)':'var(--ink)'};stroke:${prox?'var(--sun)':'var(--ink)'};stroke-width:${prox?.09:.05}"/>`
   +`<text x="${i%N+.5}" y="${(i/N|0)+.5}" text-anchor="middle" dominant-baseline="central" style="fill:${hecho?'var(--ink)':'var(--bg)'};font:800 .36px 'Bricolage Grotesque',system-ui,sans-serif">${j+1}</text>`});
 return s+'</svg>'}

function pinta(){
 const p=prog('c');ini(p);
 const b=$('#cmb');if(b)b.innerHTML=svgTablero(p.c,false);
 const t=$('#cmc');if(t)t.textContent=`${p.c.length} / ${T} casillas`;
 const m=$('#cmm');if(m)m.textContent=msg}

function camino(){
 const p=prog('c');ini(p);const r=R('camino'),Z=P();
 let b=`<div id="cmb" class="cm" data-b="camino" style="${r?'':'touch-action:none;'}max-width:372px;margin:12px auto;border:3px solid var(--ink);border-radius:10px;overflow:hidden;user-select:none;-webkit-user-select:none">${svgTablero(p.c,!!r)}</div>`;
 if(r)b+=res(`¡Camino completado en ${mmss(r.t)}!`,'Pasaste por las 36 casillas y por todos los números en orden. Vuelve mañana para un reto nuevo.',`Daily Arcade · Camino #${DAY} · 6×6 · ${mmss(r.t)}`);
 else b+=`${S.set.tm?`<p class="tm" id="tm">${p.t0?mmss(Date.now()-p.t0):'0:00'}</p>`:''}<p class="cap" id="cmc" style="text-align:center;margin:0">${p.c.length} / ${T} casillas</p><p class="msg" id="cmm" role="status">${msg}</p><div class="row" style="justify-content:center"><button class="btn" data-a="undo">Deshacer</button><button class="btn" data-a="reiniciar">Reiniciar</button></div><p class="foot" style="margin-top:8px;text-align:center">Arrastra desde el 1 (o toca casillas contiguas). También puedes usar las flechas.</p>`;
 return shell('Camino',b)}

/* ----- Interacción con el puntero ----- */
let arr=false;
const casilla=(e,el)=>{const q=el.getBoundingClientRect(),x=Math.floor((e.clientX-q.left)/q.width*N),y=Math.floor((e.clientY-q.top)/q.height*N);return x<0||y<0||x>=N||y>=N?-1:y*N+x};
function final(p){
 if(completo(p.c)&&!R('camino')){fin('camino',{st:'completed',t:Date.now()-p.t0,n:T});sv();draw();return true}
 return false}
const A=$('#app');
A.addEventListener('pointerdown',e=>{
 if(V!='camino'||R('camino'))return;
 const b=e.target.closest('#cmb');if(!b)return;
 const i=casilla(e,b);if(i<0)return;
 const p=prog('c');ini(p);e.preventDefault();
 try{b.setPointerCapture(e.pointerId)}catch(x){}
 arr=true;p.t0=p.t0||Date.now();
 if(!p.c.length||p.c.includes(i)||ady(p.c[p.c.length-1],i))hacia(p,i);else msg=p.c.length?'Sigue desde el final de tu camino.':'Empieza por el número 1.';
 if(!final(p)){sv();pinta()}});
A.addEventListener('pointermove',e=>{
 if(!arr||V!='camino'||R('camino'))return;
 const b=e.target.closest('#cmb');if(!b)return;
 const i=casilla(e,b);if(i<0)return;
 const p=prog('c');ini(p);
 if(hacia(p,i)){if(!final(p))pinta()}});
const suelta=()=>{if(!arr)return;arr=false;if(V=='camino'&&!R('camino'))sv()};
A.addEventListener('pointerup',suelta);A.addEventListener('pointercancel',suelta);

/* ----- Teclado: flechas (o WASD) extienden el camino desde su final ----- */
const DIR={ArrowUp:-N,ArrowDown:N,ArrowLeft:-1,ArrowRight:1,w:-N,s:N,a:-1,d:1};
function mover(m){
 if(R('camino'))return;
 const p=prog('c');ini(p);
 if(!p.c.length){p.t0=p.t0||Date.now();const s=P().nums[0];paso(p,s);sv();return draw()}
 const h=p.c[p.c.length-1],x=h%N,d=DIR[m];
 if((m=='ArrowLeft'||m=='a')&&x==0||(m=='ArrowRight'||m=='d')&&x==N-1)return;
 const i=h+d;if(i<0||i>=T)return;
 p.t0=p.t0||Date.now();
 const ok=paso(p,i);
 if(!ok){draw();return}
 if(!final(p)){sv();draw()}}
addEventListener('keydown',e=>{
 if(V!='camino'||R('camino')||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key.startsWith('Arrow')&&!(e.target.tagName=='INPUT')){e.preventDefault();mover(e.key)}});

function tecla(m){
 if(m=='Del')return undo();
 if('wasd'.includes(m)&&m.length==1)mover(m)}

function undo(){
 const p=prog('c');ini(p);
 if(R('camino')||!p.c.length)return;
 p.c.pop();msg='';sv();draw()}
function reiniciar(){
 const p=prog('c');ini(p);
 if(R('camino'))return;
 p.c=[];msg='';sv();draw()}

DailyArcade.register({
 id:'camino',name:'Camino',desc:'Traza una línea que pase por todas las casillas y por los números en orden.',color:'--sky',icon:'1→9',
 how:["Dibuja <b>una línea continua</b> que pase por <b>todas las casillas</b>.","Empieza en el <b>1</b> y pasa por los números <b>en orden</b>: el último es el final.","Arrastra el dedo o toca casillas contiguas. Para corregir, vuelve atrás sobre tu línea."],
 demo:(()=>{const c=[0,1,2,5,4,3,6,7,8],nm=[0,3,8];let s=`<svg viewBox="0 0 3 3" style="display:block;width:120px;margin:6px auto;border:3px solid var(--ink);border-radius:8px">`;
  for(let i=0;i<9;i++)s+=`<rect x="${i%3}" y="${i/3|0}" width="1" height="1" style="fill:color-mix(in srgb,var(--sky) 22%,var(--card));stroke:var(--line);stroke-width:.03"/>`;
  s+=`<polyline points="${c.map(i=>(i%3+.5)+','+((i/3|0)+.5)).join(' ')}" fill="none" style="stroke:var(--sky);stroke-width:.3;stroke-linecap:round;stroke-linejoin:round"/>`;
  nm.forEach((i,j)=>{s+=`<circle cx="${i%3+.5}" cy="${(i/3|0)+.5}" r=".3" style="fill:var(--ink)"/><text x="${i%3+.5}" y="${(i/3|0)+.5}" text-anchor="middle" dominant-baseline="central" style="fill:var(--bg);font:800 .36px sans-serif">${j+1}</text>`});
  return `<p class="cap">Ejemplo en 3×3: pasa por las 9 casillas y por el 1, el 2 y el 3 en orden.</p>${s}</svg>`})(),
 pk:'c',
 winLabel:'completados',
 winStreak:false,       // no se puede perder: solo se completa
 render:camino,
 onKey:tecla,
 actions:{undo,reiniciar},
 status:(r,p)=>r?`Completado · ${mmss(r.t)}`:(p&&p.t0?'En curso':'Sin jugar'),
 stats:(e,w)=>w.length?kpi([[mmss(Math.min(...w.map(x=>x.t))),'mejor tiempo'],[mmss(avg(w.map(x=>x.t))),'tiempo medio']]):''
});
})();
