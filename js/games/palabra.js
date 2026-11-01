/* Juego: Palabra — adivina la palabra de 5 letras en 6 intentos. */
(function(){
// Las palabras salen de content/palabras.js y content/aceptadas.js (ver js/content.js)
const OK=Content.aceptadas();
const SOL=()=>Content.palabraDe(DAY);
function ev(g,s){const r=[0,0,0,0,0],c={};for(let i=0;i<5;i++)if(g[i]==s[i])r[i]=2;else c[s[i]]=(c[s[i]]||0)+1;for(let i=0;i<5;i++)if(!r[i]&&c[g[i]]>0){r[i]=1;c[g[i]]--}return r}
function palabra(){const p=prog('p');p.g=p.g||[];const s=SOL(),r=R('palabra'),st={};let h='';
 p.g.forEach(g=>ev(g,s).forEach((v,i)=>{st[g[i]]=Math.max(st[g[i]]??-1,v)}));
 for(let i=0;i<6;i++){const g=p.g[i],cur=(i==p.g.length&&!r)?(p.cur||''):'',e=g&&ev(g,s);let t='';
  for(let j=0;j<5;j++)t+=`<span class="t ${e?'s'+e[j]:''}">${g?g[j]:cur[j]||''}<i>${e?['–','●','✓'][e[j]]:''}</i></span>`;
  h+=`<div class="r" role="group" aria-label="Intento ${i+1}">${t}</div>`}
 let b=`<div>${h}</div>${S.set.tm&&!r?`<p class="tm" id="tm">${p.t0?mmss(Date.now()-p.t0):'0:00'}</p>`:''}<p class="msg" role="status">${msg}</p>`;
 if(r)b+=res(r.st=='won'?`¡Acertada en ${r.att}/6${r.t?' · '+mmss(r.t):''}!`:'No ha podido ser',r.st=='won'?'Vuelve mañana para un reto nuevo.':`La palabra era <b>${s.toUpperCase()}</b>.`,pshare(r));else b+=kb(st,true);
 return shell('Palabra',b)}
const pshare=r=>`Daily Arcade · Palabra #${DAY} ${r.st=='won'?r.att:'X'}/6\n`+r.g.map(g=>ev(g,SOL()).map(v=>(S.set.cb?['⬛','🟧','🟦']:['⬛','🟨','🟩'])[v]).join('')).join('\n');
function pk(k){const p=prog('p');p.g=p.g||[];if(R('palabra'))return;p.cur=p.cur||'';msg='';
 if(k=='Del')p.cur=p.cur.slice(0,-1);
 else if(k=='Enter'){if(p.cur.length<5)msg='Faltan letras';else if(!OK.has(p.cur)&&p.cur!=SOL())msg='Esa palabra no está en el diccionario';else if(p.g.includes(p.cur))msg='Ya probaste esa palabra';
  else{p.g.push(p.cur);p.cur='';const l=p.g[p.g.length-1];if(l==SOL())fin('palabra',{st:'won',att:p.g.length,g:p.g,t:Date.now()-(p.t0||Date.now())});else if(p.g.length==6)fin('palabra',{st:'lost',att:6,g:p.g,t:Date.now()-(p.t0||Date.now())})}}
 else if(p.cur.length<5){p.t0=p.t0||Date.now();p.cur+=k}
 sv();draw()}

DailyArcade.register({
 id:'palabra',name:'Palabra',desc:'Adivina la palabra de 5 letras en 6 intentos.',color:'--sky',icon:'Aa',
 how:["Adivina la palabra de <b>5 letras</b> en <b>6 intentos</b>.", "Escribe una palabra que exista y pulsa <b>Enter</b>.", "Cada letra te dice cuánto te acercas: mira el ejemplo."],
 demo:`<p class="cap">Si la palabra fuera <b>CAMPO</b> y escribes <b>COPAS</b>:</p><div class="r"><span class="t s2">C<i>✓</i></span><span class="t s1">O<i>●</i></span><span class="t s1">P<i>●</i></span><span class="t s1">A<i>●</i></span><span class="t s0">S<i>–</i></span></div><p class="cap"><b class="dot s2">✓</b> en su sitio &nbsp; <b class="dot s1">●</b> en otro sitio &nbsp; <b class="dot s0">–</b> no está</p>`,
 pk:'p',                 // clave donde se guarda el progreso del día
 winLabel:'ganadas',
 render:palabra,
 onKey:pk,               // teclado físico y en pantalla
 status:(r,p)=>r?(r.st=='won'?`Acertada en ${r.att}/6${r.t?' · '+mmss(r.t):''}`:'Fallada'):(p&&(p.g&&p.g.length||p.t0)?'En curso':'Sin jugar'),
 stats:(e,w)=>{const d=[1,2,3,4,5,6].map(i=>w.filter(x=>x.att==i).length),l=e.length-w.length,m=Math.max(1,l,...d);return [...d,l].map((n,i)=>`<div class="br"><span>${i<6?i+1:'X'}</span><u><i style="width:${n/m*100}%"></i></u><b>${n}</b></div>`).join('')+(w.length?kpi([[avg(w.map(x=>x.att)).toFixed(1),'intentos de media'],...(w.some(x=>x.t)?[[mmss(Math.min(...w.filter(x=>x.t).map(x=>x.t))),'mejor tiempo']]:[])]):'')}
});
})();
