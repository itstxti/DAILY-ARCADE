/* Daily Arcade · lector del contenido diario (carpeta content/).
   Convierte los textos de content/*.js en listas, las valida y decide qué toca cada día.
   Regla: el reto nº N usa la línea N de la lista (si la lista se acaba, vuelve a empezar). */
const Contenido = {};
const Content = (() => {
   const norm = s => s.toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'ñ');
   const lineas = t => (t || '').split('\n').map(l => l.trim()).filter(l => l && l[0] != '#');
   const problemas = [], cache = {};
   let hoy = null; // reto de hoy traído del servidor (modo Supabase); si es null se usa la lista local
   const idx = (d, n) => (((d - 1) % n) + n) % n;
   // Longitud recomendada de la frase según el día de la semana (0 = domingo)
   const rango = [[30, 50], [70, 100], [70, 100], [55, 80], [55, 80], [40, 60], [40, 60]];

   function palabras() {
      if (cache.p) return cache.p; const vistas = new Set(); cache.p = [];
      lineas(Contenido.palabras).forEach(l => {
         const w = norm(l);
         if (!/^[a-zñ]{5}$/.test(w)) return problemas.push(`Palabra "${l}": no tiene 5 letras (se ignora).`);
         if (vistas.has(w)) return problemas.push(`Palabra "${l}": está repetida (se ignora la segunda).`);
         vistas.add(w); cache.p.push(w)
      });
      if (!cache.p.length) cache.p = ['perro'];
      return cache.p
   }

   function frases() {
      if (cache.f) return cache.f; const vistas = new Set(); cache.f = [];
      lineas(Contenido.frases).forEach(l => {
         const i = l.indexOf('|'), t = (i < 0 ? l : l.slice(0, i)).trim(), a = i < 0 ? '' : l.slice(i + 1).trim();
         if (!t) return;
         if (vistas.has(norm(t))) return problemas.push(`Frase repetida: "${t.slice(0, 40)}…" (se ignora la segunda).`);
         if (t.length < 25 || t.length > 110) problemas.push(`Frase "${t.slice(0, 40)}…": ${t.length} caracteres, fuera de lo razonable (25-110).`);
         vistas.add(norm(t)); cache.f.push([t, a || 'Refrán popular'])
      });
      if (!cache.f.length) cache.f = [['A quien madruga, Dios le ayuda', 'Refrán popular']];
      return cache.f
   }

   function aceptadas() {
      if (cache.a) return cache.a; cache.a = new Set(palabras());
      lineas(Contenido.aceptadas).forEach(l => { const w = norm(l); if (/^[a-zñ]{5}$/.test(w)) cache.a.add(w); else problemas.push(`Palabra aceptada "${l}": no tiene 5 letras (se ignora).`) });
      return cache.a
   }

   return {
      setHoy: r => { hoy = r },
      palabraDe: d => hoy && d == DAY ? hoy.p : palabras()[idx(d, palabras().length)],
      fraseDe: d => hoy && d == DAY ? [hoy.f, hoy.a] : frases()[idx(d, frases().length)],
      aceptadas, palabras, frases, rango,
      problemas: () => { palabras(); frases(); aceptadas(); return problemas.slice() }
   }
})();
