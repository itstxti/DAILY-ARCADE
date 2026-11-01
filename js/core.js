/* Daily Arcade · núcleo
   Utilidades, estado guardado, fecha/reto del día y registro de juegos.
   Para añadir un juego mira js/games/_plantilla.js y el README. */
const EPOCH=Date.UTC(2026,9,31); // día del reto nº 1 (año, mes-1, día). Fíjalo el día de lanzamiento, ANTES de que juegue nadie.

/* ---------- Registro de juegos ---------- */
const GAMES=[];
const DailyArcade={register(g){g.winLabel=g.winLabel||'ganadas';GAMES.push(g)}};
const cur=()=>GAMES.find(g=>g.id==V);

const $=s=>document.querySelector(s),TZ='Europe/Madrid';
const parts=()=>{const o={};new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(p=>o[p.type]=+p.value);return o};
const P=parts(),D0=Date.UTC(P.year,P.month-1,P.day),DAY=Math.round((D0-EPOCH)/864e5)+1,WD=new Date(D0).getUTCDay();
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const shuf=(a,r)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const nz=k=>k.toLowerCase()==='ñ'?'ñ':k.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const mmss=ms=>{const s=Math.floor(ms/1e3);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
let S={res:{},pr:{},me:{n:'Invitado',v:'public'}};try{S=Object.assign(S,JSON.parse(localStorage.getItem('da2')||'{}'))}catch(e){}
S.set=Object.assign({cb:false,tm:true,hl:true,th:'auto'},S.set);
const sv=()=>{try{localStorage.setItem('da2',JSON.stringify(S))}catch(e){}};
/* S.uid = cuenta a la que pertenecen los datos de este navegador (null = invitado). */
const R=g=>(S.res[DAY]||{})[g],fin=(g,o)=>{(S.res[DAY]=S.res[DAY]||{})[g]=o;sv();Nube.guardarResultado(DAY,g,o)},prog=g=>(S.pr[DAY+g]=S.pr[DAY+g]||{});
const days=(r=S.res)=>Object.keys(r).map(Number).filter(d=>Object.keys(r[d]).length);
function streak(){return runs(days()).cur}
let V='home',msg='',sel=null,hist=[];
const theme=()=>{const r=document.documentElement;if(S.set.th=='auto')r.removeAttribute('data-theme');else r.dataset.theme=S.set.th;document.body.classList.toggle('cb',S.set.cb)};
const KR=['qwertyuiop','asdfghjklñ','zxcvbnm'];
const kb=(st,en)=>`<div class="kb">${KR.map((r,i)=>`<div class="kr">${i==2&&en?'<button class="k w" data-a="k" data-k="Enter">Enter</button>':''}${[...r].map(l=>`<button class="k ${st&&st[l]!=null?'s'+st[l]:''}" data-a="k" data-k="${l}">${l}</button>`).join('')}${i==2?'<button class="k w" data-a="k" data-k="Del" aria-label="Borrar">⌫</button>':''}</div>`).join('')}</div>`;
const res=(t,d,s)=>`<section class="res"><h2>${t}</h2><p>${d}</p><pre id="sh">${s}</pre><button class="btn pri" data-a="copy">Copiar resultado</button></section>`;
/* Instrucciones del juego (propiedad "how" al registrarlo). Abiertas la primera vez; después, plegadas. Se recuerda lo que el jugador abra o cierre. */
const HW={};
const how=()=>{const g=cur();if(!g||!g.how)return '';const o=HW[g.id]!==undefined?HW[g.id]:!E(g.id).length;
 return `<details class="how" data-g="${g.id}"${o?' open':''}><summary>Cómo se juega</summary>${g.demo?`<div class="dm">${g.demo}</div>`:''}<ol>${g.how.map(t=>`<li><span>${t}</span></li>`).join('')}</ol></details>`};
const shell=(t,b)=>`<div class="bar"><button class="bk" data-a="go" data-v="home">‹ Inicio</button><h1>${t}</h1></div><p class="sub" style="margin:0 0 8px">Reto nº ${DAY}</p>${how()}${b}`;

/* Fila de cifras para el perfil: kpi([[valor,etiqueta,detalle?],…]) */
const kpi=a=>`<div class="kp">${a.map(([v,l,x])=>`<div><b>${v}</b>${x?`<i>${x}</i>`:''}<span>${l}</span></div>`).join('')}</div>`;
const E=(g,r=S.res)=>Object.entries(r).filter(([d,o])=>o[g]).map(([d,o])=>({d:+d,...o[g]}));
function runs(ds){const q=new Set(ds);let best=0,n=0;[...ds].sort((a,b)=>a-b).forEach(d=>{n=q.has(d-1)?n+1:1;best=Math.max(best,n)});let d=q.has(DAY)?DAY:DAY-1,cur=0;while(q.has(d)){cur++;d--}return{cur,best}}
const avg=a=>a.reduce((x,y)=>x+y,0)/(a.length||1),esc=t=>t.replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
