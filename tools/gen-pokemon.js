/* Genera content/pokemon.js (lista del juego «Pokémon») a partir de los datos abiertos de PokeAPI (solo textos: nombres, generación, tipos y color).
   Uso: node tools/gen-pokemon.js > content/pokemon.js   (necesita red; Node 18 o superior)
   Cada Pokémon: [número, nombre en español, generación, [tipos], color, [otros nombres válidos]]. Las imágenes NO se guardan: el juego las carga
   en directo desde el repositorio de sprites de PokeAPI (vía jsDelivr). Pokémon es marca de Nintendo, Game Freak y Creatures; esto es un proyecto de aficionados. */
const B = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/', MAX = 649, SALTAR = new Set([29, 32]);   // Nidoran♀/♂ se llaman igual al escribirlos
const csv = async n => { const t = await (await fetch(B + n + '.csv')).text(); const [h, ...f] = t.trim().split('\n'); const k = h.split(','); return f.map(l => { const c = []; let q = false, s = ''; for (const ch of l) { if (ch == '"') q = !q; else if (ch == ',' && !q) { c.push(s); s = '' } else s += ch } c.push(s); return Object.fromEntries(k.map((x, i) => [x, c[i]])) }) };
(async () => {
   const [nom, esp, tip, tnom, cnom] = await Promise.all(['pokemon_species_names', 'pokemon_species', 'pokemon_types', 'type_names', 'pokemon_color_names'].map(csv));
   const es = new Map(), en = new Map(), tn = new Map(), cn = new Map();
   nom.forEach(r => { if (r.local_language_id == 7) es.set(+r.pokemon_species_id, r.name); if (r.local_language_id == 9) en.set(+r.pokemon_species_id, r.name) });
   tnom.forEach(r => { if (r.local_language_id == 7) tn.set(+r.type_id, r.name) }); cnom.forEach(r => { if (r.local_language_id == 7) cn.set(+r.pokemon_color_id, r.name) });
   const out = [];
   for (const s of esp) {
      const id = +s.id; if (id > MAX || SALTAR.has(id)) continue;
      const tipos = tip.filter(t => +t.pokemon_id == id).sort((a, b) => a.slot - b.slot).map(t => tn.get(+t.type_id));
      const a = es.get(id), e = en.get(id); if (!a || !e || tipos.some(x => !x)) { console.error('Faltan datos de', id); continue }
      out.push([id, a, +s.generation_id, tipos, cn.get(+s.color_id) || '', a == e ? [] : [e]])
   }
   console.log(`/* Pokémon del juego «Pokémon». Generado con tools/gen-pokemon.js a partir de PokeAPI. Cada uno: [número, nombre, generación, [tipos], color, [otros nombres válidos]].\n   Solo textos: las imágenes se cargan en directo y no se guardan en el repositorio. */\nwindow.POKEMON = ${JSON.stringify(out).replace(/\],\[/g, '],\n[')};`)
})();
