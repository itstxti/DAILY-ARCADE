/* Daily Arcade · efectos de sonido (opcionales: Ajustes → Juegos → Sonidos, apagados por defecto).
   Sin archivos de audio: cada efecto se genera con Web Audio, así no pesa nada y funciona sin conexión.
   Uso: Sfx.p('pon') · Sfx.p('pon', 3) (el número cambia el tono) · Sfx.p('acierto', 0, 0.4) (con 0,4 s de retraso).
   Efectos: tecla, tap, pon, corona, borra, error, acierto, pista, reinicia, revela, racha, dia. Y Sfx.fin(o) para el final de partida.
   Para añadir uno, escribe su receta en EF; el resto (volumen, límite de repetición, ajustes) ya está resuelto. */
const Sfx = (() => {
   let ac = null; const ult = {};
   /* Un único AudioContext para toda la web (efectos y música). */
   const base = () => {
      try {
         const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
         ac = ac || new A(); if (ac.state == 'suspended') ac.resume().catch(() => { });
         return ac
      } catch (_) { return null }
   };
   const ctx = () => S.set.snd ? base() : null;
   /* Una nota: frecuencia f (que puede deslizarse hasta f2), a los t segundos, durante d, con volumen v. */
   const nota = (c, f, t, d, o = {}) => {
      const osc = c.createOscillator(), g = c.createGain(), v = o.v == null ? .08 : o.v, t0 = c.currentTime + t;
      osc.type = o.tipo || 'sine'; osc.frequency.setValueAtTime(f, t0);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + .008); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
      osc.connect(g); g.connect(c.destination); osc.start(t0); osc.stop(t0 + d + .03)
   };
   const EF = {
      tecla: (c, n, t) => nota(c, 700 + (n || 0) * 15, t, .035, { tipo: 'triangle', v: .035 }),                      // letra o número en un teclado
      tap: (c, n, t) => nota(c, 520, t, .05, { tipo: 'sine', f2: 470, v: .07 }),                                    // seleccionar algo
      pon: (c, n, t) => nota(c, 330 + (n || 0) * 28, t, .09, { tipo: 'triangle', v: .09 }),                         // colocar una pieza (n: sube el tono)
      corona: (c, n, t) => { nota(c, 784, t, .09, { tipo: 'triangle', v: .08 }); nota(c, 1175, t + .07, .14, { tipo: 'sine', v: .07 }) },
      borra: (c, n, t) => nota(c, 400, t, .08, { tipo: 'sine', f2: 240, v: .07 }),                                  // borrar, deshacer
      error: (c, n, t) => nota(c, 165, t, .16, { tipo: 'sawtooth', f2: 115, v: .045 }),                             // jugada no válida (grave y suave)
      acierto: (c, n, t) => { nota(c, 659, t, .08, { tipo: 'triangle', v: .09 }); nota(c, 880, t + .08, .16, { tipo: 'triangle', v: .09 }) },
      pista: (c, n, t) => [1318, 1568, 2093].forEach((f, i) => nota(c, f, t + i * .05, .08, { tipo: 'sine', v: .05 })),
      reinicia: (c, n, t) => nota(c, 620, t, .2, { tipo: 'sine', f2: 190, v: .07 }),
      revela: (c, n, t) => { for (let i = 0; i < (n || 5); i++) nota(c, 440 + i * 70, t + i * .075, .07, { tipo: 'triangle', v: .06 }) },   // las casillas de Palabra al girar
      racha: (c, n, t) => [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => nota(c, f, t + i * .07, .16, { tipo: 'sine', v: .07 })),
      dia: (c, n, t) => [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => nota(c, f, t + i * .11, i == 6 ? .5 : .2, { tipo: 'triangle', v: .09 }))   // los 10 retos del día
   };
   /* Final de partida: arpegio alegre si ganas, dos notas graves si no. */
   const gana = (c, t) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => nota(c, f, t + i * .09, .22, { tipo: 'triangle', v: .12 }));
   const pierde = (c, t) => [293.66, 233.08].forEach((f, i) => nota(c, f, t + i * .16, .32, { tipo: 'sine', v: .12 }));
   return {
      base,
      p(nombre, n, retraso) {
         try {
            const e = EF[nombre]; if (!e) return;
            const c = ctx(); if (!c) return;
            const ahora = performance.now(); if (ahora - (ult[nombre] || 0) < 30) return; ult[nombre] = ahora;   // sin ráfagas al arrastrar
            e(c, n, retraso || 0)
         } catch (_) { }
      },
      fin(o, retraso) {
         try {
            const c = ctx(); if (!c) return;
            (o && (o.st == 'won' || o.st == 'completed') ? gana : pierde)(c, retraso || 0)
         } catch (_) { }
      }
   }
})();
