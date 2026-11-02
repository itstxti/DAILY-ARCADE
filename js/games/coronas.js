/* Juego: Coronas — una corona por fila, columna y color, sin tocarse. */
(function () {
    const N = [9, 6, 6, 7, 7, 8, 8][WD];
    const REG = ['#F7C6C7', '#F9DDA4', '#C9E4A7', '#A8DCD1', '#B7CCF3', '#D4C1EC', '#F2B8D8', '#D9D2B6', '#BFD6E0'];
    const mkG = () => {
        const r = rng(SD * 13 + 5), cols = [];
        const place = row => { if (row == N) return true; for (const c of shuf([...Array(N).keys()], r)) { if (cols.includes(c) || (row && Math.abs(c - cols[row - 1]) < 2)) continue; cols.push(c); if (place(row + 1)) return true; cols.pop() } return false };
        place(0); const reg = Array(N * N).fill(-1); cols.forEach((c, y) => reg[y * N + c] = y);
        for (let left = N * N - N; left > 0; left--) { const f = []; for (let i = 0; i < N * N; i++)if (reg[i] < 0) { const x = i % N, y = (i / N) | 0;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const a = x + dx, b = y + dy; if (a >= 0 && a < N && b >= 0 && b < N && reg[b * N + a] >= 0) f.push([i, reg[b * N + a]]) }) } const [i, v] = f[Math.floor(r() * f.length)]; reg[i] = v }
        return reg
    };
    const _g = memoSD(mkG), G = new Proxy([], { get: (_, k) => _g()[k] }); // G[i] = región de la casilla i
    function conf(b) {
        const cr = [], bad = new Set(); b.forEach((v, i) => v == 2 && cr.push(i));
        cr.forEach(i => cr.forEach(j => { if (i < j) { const xi = i % N, yi = (i / N) | 0, xj = j % N, yj = (j / N) | 0; if (xi == xj || yi == yj || G[i] == G[j] || (Math.abs(xi - xj) < 2 && Math.abs(yi - yj) < 2)) { bad.add(i); bad.add(j) } } })); return { bad, n: cr.length }
    }
    function coronas() {
        const p = prog('o'); p.b = p.b && p.b.length == N * N ? p.b : Array(N * N).fill(0); const r = R('coronas'), { bad } = conf(p.b); let z = '';
        for (let i = 0; i < N * N; i++) {
            const x = i % N, y = (i / N) | 0, d = (a, b) => a < 0 || b < 0 || a >= N || b >= N || G[b * N + a] != G[i] ? 3 : 1;
            z += `<button class="z ${S.set.hl && bad.has(i) ? 'cf' : ''}" style="background:${REG[G[i]]};border-width:${d(x, y - 1)}px ${d(x + 1, y)}px ${d(x, y + 1)}px ${d(x - 1, y)}px" data-a="cell" data-i="${i}" aria-label="Fila ${y + 1}, columna ${x + 1}, región ${'ABCDEFGHI'[G[i]]}, ${['vacía', 'marcada', 'corona'][p.b[i]]}"><small>${'ABCDEFGHI'[G[i]]}</small>${['', '✕', '♛'][p.b[i]]}</button>`
        }
        let b = `<div class="bd2" style="grid-template-columns:repeat(${N},1fr)">${z}</div>`;
        if (r) b += res(`¡Completado en ${mmss(r.t)}!`, `Tablero de ${N}×${N}. Vuelve mañana para un reto nuevo.`, `Daily Arcade · Coronas #${DAY} · ${N}×${N} · ${mmss(r.t)}`);
        else b += `${S.set.tm ? `<p class="tm" id="tm">${p.t0 ? mmss(Date.now() - p.t0) : '0:00'}</p>` : ''}<div class="row" style="justify-content:center"><button class="btn" data-a="undo">Deshacer</button></div><p class="msg">Toca una casilla: vacía → ✕ → corona.</p>`;
        return shell('Coronas', b)
    }
    function cell(i) {
        const p = prog('o'); if (R('coronas')) return; p.b = p.b && p.b.length == N * N ? p.b : Array(N * N).fill(0); p.t0 = p.t0 || Date.now(); hist.push(p.b.slice()); p.b[i] = (p.b[i] + 1) % 3;
        const c = conf(p.b); if (c.n == N && !c.bad.size) fin('coronas', { st: 'completed', t: Date.now() - p.t0, N }); sv(); draw()
    }
    function undo() { const p = prog('o'); if (hist.length && !R('coronas')) { p.b = hist.pop(); sv(); draw() } }

    DailyArcade.register({
        id: 'coronas', name: 'Coronas', desc: 'Una corona por fila, columna y color, sin tocarse.', color: '--sun', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/><path d="M5 21h14"/></svg>',
        how: ["Una corona ♛ en cada <b>fila</b>, <b>columna</b> y <b>color</b>.", "Las coronas <b>no pueden tocarse</b>, ni en diagonal.", "Toca una casilla: vacía → ✕ → ♛."],
        demo: (() => { const g = [0, 0, 1, 1, 0, 3, 3, 1, 2, 2, 3, 3, 2, 2, 3, 3], c = [1, 7, 8, 14]; return `<p class="cap">Ejemplo resuelto:</p><div class="bd2" style="grid-template-columns:repeat(4,1fr)">${g.map((r, i) => `<span class="z" style="background:${REG[r]}">${c.includes(i) ? '♛' : ''}</span>`).join('')}</div>` })(),
        pk: 'o',
        winLabel: 'completadas',
        winStreak: false,        // no muestra "victorias seguidas" en el perfil
        render: coronas,
        actions: { cell: b => cell(+b.dataset.i), undo },
        status: (r, p) => r ? `Completada · ${mmss(r.t)}` : (p && (p.g && p.g.length || p.t0) ? 'En curso' : 'Sin jugar'),
        stats: (e, w) => w.length ? kpi([[mmss(Math.min(...w.map(x => x.t))), 'mejor tiempo'], [mmss(avg(w.map(x => x.t))), 'tiempo medio']]) : ''
    });
})();
