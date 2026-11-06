/* Daily Arcade · música de fondo (opcional: Ajustes → Juegos → Música, apagada por defecto).
   Generativa y sin archivos de audio: acordes suaves, bajo y notas sueltas con eco, todo con Web Audio.
   - La tonalidad y la melodía salen de DAY: cada día suena distinta, pero igual para todo el mundo.
   - Dos ambientes: «inicio» (con más notas) y «juego» (más tranquila y baja, para no distraer).
   - Se pausa sola con la pestaña en segundo plano, y baja un momento cuando suena el final de una partida.
   API: Musica.sync() (la llama draw(): arranca, para o cambia de ambiente según el ajuste y la pantalla) · Musica.duck(s). */
const Musica = (() => {
   const BPM = 76, B = 60 / BPM;                                         // B = duración de un tiempo (s)
   const ACORDES = [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 4]];   // Cmaj7 · Am7 · Fmaj7 · G6 (semitonos desde la tónica)
   const RAICES = [0, -3, -7, -5], TONOS = [0, 2, 3, 5, 7, -2, -4];       // raíz de cada acorde · tonalidades posibles (una por día)
   const AMB = { inicio: { p: .62, nivel: 1 }, juego: { p: .3, nivel: .6 } };
   const NIVEL = .24, ADELANTE = 1.0;                                    // volumen general (bajo: los efectos deben oírse por encima) · segundos que se planifican por delante
   const hz = s => 261.63 * Math.pow(2, s / 12);
   let c = null, g = null, timer = null, sig = 0, paso = 0, amb = 'inicio', activa = false, gesto = false;

   /* Aleatorio estable por día y por paso: la misma melodía para todos, y no depende de cuándo se abrió la web. */
   const alea = (d, k) => rng(d * 1009 + k * 7919)();
   const dia = () => typeof DAY == 'number' ? DAY : 0;

   /* Cadena de audio: voces → bus → compresor suave → salida, con un eco (corchea con puntillo) que realimenta. */
   function cadena(ctx, salida) {
      const bus = ctx.createGain(), comp = ctx.createDynamicsCompressor(), eco = ctx.createDelay(2), fb = ctx.createGain(), envio = ctx.createGain(), lp = ctx.createBiquadFilter();
      comp.threshold.value = -22; comp.ratio.value = 3; comp.attack.value = .02; comp.release.value = .3;
      eco.delayTime.value = B * .75; fb.gain.value = .38; envio.gain.value = .32; lp.type = 'lowpass'; lp.frequency.value = 1800;
      bus.connect(comp); bus.connect(envio); envio.connect(eco); eco.connect(fb); fb.connect(eco); eco.connect(lp); lp.connect(comp); comp.connect(salida);
      return { ctx, bus, envio, comp }
   }
   /* Una nota con envolvente: sube en 'ata' s, se mantiene y se apaga en 'dur' s. */
   function voz(G, f, t, dur, o) {
      const ctx = G.ctx, osc = ctx.createOscillator(), env = ctx.createGain(), fl = ctx.createBiquadFilter();
      osc.type = o.tipo; osc.frequency.value = f; if (o.det) osc.detune.value = o.det;
      fl.type = 'lowpass'; fl.frequency.value = o.corte || 2400;
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(o.v, t + (o.ata || .01)); env.gain.exponentialRampToValueAtTime(.0001, t + dur);
      osc.connect(fl); fl.connect(env); env.connect(G.bus); if (o.eco) { const s = ctx.createGain(); s.gain.value = o.eco; env.connect(s); s.connect(G.envio) }
      osc.start(t); osc.stop(t + dur + .05)
   }
   /* Una corchea (paso n) en el instante t. Cada 8 pasos, un compás; cada 4 compases, la sucesión de acordes vuelve a empezar. */
   function corchea(G, n, t, a, dd) {
      const d = dd == null ? dia() : dd, k = TONOS[d % TONOS.length], cp = n >> 3 & 3, i = n & 7, ac = ACORDES[cp];
      if (i == 0) {                                                       // compás nuevo: acorde (pad) y bajo
         ac.forEach((s, j) => [-4, 4].forEach(dt => voz(G, hz(s + k), t, B * 4.6, { tipo: 'triangle', v: .028, ata: .9, det: dt, corte: 1100 })));
         voz(G, hz(RAICES[cp] + k - 12), t, B * 3.4, { tipo: 'sine', v: .13, ata: .02, corte: 600 })
      } else if (i == 4) voz(G, hz(RAICES[cp] + k - 12), t, B * 2.2, { tipo: 'sine', v: .08, ata: .02, corte: 600 });
      const peso = [.4, 1, .8, 1, .5, 1, .8, 1][i];                       // las corcheas de contratiempo suenan más
      if (alea(d, n) < a.p * peso) {
         const pool = [...ac, ac[0] + 14], s = pool[alea(d, n + 5000) * pool.length | 0] + (alea(d, n + 9000) < .4 ? 12 : 0) + 12;
         voz(G, hz(s + k), t, B * 1.5, { tipo: 'triangle', v: .06, ata: .008, corte: 2600, eco: .9 })
      }
   }
   function planifica() {
      if (!c || !g) return;
      if (c.state == 'suspended') { if (!document.hidden) c.resume().catch(() => { }); return }      // en segundo plano no se reanuda: la pausa se respeta
      if (sig < c.currentTime) sig = c.currentTime + .05;
      while (sig < c.currentTime + ADELANTE) { corchea(g, paso, sig, AMB[amb]); sig += B / 2; paso++ }
   }
   function arranca() {
      if (activa) return;
      const base = Sfx.base(); if (!base) return;
      c = base; g = cadena(c, c.destination); activa = true; paso = 0; sig = 0;
      g.bus.gain.setValueAtTime(0, c.currentTime); g.bus.gain.linearRampToValueAtTime(NIVEL * AMB[amb].nivel, c.currentTime + 1.5);   // entra poco a poco
      timer = setInterval(planifica, 250); planifica()
   }
   function para() {
      if (!activa) return; activa = false; clearInterval(timer); const vieja = g;
      try { vieja.bus.gain.cancelScheduledValues(c.currentTime); vieja.bus.gain.setTargetAtTime(0, c.currentTime, .15) } catch (_) { }
      setTimeout(() => { try { vieja.comp.disconnect(); vieja.bus.disconnect() } catch (_) { } }, 900)      // se corta del todo lo que aún sonara
   }
   function nivel(m) { if (g) { g.bus.gain.cancelScheduledValues(c.currentTime); g.bus.gain.setTargetAtTime(NIVEL * AMB[m].nivel, c.currentTime, .6) } }

   /* Los navegadores no dejan sonar nada hasta el primer toque: se reintenta en el primer gesto. */
   const alGesto = () => { gesto = true; sync() };
   ['pointerdown', 'keydown'].forEach(e => addEventListener(e, alGesto, { once: true, capture: true }));
   addEventListener('visibilitychange', () => { if (!c || !activa) return; if (document.hidden) c.suspend().catch(() => { }); else c.resume().catch(() => { }) });

   function sync() {
      try {
         const quiere = !!(S.set && S.set.mus), m = typeof V != 'undefined' && typeof cur == 'function' && cur() ? 'juego' : 'inicio';
         if (!quiere) return para();
         if (m != amb) { amb = m; nivel(m) }
         if (!activa && gesto) arranca()
      } catch (_) { }
   }
   /* Baja un momento para que se oiga el sonido de final de partida. */
   function duck(s) {
      if (!activa || !g) return;
      const t = c.currentTime, v = NIVEL * AMB[amb].nivel;
      g.bus.gain.cancelScheduledValues(t); g.bus.gain.setTargetAtTime(v * .3, t, .08); g.bus.gain.setTargetAtTime(v, t + (s || 1.5), .5)
   }
   /* Para pruebas y para oír un fragmento sin la web: devuelve un AudioBuffer con 'seg' segundos de música (mono). */
   async function render(seg, ambiente, dia0) {
      const OC = window.OfflineAudioContext, oc = new OC(1, 32000 * seg, 32000), G = cadena(oc, oc.destination), a = AMB[ambiente || 'inicio'];
      G.bus.gain.value = NIVEL * a.nivel; const dd = dia0 == null ? dia() : dia0;
      for (let n = 0, t = 0; t < seg; n++, t += B / 2) corchea(G, n, t, a, dd);
      return oc.startRendering()
   }
   return { sync, duck, render, _dia: dia }
})();
