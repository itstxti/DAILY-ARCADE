/* Juego: Cifrado — descifra la frase: cada letra esconde otra. */
(function () {
    const AL = 'abcdefghijklmnñopqrstuvwxyz'; // las frases salen de content/frases.js
    const mkC = () => {
        const [ph, au] = Content.fraseDe(DAY), pl = [...ph].map(nz).join(''), a = [...AL], r = rng(DAY * 31 + 7);
        for (let i = 26; i > 0; i--) { const j = Math.floor(r() * i);[a[i], a[j]] = [a[j], a[i]] }
        const enc = {}, dec = {}; AL.split('').forEach((l, i) => { enc[l] = a[i]; dec[a[i]] = l });
        const ci = [...pl].map(c => enc[c] || c).join(''), ord = [...new Set(ci.split('').filter(c => dec[c]))], k = [1, 4, 4, 3, 3, 2, 2][WD];
        return { ph, au: au || 'Refrán popular', pl, ci, enc, dec, ord, rev: [...new Set(pl.split('').filter(c => enc[c]))].slice(0, k) }
    };
    let _c; const C = new Proxy({}, { get: (_, k) => (_c = _c || mkC())[k] });
    function cini(p) { if (p.ph !== C.ph) { Object.keys(p).forEach(k => delete p[k]); p.ph = C.ph } if (!p.a) { p.a = {}; p.lk = []; p.h = 0; p.c = 0; p.bad = []; C.rev.forEach(l => { p.a[C.enc[l]] = l; p.lk.push(C.enc[l]) }) } }
    function cdone(p) { if (C.ord.every(l => p.a[l] === C.dec[l])) fin('cifra', { st: 'completed', sc: Math.max(20, 100 - 12 * p.h - 4 * p.c), t: Date.now() - p.t0 }) }
    const est = sc => sc >= 90 ? 5 : sc >= 75 ? 4 : sc >= 55 ? 3 : sc >= 35 ? 2 : 1;
    function cifra() {
        const p = prog('c'); cini(p); const r = R('cifra'), cnt = {}; Object.values(p.a).forEach(v => cnt[v] = (cnt[v] || 0) + 1);
        const w = C.ci.split(' ').map(x => `<div class="wd">${[...x].map(l => C.dec[l] ? `<button class="c ${sel == l ? 'sel' : ''} ${p.lk.includes(l) ? 'lk' : ''} ${p.a[l] && cnt[p.a[l]] > 1 ? 'cf' : ''} ${p.bad.includes(l) ? 'bd' : ''}" data-a="sel" data-l="${l}" aria-label="Letra cifrada ${l}"><small>${l.toUpperCase()}</small><b>${r ? C.dec[l] : p.a[l] || ''}</b></button>` : `<span class="pu">${l}</span>`).join('')}</div>`).join('');
        let b = `<div class="words">${w}</div>`;
        if (r) {
            const n = est(r.sc);
            b += res(r.st == 'completed' ? `¡Descifrada! ${r.sc} puntos` : 'Rendida', `“${C.ph}” — ${C.au}`, `Daily Arcade · Cifrado #${DAY} ${r.st == 'completed' ? '⭐'.repeat(n) + '☆'.repeat(5 - n) + ' · ' + mmss(r.t) : 'rendida'}`)
        }
        else b += `${S.set.tm ? `<p class="tm" id="tm">${p.t0 ? mmss(Date.now() - p.t0) : '0:00'}</p>` : ''}<p class="msg" role="status">${msg}</p><div class="row" style="justify-content:center"><button class="btn" data-a="hint">Revelar letra (−12)</button><button class="btn" data-a="chk">Comprobar (−4)</button><button class="btn" data-a="giveup">Rendirme</button></div>` + kb(null, false);
        return shell('Cifrado', b)
    }
    function ck(m) {
        const p = prog('c'); cini(p); if (R('cifra') || !sel || p.lk.includes(sel)) return; p.t0 = p.t0 || Date.now(); msg = ''; p.bad = p.bad.filter(l => l != sel);
        if (m == 'Del') delete p.a[sel]; else if (m != 'Enter') { p.a[sel] = m; const o = C.ord, i = o.indexOf(sel), nx = o.slice(i + 1).concat(o.slice(0, i)).find(l => !p.a[l]); if (nx) sel = nx }
        cdone(p); sv(); draw()
    }
    function hint() { const p = prog('c'); cini(p); const l = C.ord.find(l => p.a[l] !== C.dec[l]); if (!l) return; p.t0 = p.t0 || Date.now(); p.a[l] = C.dec[l]; p.lk.push(l); p.h++; msg = ''; cdone(p); sv(); draw() }
    function chk() { const p = prog('c'); cini(p); p.t0 = p.t0 || Date.now(); p.c++; p.bad = C.ord.filter(l => p.a[l] && p.a[l] !== C.dec[l]); msg = p.bad.length ? `${p.bad.length} letra(s) incorrecta(s)` : 'Todo lo asignado es correcto'; sv(); draw() }
    function giveup() { const p = prog('c'); fin('cifra', { st: 'lost', sc: 0, t: Date.now() - (p.t0 || Date.now()) }); draw() }
    function csel(b) { if (R('cifra')) return; prog('c').t0 = prog('c').t0 || Date.now(); sel = b.dataset.l; draw() }

    DailyArcade.register({
        id: 'cifra', name: 'Cifrado', desc: 'Descifra la frase: cada letra esconde otra.', color: '--berry', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/></svg>',
        how: ["Cada letra de la frase está <b>cambiada por otra</b>, y siempre por la misma.", "Toca una letra cifrada y <b>escribe la que crees</b> que es.", "Revelar letra y Comprobar <b>restan puntos</b>."],
        demo: `<p class="cap">Si descubres que la <b>K</b> es una <b>A</b>, todas las K son A:</p><div class="wd"><div class="c"><small>X</small><b>C</b></div><div class="c sel"><small>K</small><b>A</b></div><div class="c"><small>M</small><b>S</b></div><div class="c sel"><small>K</small><b>A</b></div></div>`,
        pk: 'c',
        winLabel: 'descifradas',
        render: cifra,
        onKey: ck,
        actions: { sel: csel, hint, chk, giveup },   // data-a="..." de los botones del juego
        status: (r, p) => r ? (r.st == 'completed' ? `Descifrada · ${r.sc} puntos` : 'Rendida') : (p && (p.g && p.g.length || p.t0) ? 'En curso' : 'Sin jugar'),
        stats: (e, w) => { if (!w.length) return ''; const m = Math.max(...w.map(x => x.sc)), n = est(m); return kpi([[m, 'mejor puntuación', '★'.repeat(n) + '☆'.repeat(5 - n)], [Math.round(avg(w.map(x => x.sc))), 'media'], [mmss(Math.min(...w.map(x => x.t))), 'mejor tiempo']]) }
    });
})();
