/* PLANTILLA para un juego nuevo — "Número secreto" (funciona de verdad).
   Pasos:
   1. Copia este archivo con otro nombre (p. ej. js/games/numero.js).
   2. Cambia id, name, desc, icon, color y pk (la clave de progreso debe ser ÚNICA).
   3. Añade en index.html:  <script src="js/games/numero.js"></script>
   Todo lo que declares aquí dentro queda aislado: no choca con otros juegos.

   Lo que te da el núcleo (core.js):
     DAY            nº de reto de hoy (cambia a medianoche, hora de Madrid)
     rng(semilla)   generador aleatorio determinista → rng(DAY*7+1)() da el mismo número a todo el mundo
     prog(pk)       objeto de progreso de HOY de este juego (se guarda con sv())
     R(id)          resultado final de hoy (undefined si aún no ha terminado)
     fin(id,obj)    marca el juego como terminado. obj.st='won'|'completed' cuenta como victoria
     sv()  draw()   guardar estado / volver a pintar la pantalla
     shell(titulo,html)  cabecera con botón de volver + nº de reto
     res(titulo,texto,textoParaCompartir)  tarjeta de resultado con botón "Copiar resultado"
     kb(estado,enter)    teclado en pantalla (botones data-a="k") — solo si usas onKey
     mmss(ms)  avg(array)  utilidades
   Botones: cualquier elemento con data-a="nombre" llama a actions.nombre(elemento).
   Ojo: no uses como nombre de acción go, set, copy, k, entrar, registrar, salir, reset, reset-si, reset-no, vis ni usr-*: los usa la app.
   Instrucciones: how:[…] (3 frases cortas, admite <b>) y demo:'<html>' (opcional, un ejemplo visual) se muestran como «Cómo se juega» bajo el título.
   Para el ejemplo puedes reutilizar las clases: .t .r (fichas), .c .wd (letras), .bd2 .z (tablero), .sd .sx (sudoku), .chp (números), .dot (leyenda) y .cap (pie). */
(function(){
 const secreto=()=>1+Math.floor(rng(DAY*7+1)()*100);

 function render(){
  const p=prog('n'),r=R('numero');p.g=p.g||[];
  const lista=p.g.map(n=>`<li>${n} → ${n==secreto()?'¡Correcto!':n<secreto()?'más alto ↑':'más bajo ↓'}</li>`).join('');
  let b=`<ul>${lista}</ul>`;
  if(r)b+=res(`¡Lo has encontrado en ${r.att} intentos!`,'Vuelve mañana para un reto nuevo.',`Daily Arcade · Número #${DAY} · ${r.att} intentos`);
  else b+=`<div class="row"><input id="n" type="number" min="1" max="100" inputmode="numeric" aria-label="Tu número" style="font:inherit;padding:8px;border:2px solid var(--ink);border-radius:10px;background:var(--card);color:var(--ink);width:100px"><button class="btn pri" data-a="probar">Probar</button></div><p class="msg" role="status">${msg}</p>`;
  return shell('Número',b)}

 function probar(){
  const p=prog('n'),n=parseInt($('#n').value,10);
  if(R('numero'))return;
  if(!(n>=1&&n<=100)){msg='Escribe un número del 1 al 100';return draw()}
  msg='';p.g.push(n);
  if(n==secreto())fin('numero',{st:'won',att:p.g.length});
  sv();draw()}

 DailyArcade.register({
  id:'numero',name:'Número',desc:'Encuentra el número secreto del 1 al 100.',color:'--mint',icon:'#',
  pk:'n',                 // clave de progreso, única por juego
  how:['Adivina el número secreto del 1 al 100.','Tras cada intento te dice si es más alto o más bajo.'],
  winLabel:'ganadas',
  render,
  actions:{probar},
  // onKey:(tecla)=>{…}   ← solo si el juego usa teclado (tecla = 'a'…'z', 'ñ', 'Enter', 'Del')
  status:(r,p)=>r?`Resuelto en ${r.att} intentos`:(p&&p.g&&p.g.length?'En curso':'Sin jugar'),
  stats:(e,w)=>w.length?`<p>Media: ${avg(w.map(x=>x.att)).toFixed(1)} intentos</p>`:''
 });
})();
