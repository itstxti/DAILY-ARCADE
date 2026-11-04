/* Daily Arcade · teclado
   Navegación con teclado común a toda la web (los juegos de puntero, Sopa y Tuberías, llevan además su propio cursor).
   - Tab recorre los controles; en los tableros (data-rv) y teclados en pantalla solo hay UNA parada de Tab y se circula con las flechas.
   - Flechas: mueven el foco al control más cercano en esa dirección (inicio, tableros, ajustes, rankings…).
     Un juego puede quedarse las flechas para sí con `flechas: true` al registrarse (Camino).
   - Esc: vuelve atrás (el botón « ‹ … » de la cabecera).
   - draw() repinta todo con innerHTML, lo que sacaba el foco del botón pulsado: guarda()/repinta() lo devuelven al mismo control.
     Solo se hace cuando el último gesto fue de teclado, para no cambiar nada a quien juega con ratón o con el dedo. */
const Teclado = (() => {
  const FOC = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
  const DIR = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const app = () => document.getElementById('app');
  const visible = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const campo = e => e && e.matches && e.matches('input,textarea,select,[contenteditable="true"]');
  let kbd = false; // ¿el último gesto fue de teclado?
  addEventListener('keydown', e => { if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) kbd = true }, true);
  addEventListener('pointerdown', () => { kbd = false }, true);

  /* ---------- Foco al repintar ---------- */
  /* Selector que vuelve a encontrar el elemento tras repintar: su id o, si no, su etiqueta + todos sus data-*. */
  function selector(a) {
    if (a.id) return '#' + CSS.escape(a.id);
    const d = Object.entries(a.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}="${CSS.escape(v)}"]`).join('');
    return a.tagName.toLowerCase() + d + (a.classList.contains('lnk') ? '.lnk' : '')
  }
  function guarda() {
    const a = document.activeElement, A = app();
    if (!a || a === A || !A.contains(a) || (!kbd && !a.closest('[data-rv]'))) return null;
    let q; try { q = selector(a) } catch (_) { return null }
    const n = [...A.querySelectorAll(q)].indexOf(a);
    return { q, n: Math.max(n, 0), ini: campo(a) ? [a.selectionStart, a.selectionEnd] : null }
  }
  function titulo() {
    const h = app().querySelector('h1'); if (!h) return;
    if (!h.hasAttribute('tabindex')) h.tabIndex = -1;
    h.focus({ preventScroll: true })
  }
  /* Tras repintar: misma pantalla → mismo control (o su vecino si desapareció); pantalla nueva → el título, para que el siguiente Tab empiece arriba. */
  function repinta(f, mismo) {
    if (f) {
      if (!mismo) titulo();
      else {
        const l = [...app().querySelectorAll(f.q)].filter(e => !e.disabled), e = l[Math.min(f.n, l.length - 1)];
        if (e) { e.focus({ preventScroll: true }); if (document.activeElement !== e) titulo(); else if (f.ini && e.setSelectionRange) try { e.setSelectionRange(f.ini[0], f.ini[1]) } catch (_) { } }
        else titulo()
      }
    }
    rueda()
  }

  /* ---------- Una sola parada de Tab por tablero (roving tabindex) ---------- */
  const RV = {}; // índice recordado de cada tablero
  const grupos = () => [...app().querySelectorAll('[data-rv]')];
  const clave = c => c.dataset.rv;
  function rueda() {
    app().querySelectorAll('.kb button').forEach(b => { b.tabIndex = -1 }); // teclado en pantalla: solo táctil/ratón; con teclado físico se escribe directamente
    grupos().forEach(c => {
      const l = [...c.querySelectorAll('button:not([disabled])')]; if (!l.length) return;
      const f = l.findIndex(b => b === document.activeElement), k = clave(c);
      const n = f >= 0 ? f : Math.min(RV[k] || 0, l.length - 1);
      l.forEach((b, j) => { b.tabIndex = j == n ? 0 : -1 })
    })
  }
  addEventListener('focusin', e => {
    const c = e.target.closest && e.target.closest('[data-rv]'); if (!c || !app().contains(c)) return;
    const l = [...c.querySelectorAll('button:not([disabled])')], j = l.indexOf(e.target); if (j < 0) return;
    RV[clave(c)] = j; l.forEach((b, k) => { b.tabIndex = k == j ? 0 : -1 })
  });

  /* ---------- Flechas: foco al vecino más cercano ---------- */
  function vecino(t, d) {
    const r = t.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let mejor = null, m = Infinity;
    app().querySelectorAll(FOC).forEach(e => {
      if (e === t || e.tabIndex < -1 || e.closest('[hidden],.kb') || !visible(e)) return;
      const q = e.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
      const p = dx * d[0] + dy * d[1], s = Math.abs(dx * d[1] + dy * d[0]); // p: avance en esa dirección; s: desvío lateral
      if (p < 2) return;
      const v = p + 2.5 * s; if (v < m) { m = v; mejor = e }
    });
    return mejor
  }
  addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const t = e.target, A = app();
    if (e.key == 'Escape') return atras(e);
    const d = DIR[e.key]; if (!d || !A || !t || campo(t)) return;
    if (!A.contains(t) || t === A) { // sin foco en la pantalla: las flechas llevan al tablero del juego (selección actual o última casilla)
      const g0 = typeof cur == 'function' && cur(); if (!g0 || g0.flechas) return;
      const s = A.querySelector('[data-rv] button.sel:not([disabled]),[data-rv] button[aria-pressed="true"]:not([disabled]),[data-rv] button[tabindex="0"]');
      if (s) { e.preventDefault(); s.focus() } return
    }
    const g = typeof cur == 'function' && cur(); if (g && g.flechas) return;
    const n = vecino(t, d); if (!n) return;
    e.preventDefault(); n.focus({ preventScroll: false });
    if (n.dataset && (n.dataset.a == 'sc' || n.dataset.a == 'sel')) n.click() // Sudoku y Cifrado: moverse también selecciona la casilla/letra
  });

  /* ---------- Esc: volver ---------- */
  function atras(e) {
    if (campo(e.target) || (typeof DU != 'undefined' && DU) || (typeof V != 'undefined' && V == 'home')) return;
    if (typeof Duelo != 'undefined' && Duelo.ocupado && Duelo.ocupado()) return;
    const b = app().querySelector('.bar .bk[data-a="go"]'); if (!b) return;
    e.preventDefault(); b.click()
  }

  /* Texto para lectores de pantalla (cursor de Sopa y Tuberías). */
  const anuncia = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t };

  return { guarda, repinta, anuncia }
})();
