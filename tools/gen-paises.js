/* Genera content/paises.js (siluetas de países para el juego «País») a partir de Natural Earth (dominio público) vía el paquete npm world-atlas.
   Uso (desde una carpeta con las dependencias, no hace falta en el proyecto):
      npm i world-atlas@2 topojson-client@3 && node tools/gen-paises.js > content/paises.js
   Cada país: [nombre, [otros nombres válidos], continente, capital, fácil (1/0), ancho, alto, trazado SVG]. El trazado cabe en 100 unidades
   (proyección plana corregida por la latitud media). Para añadir un país: una línea en TABLA con el nombre que usa world-atlas. */
const topo = require('world-atlas/countries-110m.json'), { feature } = require('topojson-client');
const fs = require('fs');
const AN = 'América del Norte', AC = 'América Central y Caribe', AS = 'América del Sur', EU = 'Europa', AF = 'África', AZ = 'Asia', OC = 'Oceanía';
/* [nombre en world-atlas, nombre en español, [alias], continente, capital, fácil] */
const TABLA = [
   ['Canada', 'Canadá', [], AN, 'Ottawa', 1], ['United States of America', 'Estados Unidos', ['EE. UU.', 'EEUU', 'USA', 'Estados Unidos de América'], AN, 'Washington D. C.', 1],
   ['Mexico', 'México', ['Méjico'], AN, 'Ciudad de México', 1], ['Brazil', 'Brasil', [], AS, 'Brasilia', 1], ['Argentina', 'Argentina', [], AS, 'Buenos Aires', 1],
   ['Chile', 'Chile', [], AS, 'Santiago', 1], ['Peru', 'Perú', [], AS, 'Lima', 1], ['Colombia', 'Colombia', [], AS, 'Bogotá', 1], ['Venezuela', 'Venezuela', [], AS, 'Caracas', 1],
   ['Cuba', 'Cuba', [], AC, 'La Habana', 1], ['Spain', 'España', [], EU, 'Madrid', 1], ['France', 'Francia', [], EU, 'París', 1], ['Italy', 'Italia', [], EU, 'Roma', 1],
   ['Germany', 'Alemania', [], EU, 'Berlín', 1], ['United Kingdom', 'Reino Unido', ['Gran Bretaña', 'UK', 'Inglaterra'], EU, 'Londres', 1], ['Ireland', 'Irlanda', [], EU, 'Dublín', 1],
   ['Portugal', 'Portugal', [], EU, 'Lisboa', 1], ['Russia', 'Rusia', [], 'Europa y Asia', 'Moscú', 1], ['China', 'China', [], AZ, 'Pekín', 1], ['India', 'India', [], AZ, 'Nueva Delhi', 1],
   ['Japan', 'Japón', [], AZ, 'Tokio', 1], ['Australia', 'Australia', [], OC, 'Canberra', 1], ['New Zealand', 'Nueva Zelanda', [], OC, 'Wellington', 1], ['Egypt', 'Egipto', [], AF, 'El Cairo', 1],
   ['South Africa', 'Sudáfrica', [], AF, 'Pretoria', 1], ['Morocco', 'Marruecos', [], AF, 'Rabat', 1], ['Madagascar', 'Madagascar', [], AF, 'Antananarivo', 1], ['Iceland', 'Islandia', [], EU, 'Reikiavik', 1],
   ['Greece', 'Grecia', [], EU, 'Atenas', 1], ['Turkey', 'Turquía', [], 'Asia y Europa', 'Ankara', 1], ['Saudi Arabia', 'Arabia Saudí', ['Arabia Saudita'], AZ, 'Riad', 1],
   ['Indonesia', 'Indonesia', [], AZ, 'Yakarta', 1], ['South Korea', 'Corea del Sur', [], AZ, 'Seúl', 1],
   ['Norway', 'Noruega', [], EU, 'Oslo', 0], ['Sweden', 'Suecia', [], EU, 'Estocolmo', 0], ['Finland', 'Finlandia', [], EU, 'Helsinki', 0], ['Denmark', 'Dinamarca', [], EU, 'Copenhague', 0],
   ['Poland', 'Polonia', [], EU, 'Varsovia', 0], ['Ukraine', 'Ucrania', [], EU, 'Kiev', 0], ['Romania', 'Rumanía', ['Rumania'], EU, 'Bucarest', 0], ['Bulgaria', 'Bulgaria', [], EU, 'Sofía', 0],
   ['Hungary', 'Hungría', [], EU, 'Budapest', 0], ['Austria', 'Austria', [], EU, 'Viena', 0], ['Switzerland', 'Suiza', [], EU, 'Berna', 0], ['Belgium', 'Bélgica', [], EU, 'Bruselas', 0],
   ['Netherlands', 'Países Bajos', ['Holanda'], EU, 'Ámsterdam', 0], ['Croatia', 'Croacia', [], EU, 'Zagreb', 0], ['Serbia', 'Serbia', [], EU, 'Belgrado', 0], ['Belarus', 'Bielorrusia', ['Belarús'], EU, 'Minsk', 0],
   ['Lithuania', 'Lituania', [], EU, 'Vilna', 0], ['Latvia', 'Letonia', [], EU, 'Riga', 0], ['Estonia', 'Estonia', [], EU, 'Tallin', 0], ['Slovakia', 'Eslovaquia', [], EU, 'Bratislava', 0],
   ['Czechia', 'Chequia', ['República Checa'], EU, 'Praga', 0], ['Bosnia and Herz.', 'Bosnia y Herzegovina', ['Bosnia'], EU, 'Sarajevo', 0], ['Albania', 'Albania', [], EU, 'Tirana', 0],
   ['Macedonia', 'Macedonia del Norte', ['Macedonia'], EU, 'Skopie', 0], ['Montenegro', 'Montenegro', [], EU, 'Podgorica', 0], ['Slovenia', 'Eslovenia', [], EU, 'Liubliana', 0],
   ['Moldova', 'Moldavia', [], EU, 'Chisináu', 0], ['Cyprus', 'Chipre', [], EU, 'Nicosia', 0], ['Georgia', 'Georgia', [], AZ, 'Tiflis', 0], ['Armenia', 'Armenia', [], AZ, 'Ereván', 0],
   ['Azerbaijan', 'Azerbaiyán', [], AZ, 'Bakú', 0], ['Kazakhstan', 'Kazajistán', ['Kazajstán'], AZ, 'Astaná', 0], ['Uzbekistan', 'Uzbekistán', [], AZ, 'Taskent', 0],
   ['Turkmenistan', 'Turkmenistán', [], AZ, 'Asjabad', 0], ['Kyrgyzstan', 'Kirguistán', ['Kirguizistán'], AZ, 'Biskek', 0], ['Tajikistan', 'Tayikistán', [], AZ, 'Dusambé', 0],
   ['Afghanistan', 'Afganistán', [], AZ, 'Kabul', 0], ['Pakistan', 'Pakistán', [], AZ, 'Islamabad', 0], ['Iran', 'Irán', [], AZ, 'Teherán', 0], ['Iraq', 'Irak', [], AZ, 'Bagdad', 0],
   ['Syria', 'Siria', [], AZ, 'Damasco', 0], ['Lebanon', 'Líbano', [], AZ, 'Beirut', 0], ['Israel', 'Israel', [], AZ, 'Jerusalén', 0], ['Jordan', 'Jordania', [], AZ, 'Amán', 0],
   ['Yemen', 'Yemen', [], AZ, 'Saná', 0], ['Oman', 'Omán', [], AZ, 'Mascate', 0], ['United Arab Emirates', 'Emiratos Árabes Unidos', ['Emiratos'], AZ, 'Abu Dabi', 0], ['Qatar', 'Catar', ['Qatar'], AZ, 'Doha', 0],
   ['Kuwait', 'Kuwait', [], AZ, 'Kuwait', 0], ['Nepal', 'Nepal', [], AZ, 'Katmandú', 0], ['Bhutan', 'Bután', [], AZ, 'Timbu', 0], ['Bangladesh', 'Bangladés', ['Bangladesh'], AZ, 'Daca', 0],
   ['Myanmar', 'Birmania', ['Myanmar'], AZ, 'Naipyidó', 0], ['Thailand', 'Tailandia', [], AZ, 'Bangkok', 0], ['Laos', 'Laos', [], AZ, 'Vientián', 0], ['Cambodia', 'Camboya', [], AZ, 'Nom Pen', 0],
   ['Vietnam', 'Vietnam', [], AZ, 'Hanói', 0], ['Malaysia', 'Malasia', [], AZ, 'Kuala Lumpur', 0], ['Philippines', 'Filipinas', [], AZ, 'Manila', 0], ['Mongolia', 'Mongolia', [], AZ, 'Ulán Bator', 0],
   ['North Korea', 'Corea del Norte', [], AZ, 'Pionyang', 0], ['Papua New Guinea', 'Papúa Nueva Guinea', [], OC, 'Port Moresby', 0],
   ['Algeria', 'Argelia', [], AF, 'Argel', 0], ['Libya', 'Libia', [], AF, 'Trípoli', 0], ['Tunisia', 'Túnez', [], AF, 'Túnez', 0], ['Mauritania', 'Mauritania', [], AF, 'Nuakchot', 0],
   ['Mali', 'Malí', ['Mali'], AF, 'Bamako', 0], ['Niger', 'Níger', ['Niger'], AF, 'Niamey', 0], ['Chad', 'Chad', [], AF, 'Yamena', 0], ['Sudan', 'Sudán', [], AF, 'Jartum', 0],
   ['S. Sudan', 'Sudán del Sur', [], AF, 'Yuba', 0], ['Ethiopia', 'Etiopía', [], AF, 'Adís Abeba', 0], ['Somalia', 'Somalia', [], AF, 'Mogadiscio', 0], ['Kenya', 'Kenia', ['Kenya'], AF, 'Nairobi', 0],
   ['Tanzania', 'Tanzania', [], AF, 'Dodoma', 0], ['Uganda', 'Uganda', [], AF, 'Kampala', 0], ['Dem. Rep. Congo', 'República Democrática del Congo', ['RD Congo', 'RDC', 'Congo Kinshasa'], AF, 'Kinsasa', 0],
   ['Congo', 'República del Congo', ['Congo', 'Congo Brazzaville'], AF, 'Brazzaville', 0], ['Angola', 'Angola', [], AF, 'Luanda', 0], ['Zambia', 'Zambia', [], AF, 'Lusaka', 0],
   ['Zimbabwe', 'Zimbabue', ['Zimbabwe'], AF, 'Harare', 0], ['Mozambique', 'Mozambique', [], AF, 'Maputo', 0], ['Namibia', 'Namibia', [], AF, 'Windhoek', 0], ['Botswana', 'Botsuana', ['Botswana'], AF, 'Gaborone', 0],
   ['Nigeria', 'Nigeria', [], AF, 'Abuya', 0], ['Ghana', 'Ghana', [], AF, 'Accra', 0], ['Senegal', 'Senegal', [], AF, 'Dakar', 0], ["Côte d'Ivoire", 'Costa de Marfil', [], AF, 'Yamusukro', 0],
   ['Cameroon', 'Camerún', [], AF, 'Yaundé', 0], ['Gabon', 'Gabón', [], AF, 'Libreville', 0], ['Guinea', 'Guinea', [], AF, 'Conakri', 0], ['Liberia', 'Liberia', [], AF, 'Monrovia', 0],
   ['Sierra Leone', 'Sierra Leona', [], AF, 'Freetown', 0], ['Burkina Faso', 'Burkina Faso', [], AF, 'Uagadugú', 0], ['Benin', 'Benín', ['Benin'], AF, 'Portonovo', 0], ['Togo', 'Togo', [], AF, 'Lomé', 0],
   ['Central African Rep.', 'República Centroafricana', ['Centroáfrica'], AF, 'Bangui', 0], ['Eq. Guinea', 'Guinea Ecuatorial', [], AF, 'Malabo', 0], ['Eritrea', 'Eritrea', [], AF, 'Asmara', 0],
   ['Malawi', 'Malaui', ['Malawi'], AF, 'Lilongüe', 0], ['Lesotho', 'Lesoto', ['Lesotho'], AF, 'Maseru', 0], ['Rwanda', 'Ruanda', ['Rwanda'], AF, 'Kigali', 0], ['Gambia', 'Gambia', [], AF, 'Banjul', 0],
   ['Guinea-Bissau', 'Guinea-Bisáu', ['Guinea Bissau'], AF, 'Bisáu', 0],
   ['Bolivia', 'Bolivia', [], AS, 'Sucre', 0], ['Paraguay', 'Paraguay', [], AS, 'Asunción', 0], ['Uruguay', 'Uruguay', [], AS, 'Montevideo', 0], ['Ecuador', 'Ecuador', [], AS, 'Quito', 0],
   ['Guyana', 'Guyana', [], AS, 'Georgetown', 0], ['Suriname', 'Surinam', ['Suriname'], AS, 'Paramaribo', 0], ['Panama', 'Panamá', [], AC, 'Panamá', 0], ['Costa Rica', 'Costa Rica', [], AC, 'San José', 0],
   ['Nicaragua', 'Nicaragua', [], AC, 'Managua', 0], ['Honduras', 'Honduras', [], AC, 'Tegucigalpa', 0], ['El Salvador', 'El Salvador', [], AC, 'San Salvador', 0], ['Guatemala', 'Guatemala', [], AC, 'Ciudad de Guatemala', 0],
   ['Belize', 'Belice', [], AC, 'Belmopán', 0], ['Haiti', 'Haití', [], AC, 'Puerto Príncipe', 0], ['Dominican Rep.', 'República Dominicana', [], AC, 'Santo Domingo', 0], ['Jamaica', 'Jamaica', [], AC, 'Kingston', 0]
];
/* Recortes para no dibujar territorios lejanos: [lonMin, latMin, lonMax, latMax] */
const CAJA = { France: [-6, 41, 10, 52], 'United States of America': [-126, 24, -66, 50], Norway: [4, 57, 32, 72], Russia: [18, 40, 200, 82], Spain: [-10, 35, 5, 44], Portugal: [-10, 36, -6, 43], Chile: [-80, -56, -66, -17], Netherlands: [3, 50, 8, 54], Denmark: [8, 54, 13, 58] };
const feats = feature(topo, topo.objects.countries).features, por = new Map(feats.map(f => [f.properties.name, f]));
const area = r => { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(a / 2) };
const salida = [], faltan = [];
for (const [an, es, al, cont, cap, fac] of TABLA) {
   const f = por.get(an); if (!f) { faltan.push(an); continue }
   let polis = f.geometry.type == 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
   if (an == 'Russia') polis = polis.map(p => p.map(r => r.map(v => v[0] < 0 ? [v[0] + 360, v[1]] : v)));   // Chukotka cruza la línea de fecha
   const c = CAJA[an]; if (c) polis = polis.filter(p => { const q = p[0], cx = q.reduce((s, v) => s + v[0], 0) / q.length, cy = q.reduce((s, v) => s + v[1], 0) / q.length; return cx >= c[0] && cx <= c[2] && cy >= c[1] && cy <= c[3] });
   const mx = Math.max(...polis.map(p => area(p[0]))); polis = polis.filter(p => area(p[0]) >= mx * 0.01);
   const pts = polis.flatMap(p => p[0]), lons = pts.map(v => v[0]), lats = pts.map(v => v[1]);
   const x0 = Math.min(...lons), x1 = Math.max(...lons), y0 = Math.min(...lats), y1 = Math.max(...lats), k = Math.cos((y0 + y1) / 2 * Math.PI / 180);
   const w = (x1 - x0) * k, h = y1 - y0, s = 100 / Math.max(w, h);
   const d = polis.map(p => p.map(r => { let ult = '', n = 0; const t = r.map(v => { const X = ((v[0] - x0) * k * s).toFixed(1), Y = ((y1 - v[1]) * s).toFixed(1); return X + ' ' + Y }).filter(v => v != ult && (ult = v)); n = t.length; return n < 3 ? '' : 'M' + t.join('L') + 'Z' }).join('')).join('');
   salida.push([es, al, cont, cap, fac, +(w * s).toFixed(1), +(h * s).toFixed(1), d])
}
if (faltan.length) console.error('Sin datos en world-atlas:', faltan.join(', '));
console.log(`/* Siluetas de países para el juego «País». Generado con tools/gen-paises.js a partir de Natural Earth (dominio público, vía world-atlas).\n   Cada país: [nombre, [otros nombres válidos], continente, capital, fácil (1/0), ancho, alto, trazado SVG]. Solo datos: ninguna imagen. */\nwindow.PAISES = ${JSON.stringify(salida).replace(/\],\[/g, '],\n[')};`);
