/* Juego: Sopa de letras — en una cuadrícula 8×8 hay 6 palabras de 5 letras escondidas
   (en horizontal, vertical y diagonal). Hay que marcarlas todas.
   Las palabras salen de la fecha y de las listas que ya tiene la web (no carga nada nuevo):
   la lista de retos de Palabra si está disponible (modo local) o, si no, content/aceptadas.js.
   La palabra de Palabra de hoy se excluye para no desvelarla.
   Las palabras van de izquierda a derecha o de arriba abajo; se pueden marcar en cualquier sentido.
   La victoria se comprueba mirando las letras marcadas, no una solución guardada aparte. */
(function(){
const N=8,T=N*N,NP=6;
const DIRS=[[1,0],[0,1],[1,1],[1,-1]]; // → ↓ ↘ ↗
const COL=['#E5484D','#3E6FE0','#F6B73C','#2FA36B','#9B6BE8','#F28B30'];
const FREC='AAAAAAAAEEEEEEEEIIIIIOOOOOOUUUSSSSSRRRRNNNNLLLLDDDTTTCCCMMPPBBGFHVYQJZXÑK';

function pool(){
 const hoy=Content.palabraDe(DAY);
 const base=Content.palabras().length>=60?Content.palabras():[...Content.aceptadas()];
 return [...new Set(base)].filter(w=>w!=hoy&&/^[a-zñ]{5}$/.test(w)&&w!=[...w].reverse().join('')).sort()}

/* Cuántas veces aparece la palabra w en la cuadrícula g, en las 8 direcciones. */
function cuenta(g,w){
 let n=0;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++)for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
  if(!dx&&!dy)continue;
  let k=0;for(;k<5;k++){const a=x+dx*k,b=y+dy*k;if(a<0||b<0||a>=N||b>=N||g[b*N+a]!=w[k])break}
  if(k==5)n++}
 return n}

function gen(){
 const r=rng(DAY*43+17),B=pool();
 for(let t=0;t<200;t++){
  const ws=shuf(B.slice(),r).slice(0,NP).map(w=>w.toUpperCase());
  if(new Set(ws).size<NP)continue;
  // direcciones: al menos una horizontal, una vertical y las dos diagonales; el resto al azar
  const ds=shuf([0,1,2,3,Math.floor(r()*4),Math.floor(r()*4)],r),g=Array(T).fill(''),pos=[];
  let ok=true;
  for(let q=0;q<NP&&ok;q++){
   const w=ws[q],[dx,dy]=DIRS[ds[q]];let puesto=false;
   for(let i=0;i<150&&!puesto;i++){
    const x0=Math.floor(r()*N),y0=Math.floor(r()*N),x1=x0+dx*4,y1=y0+dy*4;
    if(x1<0||y1<0||x1>=N||y1>=N)continue;
    let cabe=true;for(let k=0;k<5;k++){const c=g[(y0+dy*k)*N+x0+dx*k];if(c&&c!=w[k]){cabe=false;break}}
    if(!cabe)continue;
    for(let k=0;k<5;k++)g[(y0+dy*k)*N+x0+dx*k]=w[k];
    pos.push([y0*N+x0,y1*N+x1]);puesto=true}
   if(!puesto)ok=false}
  if(!ok)continue;
  for(let f=0;f<20;f++){
   const h=g.map(c=>c||FREC[Math.floor(r()*FREC.length)]);
   if(ws.every(w=>cuenta(h,w)==1))return{g:h,ws,pos}}}
 return null}
let _p,_ok;const P=()=>{if(!_ok){_ok=1;_p=gen()}return _p};

const ini=p=>{if(!Array.isArray(p.f)){p.f=[];p.h=0}};
const pl=(n,a,b)=>n==1?a:b;
const linea=(a,b)=>{const dx=Math.sign((b%N)-(a%N)),dy=Math.sign((b/N|0)-(a/N|0)),n=Math.max(Math.abs((b%N)-(a%N)),Math.abs((b/N|0)-(a/N|0))),o=[];for(let k=0;k<=n;k++)o.push(a+dy*k*N+dx*k);return o};
const centro=i=>[i%N+.5,(i/N|0)+.5];

/* Selección en curso (no se guarda) */
let sel=null,pend=null,drag=false;

function svgTablero(p,dis){
 const Z=P();
 let s=`<svg viewBox="0 0 ${N} ${N}" role="img" aria-label="Sopa de letras de 8 por 8. ${p.f.length} de ${NP} palabras encontradas." style="display:block;width:100%;height:auto">`;
 for(let i=0;i<T;i++)s+=`<rect x="${i%N}" y="${i/N|0}" width="1" height="1" style="fill:var(--card);stroke:var(--line);stroke-width:.02"/>`;
 p.f.forEach(f=>{const[a,b]=[centro(f.a),centro(f.b)];s+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" style="stroke:${COL[f.w%COL.length]};stroke-opacity:.5;stroke-width:.78;stroke-linecap:round"/>`});
 if(!dis&&sel){const[a,b]=[centro(sel.a),centro(sel.b)];s+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" style="stroke:var(--sky);stroke-opacity:.45;stroke-width:.78;stroke-linecap:round"/>`}
 if(!dis&&p.pi!=null){const c=centro(p.pi);s+=`<circle cx="${c[0]}" cy="${c[1]}" r=".42" fill="none" style="stroke:var(--sun);stroke-width:.09"/>`}
 for(let i=0;i<T;i++)s+=`<text x="${i%N+.5}" y="${(i/N|0)+.53}" text-anchor="middle" dominant-baseline="central" style="fill:var(--ink);font:800 .5px 'Bricolage Grotesque',system-ui,sans-serif;pointer-events:none">${Z.g[i]}</text>`;
 return s+'</svg>'}

const lista=p=>P().ws.map((w,q)=>{const e=p.f.some(f=>f.w==q);return `<li class="${e?'ok':''}" style="${e?`border-color:${COL[q%COL.length]}`:''}">${e?'✓ ':''}${w}</li>`}).join('');
function pinta(){
 const p=prog('sp');ini(p);
 const b=$('#spb');if(b)b.innerHTML=svgTablero(p);
 const l=$('#spw');if(l)l.innerHTML=lista(p);
 const c=$('#spc');if(c)c.textContent=`${p.f.length} / ${NP} palabras`;
 const m=$('#spm');if(m)m.textContent=msg}

function sopa(){
 const Z=P();
 if(!Z)return shell('Sopa de letras','<p class="sub">Hoy no hay sopa de letras disponible.</p>');
 const p=prog('sp');ini(p);const r=R('sopa');
 let b=`<div id="spb" data-b="sopa" style="${r?'':'touch-action:none;'}max-width:400px;margin:12px auto;border:3px solid var(--ink);border-radius:10px;overflow:hidden;user-select:none;-webkit-user-select:none">${svgTablero(p,!!r)}</div>`
  +`<ul id="spw" class="spw">${lista(p)}</ul>`;
 if(r)b+=res(`¡Las ${NP} palabras en ${mmss(r.t)}!`,r.h?`Con ${r.h} ${pl(r.h,'pista','pistas')}. Vuelve mañana para una sopa nueva.`:'Vuelve mañana para una sopa nueva.',`Daily Arcade · Sopa #${DAY} · ${NP}/${NP} palabras${r.h?' · '+r.h+pl(r.h,' pista',' pistas'):''} · ${mmss(r.t)}`);
 else b+=`${S.set.tm?`<p class="tm" id="tm">${p.t0?mmss(Date.now()-p.t0):'0:00'}</p>`:''}<p class="cap" id="spc" style="text-align:center;margin:0">${p.f.length} / ${NP} palabras</p><p class="msg" id="spm" role="status">${msg}</p><div class="row" style="justify-content:center"><button class="btn" data-a="pista">Pista</button></div><p class="foot" style="margin-top:8px;text-align:center">Arrastra de la primera a la última letra, o toca esas dos letras.</p>`;
 return shell('Sopa de letras',b)}

/* ----- Interacción con el puntero ----- */
const casilla=(e,el)=>{const q=el.getBoundingClientRect(),x=Math.floor((e.clientX-q.left)/q.width*N),y=Math.floor((e.clientY-q.top)/q.height*N);return x<0||y<0||x>=N||y>=N?-1:y*N+x};
/* Ajusta el final a una línea recta (horizontal, vertical o diagonal) desde a, sin salirse del tablero. */
function ajusta(a,i){
 const dx=(i%N)-(a%N),dy=(i/N|0)-(a/N|0);
 if(!dx&&!dy)return a;
 const q=Math.round(Math.atan2(dy,dx)/(Math.PI/4)),ux=Math.round(Math.cos(q*Math.PI/4)),uy=Math.round(Math.sin(q*Math.PI/4));
 let n=Math.max(Math.abs(dx),Math.abs(dy));
 const x0=a%N,y0=a/N|0;
 while(n>0&&(x0+ux*n<0||x0+ux*n>=N||y0+uy*n<0||y0+uy*n>=N))n--;
 return a+uy*n*N+ux*n}

function probar(a,b){
 const p=prog('sp'),Z=P();ini(p);
 const c=linea(a,b);
 if(c.length<2)return;
 const s=c.map(i=>Z.g[i]).join(''),r=[...s].reverse().join('');
 const q=Z.ws.findIndex((w,k)=>(w==s||w==r)&&!p.f.some(f=>f.w==k));
 if(q<0){msg=c.length==5?'Esa no es ninguna de las palabras.':'';return}
 const f=Z.ws[q]==s?{w:q,a,b}:{w:q,a:b,b:a};
 p.f.push(f);p.pi=null;msg=`¡Encontrada: ${Z.ws[q]}!`;
 if(p.f.length==NP){fin('sopa',{st:'completed',t:Date.now()-p.t0,h:p.h||0,n:NP});sv();draw();return true}
 sv()}

const A=$('#app');
A.addEventListener('pointerdown',e=>{
 if(V!='sopa'||R('sopa'))return;
 const b=e.target.closest('#spb');if(!b)return;
 const i=casilla(e,b);if(i<0)return;
 const p=prog('sp');ini(p);e.preventDefault();p.t0=p.t0||Date.now();
 if(pend!=null){                                   // segundo toque: marca el final
  const a=pend,f=ajusta(a,i);pend=null;sel=null;msg='';
  if(f==a){pinta();return}
  if(probar(a,f))return;
  pinta();return}
 try{b.setPointerCapture(e.pointerId)}catch(x){}
 sel={a:i,b:i};drag=true;msg='';pinta()});
A.addEventListener('pointermove',e=>{
 if(!drag||!sel||V!='sopa'||R('sopa'))return;
 const b=e.target.closest('#spb');if(!b)return;
 const i=casilla(e,b);if(i<0)return;
 const f=ajusta(sel.a,i);
 if(f!=sel.b){sel.b=f;pinta()}});
const suelta=()=>{
 if(!drag)return;drag=false;
 if(V!='sopa'||R('sopa')){sel=null;return}
 if(sel&&sel.a==sel.b){pend=sel.a;msg='Toca ahora la última letra de la palabra.';pinta();return} // fue un toque
 const s=sel;sel=null;
 if(s&&probar(s.a,s.b))return;
 pinta()};
A.addEventListener('pointerup',suelta);A.addEventListener('pointercancel',suelta);

function pista(){
 const Z=P();if(!Z||R('sopa'))return;
 const p=prog('sp');ini(p);
 const q=Z.ws.map((_,k)=>k).filter(k=>!p.f.some(f=>f.w==k));
 if(!q.length)return;
 p.t0=p.t0||Date.now();p.h=(p.h||0)+1;
 const k=q.find(k=>Z.pos[k][0]!=p.pi)??q[0];p.pi=Z.pos[k][0];pend=null;sel=null;
 msg='Pista: la letra marcada es el principio de una palabra.';sv();draw()}

DailyArcade.register({
 id:'sopa',name:'Sopa de letras',desc:'Encuentra las 6 palabras escondidas en la cuadrícula.',color:'--pink',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
 how:["Encuentra las <b>6 palabras</b> de la lista escondidas en la cuadrícula.","Van en <b>horizontal, vertical o diagonal</b>. Se pueden marcar en cualquier sentido.","Arrastra de la primera a la última letra, o toca esas dos letras."],
 demo:(()=>{const L=['M','E','S','A','X','S','O','L','X','X','X','X'];let s=`<svg viewBox="0 0 4 3" style="display:block;width:140px;margin:6px auto;border:3px solid var(--ink);border-radius:8px">`;
  for(let i=0;i<12;i++)s+=`<rect x="${i%4}" y="${i/4|0}" width="1" height="1" style="fill:var(--card);stroke:var(--line);stroke-width:.03"/>`;
  s+=`<line x1=".5" y1=".5" x2="3.5" y2=".5" style="stroke:var(--mint);stroke-opacity:.5;stroke-width:.78;stroke-linecap:round"/>`;
  L.forEach((c,i)=>{s+=`<text x="${i%4+.5}" y="${(i/4|0)+.53}" text-anchor="middle" dominant-baseline="central" style="fill:var(--ink);font:800 .55px sans-serif">${c}</text>`});
  return `<p class="cap">Ejemplo: <b>MESA</b> está marcada en horizontal.</p>${s}</svg>`})(),
 pk:'sp',
 winLabel:'completadas',
 winStreak:false,       // no se puede perder: solo se completa
 render:sopa,
 actions:{pista},
 status:(r,p)=>r?`Completada · ${mmss(r.t)}`:(p&&(p.t0||(p.f&&p.f.length))?(p.f&&p.f.length?`${p.f.length}/${NP} palabras`:'En curso'):'Sin jugar'),
 stats:(e,w)=>w.length?kpi([[mmss(Math.min(...w.map(x=>x.t))),'mejor tiempo'],[mmss(avg(w.map(x=>x.t))),'tiempo medio']]):''
});
})();
