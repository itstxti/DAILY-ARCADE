/* Juego: Cifrado — descifra la frase: cada letra esconde otra. */
(function () {
    const AL = 'abcdefghijklmnñopqrstuvwxyz'; // las frases salen de content/frases.js
    const mkC = () => {
        const [ph, au] = Content.fraseDe(SD), pl = [...ph].map(nz).join(''), a = [...AL], r = rng(SD * 31 + 7);
        for (let i = 26; i > 0; i--) { const j = Math.floor(r() * i);[a[i], a[j]] = [a[j], a[i]] }
        const enc = {}, dec = {}; AL.split('').forEach((l, i) => { enc[l] = a[i]; dec[a[i]] = l });
        const ci = [...pl].map(c => enc[c] || c).join(''), ord = [...new Set(ci.split('').filter(c => dec[c]))], k = [1, 4, 4, 3, 3, 2, 2][WD];
        return { ph, au: au || 'Refrán popular', pl, ci, enc, dec, ord, rev: [...new Set(pl.split('').filter(c => enc[c]))].slice(0, k) }
    };
    const _c = memoSD(mkC), C = new Proxy({}, { get: (_, k) => _c()[k] });
    function cini(p) { if (p.ph !== C.ph) { Object.keys(p).forEach(k => delete p[k]); p.ph = C.ph } if (!p.a) { p.a = {}; p.lk = []; p.h = 0; p.c = 0; p.bad = []; C.rev.forEach(l => { p.a[C.enc[l]] = l; p.lk.push(C.enc[l]) }) } }
    function cdone(p) { if (C.ord.every(l => p.a[l] === C.dec[l])) fin('cifra', { st: 'completed', h: p.h || 0, c: p.c || 0, t: Date.now() - p.t0 }) }
    function cifra() {
        const p = prog('c'); cini(p); const r = R('cifra'), cnt = {}; Object.values(p.a).forEach(v => cnt[v] = (cnt[v] || 0) + 1);
        const w = C.ci.split(' ').map(x => `<div class="wd">${[...x].map(l => C.dec[l] ? `<button class="c ${sel == l ? 'sel' : ''} ${p.lk.includes(l) ? 'lk' : ''} ${p.a[l] && cnt[p.a[l]] > 1 ? 'cf' : ''} ${p.bad.includes(l) ? 'bd' : ''}" data-a="sel" data-l="${l}" aria-pressed="${sel == l}" aria-label="Letra cifrada ${l.toUpperCase()}, ${r ? '' : p.lk.includes(l) ? 'revelada: ' + p.a[l] : p.a[l] ? 'asignada a ' + p.a[l] : 'sin asignar'}${!r && p.a[l] && cnt[p.a[l]] > 1 ? ', repetida' : ''}${p.bad.includes(l) ? ', incorrecta' : ''}"><small>${l.toUpperCase()}</small><b>${r ? C.dec[l] : p.a[l] || ''}</b></button>` : `<span class="pu">${l}</span>`).join('')}</div>`).join('');
        let b = `<div class="words" data-rv="cifra" role="group" aria-label="Frase cifrada">${w}</div>`;
        if (r) {
            b += res(r.st == 'completed' ? `¡Descifrada en ${mmss(r.t)}!` : 'Rendida', `“${C.ph}” — ${C.au}`, `Daily Arcade · Cifrado #${DAY} ${r.st == 'completed' ? '· ' + mmss(r.t) + (r.h ? ' · ' + r.h + (r.h == 1 ? ' pista' : ' pistas') : '') + (r.c ? ' · ' + r.c + (r.c == 1 ? ' comprobación' : ' comprobaciones') : '') : '· rendida'}`)
        }
        else b += `${S.set.tm ? tmHtml(p) : ''}<p class="msg" role="status">${msg}</p>${controles({ comprobar: 1, pista: 1, rendirme: 1 })}` + kb(null, false);
        return shell('Cifrado', b)
    }
    function ck(m) {
        const p = prog('c'); cini(p); if (R('cifra')) return; if (!sel) { msg = 'Toca primero una letra cifrada.'; return draw() } if (p.lk.includes(sel)) return; p.t0 = p.t0 || Date.now(); msg = ''; p.bad = p.bad.filter(l => l != sel);
        if (m == 'Del') delete p.a[sel]; else if (m != 'Enter') { p.a[sel] = m; const o = C.ord, i = o.indexOf(sel), nx = o.slice(i + 1).concat(o.slice(0, i)).find(l => !p.a[l]); if (nx) sel = nx }
        cdone(p); sv(); draw();
        const f = document.activeElement; if (f && f.matches && f.matches('#app button.c') && sel) { const n = document.querySelector(`#app button.c[data-l="${sel}"]`); if (n && n !== f) n.focus() } // el foco sigue a la letra seleccionada
    }
    function hint() { const p = prog('c'); cini(p); const l = C.ord.find(l => p.a[l] !== C.dec[l]); if (!l) return; p.t0 = p.t0 || Date.now(); p.a[l] = C.dec[l]; p.lk.push(l); p.h++; msg = ''; cdone(p); sv(); draw() }
    function chk() { const p = prog('c'); cini(p); p.t0 = p.t0 || Date.now(); p.c++; p.bad = C.ord.filter(l => p.a[l] && p.a[l] !== C.dec[l]); msg = p.bad.length ? `${p.bad.length} letra(s) incorrecta(s)` : 'Todo lo asignado es correcto'; sv(); draw() }
    function giveup() { const p = prog('c'); fin('cifra', { st: 'lost', h: p.h || 0, c: p.c || 0, t: Date.now() - (p.t0 || Date.now()) }); draw() }
    function csel(b) { if (R('cifra')) return; prog('c').t0 = prog('c').t0 || Date.now(); sel = b.dataset.l; draw() }

    DailyArcade.register({
        id: 'cifra', name: 'Cifrado', desc: 'Descifra la frase: cada letra esconde otra.', color: '--berry', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/></svg>',
        how: ["Cada letra de la frase está <b>cambiada por otra</b>, y siempre por la misma.", "Toca una letra cifrada y <b>escribe la que crees</b> que es.", "Revelar letra y Comprobar <b>restan puntos</b>."],
        demo: `<p class="cap">Si descubres que la <b>K</b> es una <b>A</b>, todas las K son A:</p><div class="wd"><div class="c"><small>X</small><b>C</b></div><div class="c sel"><small>K</small><b>A</b></div><div class="c"><small>M</small><b>S</b></div><div class="c sel"><small>K</small><b>A</b></div></div>`,
        pk: 'c',
        render: cifra,
        onKey: ck,
        actions: { sel: csel, pista: hint, comprobar: chk, rendirme: confirma(giveup) },   // data-a="..." de los botones del juego
        status: (r, p) => r ? (r.st == 'completed' ? `Descifrada · ${mmss(r.t)}` : 'Rendida') : (p && (p.g && p.g.length || p.t0) ? 'En curso' : 'Sin jugar')
    });
})();
