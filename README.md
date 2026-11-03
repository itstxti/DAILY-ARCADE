# Daily Arcade

Daily Arcade es una web de juegos diarios: cada día a medianoche (hora de Madrid) hay un reto nuevo en cada juego. Se puede jugar como invitado o con cuenta para guardar resultados y rachas, añadir amigos y comparar rankings. Es HTML, CSS y JavaScript puro.

## Características

- 10 juegos diarios: Palabra, Cifrado, Coronas, Sudoku mini, Escalera, Operaciones, Camino, Luces, Tuberías y Sopa de letras.
- Rachas, perfil con las mismas estadísticas en todos los juegos (partidas, ganadas, días de racha, victorias seguidas, mejor tiempo y tiempo medio; Palabra añade su histograma) y mapa de los últimos 28 días.
- Cuentas con correo, con @usuario o con Google; modo invitado sin cuenta.
- Amigos, ranking del día y de rachas, y perfil público o privado.
- Duelos entre amigos: mejor de 5 en directo, con juegos al azar (ver «Duelos»).
- Compartir el resultado de cada juego o del día completo, sin soluciones.
- Tema claro, oscuro o del sistema, y paleta para daltónicos.
- App instalable (PWA) que funciona sin conexión si ya abriste la web ese día.
- Panel de administración para editar el calendario de retos.

## Tecnologías

- HTML, CSS y JavaScript.
- Supabase.
- Service Worker y Web App Manifest para la PWA.
- Vercel.

## Instalación

### Modo local (solo para probar)

Deja `js/config.js` vacío y abre `index.html`. El reto sale de la carpeta `local/`. Para ver qué toca cada día, abre `admin-local/calendario.html`.
Entrar con Google, el modo sin conexión y la instalación como app necesitan `https://` o `http://localhost` (usa `npx serve` o Live Server).

### Con Supabase

1. Crea un proyecto en supabase.com.
2. En **SQL Editor** ejecuta `supabase/schema.sql` y después `supabase/seed.sql` (510 retos desde el 31-10-2026). Si ya tenías la base creada de antes y se añadieron juegos, ejecuta también `supabase/juegos_nuevos.sql`: sin ella el servidor rechaza los resultados de Camino, Luces, Tuberías y Sopa y no salen en el ranking (la web avisa con un mensaje). 
3. Copia la *Project URL* y la clave *publishable/anon* en `js/config.js`. Nunca la `service_role`.
4. Abre la web, crea tu cuenta y hazte administrador:
   ```sql
   update profiles set rol = 'admin'
   where id = (select id from auth.users where email = 'tu@correo.com');
   ```
   Cierra sesión y vuelve a entrar: en Cuenta aparece el enlace al panel (`admin.html`).

### Duelos entre amigos

Ejecuta `supabase/duelos.sql` en el SQL Editor (después de `schema.sql`; es idempotente). Sin él, la web funciona igual pero los duelos darán error.

- **Cómo se juega:** en Amigos (o en el icono de espadas del inicio) pulsa *Retar* a un amigo. Le llega un aviso flotante con *Aceptar* / *Rechazar*; si no responde en 5 minutos, la invitación caduca. Al aceptar, cuenta atrás de 15 s y empieza el duelo.
- **Reglas:** hasta 5 rondas, cada una con un juego distinto elegido al azar por el servidor (misma semilla para los dos). Gana la ronda quien lo resuelve con mejor puntuación. En Palabra, menos intentos (el tiempo desempata). En el resto, menos tiempo, con penalización en segundos: cada paso en Escalera (10 s) y Operaciones (10 s), cada pulsación en Luces (5 s), cada pista (15 s, en todos los juegos que la tienen) y cada comprobación (5 s, en Cifrado y Sudoku). Los botones lo enseñan siempre (`Pista ⏱15 s`). Los pesos están en `duelo_cfg()` (`pista_ms`, `comprobar_ms`), `duelo_peso()` y `duelo_clave()`. Rendirse o no resolver pierde la ronda: en cada juego, *Abandonar ronda* (antes de confirmar pide un segundo toque) pierde solo esa ronda; *Rendirse* en la cabecera termina el duelo. Gana el duelo quien llegue antes a 3 rondas, o quien tenga más tras 5. *Rendirse* en el duelo lo termina al instante; no jugar dos rondas seguidas se da por abandonado.
- **Palabras y frases:** Palabra, Cifrado y Sopa usan una lista propia de duelos (`duelo_palabras` y `duelo_frases`, al final de `duelos.sql`), distinta de la de los retos diarios, para que nadie conozca ya la solución. Se cargan solas al ejecutar el SQL; para añadir más, `insert into duelo_palabras(palabra) values ('xxxxx');` (5 letras, sin tildes) o `insert into duelo_frases(frase, autor) values (...)` (25 a 110 caracteres).
- **Parámetros** (caducidad, tiempo por ronda, rondas…): función `duelo_cfg()` en `duelos.sql`. Es la única fuente: el navegador los recibe del servidor.
- **Trampas:** el tiempo lo mide el servidor (el navegador solo puede recortar hasta `holgura`, 4 s, respecto al reloj real) y en Palabra se comprueba la lista de intentos contra la palabra de la ronda. El resto de intentos (pasos, pulsaciones, operaciones) los declara el navegador, como en el ranking: es para jugar con amigos, no una competición oficial.
- **Tiempo real:** el navegador consulta al servidor cada 1,5–6 s (más a menudo en pleno duelo). No usa Realtime: no hay nada que activar en Supabase.
- **Los duelos no cuentan** en tus resultados diarios, rachas ni rankings.

### Entrar con @usuario

Con correo funciona sin más. Para entrar también con el @usuario:

1. **Edge Functions → Deploy a new function**, nombre `login`, y pega `supabase/functions/login/index.ts`.
2. En esa función, desactiva **Verify JWT**.

### Entrar con Google (opcional)

1. En Google Cloud Console crea un ID de cliente OAuth (aplicación web) con la redirección `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
2. En Supabase, **Authentication → Providers → Google**: pega Client ID y Secret.
3. En **Authentication → URL Configuration**, pon tu dominio como *Site URL* y añade `https://tu-dominio/**` y `http://localhost:PUERTO/**` en *Redirect URLs*.

### Despliegue

Sube el repositorio a Vercel o a otro hosting estático. `js/config.js` se sube con la URL y la clave pública: la seguridad la dan las reglas RLS.
Si cambias el día de lanzamiento, cambia a la vez `EPOCH` en `js/core.js` y la fecha en `reto_hoy()` de `schema.sql`.

## Uso

- **Controles:** todos los juegos usan la misma barra (Deshacer · Reiniciar · Comprobar · Pista · Rendirme), mostrando solo los que tienen sentido en cada uno. Las ayudas con penalización enseñan su coste en segundos, p. ej. *Pista ⏱15 s*, y esos segundos se suman a tu tiempo (el cronómetro los incluye, muestra el desglose «1:00 + 5 s de ayudas» y hace un destello «+5 s» al pulsar la ayuda) tanto en el reto diario (y en su ranking; el tiempo real queda guardado como `tr`) como en los duelos. Rendirse cuenta como partida jugada, no como victoria.
- **Estrellas (0–5):** todos los juegos puntúan igual. Rendirse = 0. Resuelto = de 1 a 5 según tu tiempo (con la penalización de ayudas) frente al tiempo de referencia del juego: hasta 1× → 5, 1,5× → 4, 2× → 3, 3× → 2, más → 1. Palabra se mide por intentos: 1 → 5, 2 → 4, 3 → 3, 4 → 2, 5 → 1 (Palabra tiene ahora 5 intentos). Salen en la tarjeta de resultado, en el texto para compartir, en el estado de la portada y como «puntuación media» (sobre 5) en el perfil. Los tiempos de referencia están en `REF` de `js/core.js` (un único sitio; son un punto de partida, ajústalos con más partidas). En duelo no se usan.
- **Jugar:** elige un juego en el inicio. Cada uno tiene su «Cómo se juega». Los resultados se guardan en el navegador y, con cuenta, también en el servidor.
- **Cuenta:** en Perfil o Ajustes, «Entrar o crear cuenta». Se puede entrar con correo o con @usuario, y lo jugado como invitado se sube al entrar.
- **Amigos y ranking:** con sesión iniciada, busca a un amigo por su @usuario exacto. El ranking solo muestra a ti y a tus amigos.
- **Privacidad:** en Ajustes, el perfil puede ser Público o Privado. El invitado no tiene perfil que otros vean.
- **Administración:** los administradores editan el calendario de retos desde `admin.html`.
- **Añadir un juego:**
  1. Copia `js/games/_plantilla.js` a `js/games/tu-juego.js` y rellénalo.
  2. Añade su `<script>` en `index.html` (el orden es el del inicio).
  3. Añádelo a la lista `SHELL` de `sw.js` y sube el número de `V`.
  4. Con Supabase, ejecuta una migración que dé de alta el juego (ejemplo: `juegos_nuevos.sql`).
  5. Botones: usa `controles({undo, reiniciar, comprobar, pista, rendirme})` de `core.js` en lugar de escribir los tuyos (mismo orden y nombres en todos los juegos), y registra las acciones `undo`, `reiniciar`, `comprobar`, `pista` y `rendirme: confirma(tuFuncion)`. Añade su tiempo de referencia en `REF` de `core.js` (si se mide por tiempo). Si una ayuda da ventaja, que cueste algo: en duelo, súmalo en `duelo_clave()` con `pista_ms` / `comprobar_ms` y envía el contador (`h`, `c`) al terminar.
  6. Para que salga en los duelos: genera el puzle con `SD` (no `DAY`) y memoízalo con `memoSD(gen)`; añade el id a `duelo_juegos()` en `duelos.sql` (y a `duelo_por_tiempo()` si se puntúa por intentos). Mira `_plantilla.js`.
- **Sin conexión:** si añades o quitas archivos de la web, actualiza `SHELL` y `V` en `sw.js`.
