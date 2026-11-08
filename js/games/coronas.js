/* Juego: Coronas — una corona por fila, columna y color, sin tocarse. */
(function () {
    const N = [9, 6, 6, 7, 7, 8, 8][WD];
    const REG = ['#F7C6C7', '#F9DDA4', '#C9E4A7', '#A8DCD1', '#B7CCF3', '#D4C1EC', '#F2B8D8', '#D9D2B6', '#BFD6E0'];
    const mkG = () => {
        const r = rng(SD * 13 + 5), cols = [];
        const place = row => { if (row == N) return true; for (const c of shuf([...Array(N).keys()], r)) { if (cols.includes(c) || (row && Math.abs(c - cols[row - 1]) < 2)) continue; cols.push(c); if (place(row + 1)) return true; cols.pop() } return false };
        place(0); const reg = Array(N * N).fill(-1); cols.forEach((c, y) => reg[y * N + c] = y);
        for (let left = N * N - N; left > 0; left--) { const f = []; for (let i = 0; i < N * N; i++)if (reg[i] < 0) { const x = i % N, y = (i / N) | 0;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const a = x + dx, b = y + dy; if (a >= 0 && a < N && b >= 0 && b < N && reg[b * N + a] >= 0) f.push([i, reg[b * N + a]]) }) } const [i, v] = f[Math.floor(r() * f.length)]; reg[i] = v }
        reg.cols = cols.slice(); return reg /* cols[fila] = columna de su corona (la solución) */
    };
    const _g = memoSD(mkG), G = new Proxy([], { get: (_, k) => _g()[k] }); // G[i] = región de la casilla i
    function conf(b) {
        const cr = [], bad = new Set(); b.forEach((v, i) => v == 2 && cr.push(i));
        cr.forEach(i => cr.forEach(j => { if (i < j) { const xi = i % N, yi = (i / N) | 0, xj = j % N, yj = (j / N) | 0; if (xi == xj || yi == yj || G[i] == G[j] || (Math.abs(xi - xj) < 2 && Math.abs(yi - yj) < 2)) { bad.add(i); bad.add(j) } } })); return { bad, n: cr.length }
    }
    const CORONA = '<svg class="cok-k" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/><path d="M5 21h14"/></svg>', EQUIS = '<svg class="cok-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';
    function coronas() {
        const p = prog('o'); p.b = p.b && p.b.length == N * N ? p.b : Array(N * N).fill(0); const r = R('coronas'), lost = r && r.st == 'lost', { bad, n } = conf(p.b), porR = Array(N).fill(0); let z = ''; p.b.forEach((v, i) => v == 2 && porR[G[i]]++);
        for (let i = 0; i < N * N; i++) {
            const x = i % N, y = (i / N) | 0, d = (a, b) => a < 0 || b < 0 || a >= N || b >= N || G[b * N + a] != G[i] ? 3 : 1;
            z += `<button class="z ${!lost && S.set.hl && bad.has(i) ? 'cf' : ''}" style="background:${REG[G[i]]};border-width:${d(x, y - 1)}px ${d(x + 1, y)}px ${d(x, y + 1)}px ${d(x - 1, y)}px" data-a="cell" data-i="${i}" aria-label="Fila ${y + 1}, columna ${x + 1}, región ${'ABCDEFGHI'[G[i]]}, ${['vacía', 'marcada', 'corona'][p.b[i]]}${S.set.hl && bad.has(i) ? ', en conflicto' : ''}"><small>${'ABCDEFGHI'[G[i]]}</small>${lost ? (G.cols[y] == x ? CORONA : '') : ['', EQUIS, CORONA][p.b[i]]}</button>`
        }
        const nc = r && !lost ? N : lost ? N : n, chips = porR.map((c, k) => `<span class="cok-c${c == 1 ? ' ok' : c > 1 ? ' bd' : ''}" style="background:${REG[k]}" title="Color ${'ABCDEFGHI'[k]}: ${c} ${c == 1 ? 'corona' : 'coronas'}">${'ABCDEFGHI'[k]}${c == 1 ? '<i aria-hidden="true">✓</i>' : c > 1 ? '<i aria-hidden="true">!</i>' : ''}</span>`).join('');
        let b = `<div class="ddb cok"><div class="cog"><span class="cog-t">${CORONA}<span>Una corona por <b>fila</b>, <b>columna</b> y <b>color</b>, sin tocarse</span></span><span class="cog-n" aria-live="polite">Coronas <b>${nc} / ${N}</b></span></div>`
            + `<div class="bd2" data-rv="coronas" role="group" aria-label="Tablero de coronas" style="grid-template-columns:repeat(${N},1fr)">${z}</div>`
            + (lost ? '' : `<div class="cok-l" role="group" aria-label="Colores con su corona: ${porR.filter(c => c == 1).length} de ${N}">${chips}</div>`) + `</div>`;
        if (r && r.st == 'lost') b += resRendida('Coronas', 'Así se resolvía: una corona por fila, columna y color. Vuelve mañana para un reto nuevo.'); else if (r) b += res(`¡Completado en ${mmss(r.t)}!`, `Tablero de ${N}×${N}. Vuelve mañana para un reto nuevo.`, `Daily Arcade · Coronas #${DAY} · ${N}×${N} · ${mmss(r.t)}`);
        else b += `${S.set.tm ? tmHtml(p) : ''}${controles({ undo: 1, reiniciar: 1, rendirme: 1 })}<p class="msg">Toca una casilla: vacía → ✕ → corona. El ✓ de un color significa que ya tiene su corona.</p>`;
        return shell('Coronas', b)
    }
    function cell(i) {
        const p = prog('o'); if (R('coronas')) return; p.b = p.b && p.b.length == N * N ? p.b : Array(N * N).fill(0); p.t0 = p.t0 || Date.now(); hist.push(p.b.slice()); p.b[i] = (p.b[i] + 1) % 3;
        const c = conf(p.b);
        Sfx.p(p.b[i] == 0 ? 'borra' : p.b[i] == 1 ? 'tap' : S.set.hl && c.bad.has(i) ? 'error' : 'corona'); if (c.n == N && !c.bad.size) fin('coronas', { st: 'completed', t: Date.now() - p.t0, N }); sv(); draw()
    }
    function reiniciar() { const p = prog('o'); if (R('coronas') || !p.b || !p.b.some(x => x)) return; hist.push(p.b.slice()); p.b = Array(N * N).fill(0); sv(); draw() }   // el tiempo no se reinicia; Deshacer lo recupera
    function undo() { const p = prog('o'); if (hist.length && !R('coronas')) { p.b = hist.pop(); sv(); draw() } }

   function rendirse() {
      if (R('coronas')) return;
      const p = prog('o'); fin('coronas', { st: 'lost', t: Date.now() - (p.t0 || Date.now()) }); sv(); draw()
   }

    DailyArcade.register({
        id: 'coronas', name: 'Coronas', desc: 'Una corona por fila, columna y color, sin tocarse.', color: '--sun', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/><path d="M5 21h14"/></svg>',
        how: ["Una corona ♛ en cada <b>fila</b>, <b>columna</b> y <b>color</b>.", "Las coronas <b>no pueden tocarse</b>, ni en diagonal.", "Toca una casilla: vacía → ✕ → ♛."],
        demo: (() => { const g = [0, 0, 1, 1, 0, 3, 3, 1, 2, 2, 3, 3, 2, 2, 3, 3], c = [1, 7, 8, 14]; return `<p class="cap">Ejemplo resuelto:</p><div class="bd2" style="grid-template-columns:repeat(4,1fr)">${g.map((r, i) => `<span class="z" style="background:${REG[r]}">${c.includes(i) ? '♛' : ''}</span>`).join('')}</div>` })(),
        pk: 'o',
        render: coronas,
        actions: { cell: b => cell(+b.dataset.i), undo, reiniciar, rendirme: confirma(rendirse) },
        status: (r, p) => r && r.st == 'lost' ? 'Rendida' : r ? `Completada · ${mmss(r.t)}` : (p && (p.g && p.g.length || p.t0) ? 'En curso' : 'Sin jugar')
    });
})();
