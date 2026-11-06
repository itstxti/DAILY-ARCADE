/* Juego: Palabra — adivina la palabra de 5 letras en 5 intentos (como las estrellas: 1 intento = 5 estrellas, 5 intentos = 1). */
(function () {
    const MAX = 5;
    const ratt = r => r.att > MAX ? r.att + ' intentos' : r.att + '/' + MAX;   // las partidas antiguas pudieron llegar a 6
    // Las palabras salen de content/palabras.js y content/aceptadas.js (ver js/content.js)
    const OK = Content.aceptadas();
    const SOL = () => Content.palabraDe(SD);
    function ev(g, s) { const r = [0, 0, 0, 0, 0], c = {}; for (let i = 0; i < 5; i++)if (g[i] == s[i]) r[i] = 2; else c[s[i]] = (c[s[i]] || 0) + 1; for (let i = 0; i < 5; i++)if (!r[i] && c[g[i]] > 0) { r[i] = 1; c[g[i]]-- } return r }
    function palabra() {
        const p = prog('p'); p.g = p.g || []; const s = SOL(); let r = R('palabra'), st = {}, h = '';
        if (!r && p.g.length >= MAX) { p.g.includes(s) ? fin('palabra', { st: 'won', att: p.g.indexOf(s) + 1, g: p.g.slice(0, p.g.indexOf(s) + 1), t: Date.now() - (p.t0 || Date.now()) }) : fin('palabra', { st: 'lost', att: MAX, g: p.g, t: Date.now() - (p.t0 || Date.now()) }); r = R('palabra') }   // partida a medias de cuando eran 6 intentos
        p.g.forEach(g => ev(g, s).forEach((v, i) => { st[g[i]] = Math.max(st[g[i]] ?? -1, v) }));
        for (let i = 0; i < MAX; i++) {
            const g = p.g[i], cur = (i == p.g.length && !r) ? (p.cur || '') : '', e = g && ev(g, s); let t = '';
            for (let j = 0; j < 5; j++)t += `<span class="t ${e ? 's' + e[j] : ''}${e && Anim.has('rv') && i == p.g.length - 1 ? ' fl' : ''}${cur && Anim.has('ty') && j == cur.length - 1 ? ' pp' : ''}" style="--j:${j}">${g ? g[j] : cur[j] || ''}<i>${e ? ['–', '●', '✓'][e[j]] : ''}</i></span>`;
            h += `<div class="r${!g && i == p.g.length && !r && Anim.has('sk') ? ' sk' : ''}" role="group" aria-label="Intento ${i + 1}">${t}</div>`
        }
        let b = `<div>${h}</div>${S.set.tm && !r ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>`;
        if (r) b += res(r.st == 'won' ? `¡Acertada en ${ratt(r)}${r.t ? ' · ' + mmss(r.t) : ''}!` : 'No ha podido ser', r.st == 'won' ? 'Vuelve mañana para un reto nuevo.' : `La palabra era <b>${s.toUpperCase()}</b>.`, pshare(r)); else b += kb(st, true);
        return shell('Palabra', b)
    }
    const pshare = r => `Daily Arcade · Palabra #${DAY} ${r.st == 'won' ? r.att : 'X'}/${MAX}\n` + r.g.map(g => ev(g, SOL()).map(v => (S.set.cb ? ['⬛', '🟧', '🟦'] : ['⬛', '🟨', '🟩'])[v]).join('')).join('\n');
    function pk(k) {
        const p = prog('p'); p.g = p.g || []; if (R('palabra')) return; p.cur = p.cur || ''; msg = '';
        if (k == 'Del') { if (p.cur) Sfx.p('borra'); p.cur = p.cur.slice(0, -1) }
        else if (k == 'Enter') {
            if (p.cur.length < 5) msg = 'Faltan letras'; else if (!OK.has(p.cur) && p.cur != SOL()) msg = 'Esa palabra no está en el diccionario'; else if (p.g.includes(p.cur)) msg = 'Ya probaste esa palabra';
            if (msg) { Anim.once('sk'); Sfx.p('error') }
            else { Anim.once('rv'); Sfx.p('revela', 5); p.g.push(p.cur); p.cur = ''; const l = p.g[p.g.length - 1]; if (l == SOL()) fin('palabra', { st: 'won', att: p.g.length, g: p.g, t: Date.now() - (p.t0 || Date.now()) }); else if (p.g.length == MAX) fin('palabra', { st: 'lost', att: MAX, g: p.g, t: Date.now() - (p.t0 || Date.now()) }) }
        }
        else if (p.cur.length < 5) { p.t0 = p.t0 || Date.now(); p.cur += k; Anim.once('ty'); Sfx.p('tecla', p.cur.length) }
        sv(); draw()
    }

    DailyArcade.register({
        id: 'palabra', name: 'Palabra', desc: 'Adivina la palabra de 5 letras en 5 intentos.', color: '--sky', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="8" width="5.5" height="8" rx="1.2"/><rect x="9.25" y="8" width="5.5" height="8" rx="1.2" fill="currentColor"/><rect x="16.5" y="8" width="5.5" height="8" rx="1.2"/></svg>',
        how: ["Adivina la palabra de <b>5 letras</b> en <b>5 intentos</b>: cuantos menos uses, más estrellas.", "Escribe una palabra que exista y pulsa <b>Enter</b>.", "Cada letra te dice cuánto te acercas: mira el ejemplo."],
        demo: `<p class="cap">Si la palabra fuera <b>CAMPO</b> y escribes <b>COPAS</b>:</p><div class="r"><span class="t s2">C<i>✓</i></span><span class="t s1">O<i>●</i></span><span class="t s1">P<i>●</i></span><span class="t s1">A<i>●</i></span><span class="t s0">S<i>–</i></span></div><p class="cap"><b class="dot s2">✓</b> en su sitio &nbsp; <b class="dot s1">●</b> en otro sitio &nbsp; <b class="dot s0">–</b> no está</p>`,
        pk: 'p',                 // clave donde se guarda el progreso del día
        render: palabra,
        onKey: pk,               // teclado físico y en pantalla
        status: (r, p) => r ? (r.st == 'won' ? `Acertada en ${ratt(r)}${r.t ? ' · ' + mmss(r.t) : ''}` : 'Fallada') : (p && (p.g && p.g.length || p.t0) ? 'En curso' : 'Sin jugar')
    });
})();
