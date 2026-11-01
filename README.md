# Daily Arcade

Web de juegos diarios. HTML + CSS + JavaScript puro, sin build. Dos modos:

- **Modo local** (por defecto): sin cuentas. El reto sale de la carpeta `local/`. Solo para probar.
- **Modo Supabase**: cuentas con roles (jugador / administrador), reto del día desde el servidor y panel de administración.

## Probar en local
Abre `index.html` con doble clic. Para ver qué toca cada día: `admin-local/calendario.html`.
En este modo el contenido se edita en `local/palabras.js` y `local/frases.js` (una línea por reto, el orden es el calendario).

## Activar Supabase (una vez)
1. Crea una cuenta y un proyecto en supabase.com (hay plan gratuito).
2. En **SQL Editor**: pega `supabase/schema.sql` y pulsa Run. Luego pega `supabase/seed.sql` y Run
   (carga 510 retos desde el reto nº 1 = 31-10-2026).
3. En **Project Settings → API** copia *Project URL* y la clave *anon public* en `js/config.js`.
   Nunca pongas la clave `service_role`.
   `js/config.js` se sube al repositorio (la URL y la clave anon son públicas por diseño; la seguridad la dan las reglas RLS), así que el deploy en Vercel lo incluye.
4. Abre la web, entra en Perfil → Entrar / crear cuenta y crea tu cuenta.
   (Si Supabase te pide confirmar el correo, confírmalo; para pruebas puedes desactivarlo en Authentication → Providers → Email.)
5. Hazte administrador: en el SQL Editor ejecuta (con tu correo)
   `update profiles set rol = 'admin' where id = (select id from auth.users where email = 'tu@correo.com');`
6. Cierra sesión y vuelve a entrar. En Cuenta aparece el enlace al panel (`admin.html`).

Si cambias el día de lanzamiento, cambia **a la vez** `EPOCH` en `js/core.js` y la fecha en la función `reto_hoy()` de `schema.sql`.

## Roles y seguridad
- **Jugador:** puede jugar y ver su perfil. Solo puede cambiar su propio nombre y su usuario (@usuario, único); el rol no se puede tocar desde la web.
- **Administrador:** puede ver y editar todo el calendario de retos desde `admin.html`.
- Los permisos los aplica la base de datos (reglas RLS de `schema.sql`), no el navegador: ocultar o falsear
  cosas en la web no da acceso. Los jugadores solo reciben el reto de **hoy**; los días futuros no les llegan.
- Límite actual: la palabra de hoy sí llega al navegador del jugador, así que alguien con conocimientos podría
  mirarla. Para rankings habrá que comprobar los intentos en el servidor (fase 2).

## Qué subir al hosting (producción)
Sube: `index.html`, `admin.html`, `css/`, `js/`, `content/`.
**No subas:** `local/`, `admin-local/`, `supabase/` (contienen todas las soluciones) ni `herramientas/`.

## Juegos
| Juego | Reto del día | Necesita contenido |
|---|---|---|
| Palabra | palabra de `local/palabras.js` o de Supabase | sí |
| Cifrado | frase de `local/frases.js` o de Supabase | sí |
| Coronas | tablero generado con la fecha | no |
| Sudoku mini | tablero 6×6 generado con la fecha (siempre con una sola solución) | no |
| Escalera | dos palabras generadas con la fecha y la lista de `content/aceptadas.js` | no, pero **mejora con el diccionario completo** |
| Operaciones | seis números y un objetivo generados con la fecha (siempre con solución) | no |

Los juegos generados con la fecha no se cargan en Supabase: todo el mundo recibe el mismo reto. Su solución viaja en el
navegador, como la palabra de hoy; para rankings habrá que comprobarlo en el servidor (fase 2).
El juego "Cifrado" se llamaba "Cifra": solo cambia el nombre visible; el identificador interno sigue siendo `cifra` para no perder los resultados guardados.

## Contenido (con Supabase)
Se gestiona en `admin.html`: cada fila es un día; cambia la palabra y la frase y pulsa Guardar.
La última fila añade el día siguiente. El panel avisa de cuántos días de contenido quedan.
Si un día no hay reto, la web muestra "Hoy todavía no hay reto": no dejes que se agote.
`content/aceptadas.js` es la lista pública de palabras válidas como intento (la solución del día siempre se acepta).

## Diccionario completo (palabras válidas como intento)
Para que "Palabra" acepte cualquier palabra española de 5 letras hace falta un diccionario completo.
Se genera una vez en tu ordenador (necesita Node 18 o superior, que ya tienes si usas npm):

```
node herramientas/generar-diccionario.js
```

Descarga una lista de palabras en español de GitHub y reescribe `content/aceptadas.js` con todas las de 5 letras
(sin tildes, ñ incluida, sin nombres propios). Si la descarga falla, baja una lista tuya (una palabra por línea,
con conjugaciones y plurales) y ejecuta `node herramientas/generar-diccionario.js ruta/lista.txt`.
Después sube el `content/aceptadas.js` nuevo. Las palabras de los retos siguen siendo las que tú eliges.
Comprueba la licencia de la lista que uses.

## Estructura
```
index.html  admin.html        juego y panel de administración
js/config.js                  claves de Supabase (vacío = modo local)
js/nube.js                    cuentas, rol y reto del día
js/content.js                 contenido local y reto de hoy
js/core.js  js/app.js         utilidades, pantallas y arranque
js/games/*.js                 un archivo por juego (+ _plantilla.js):
                              palabra, cifra (Cifrado), coronas, sudoku, escalera, operaciones
supabase/schema.sql seed.sql  base de datos y carga inicial
local/  admin-local/          modo local (no subir)
herramientas/                 generador de diccionario (no subir)
```

## Añadir un juego nuevo
1. Copia `js/games/_plantilla.js` a `js/games/mijuego.js` y cambia `id`, `name`, `desc`, `icon`, `color` y `pk` (único).
2. Añade `<script src="js/games/mijuego.js"></script>` en `index.html`, junto a los demás.
3. Añade `how:[…]` (3 frases) y, si quieres, `demo:` (un ejemplo visual en HTML): se muestran como «Cómo se juega» bajo el título del juego.
Aparece en el inicio, cuenta para la racha y sale en el perfil. La plantilla documenta la API.

## Resultados y privacidad en el servidor (fase 2, paso 1)
- Con cuenta, cada resultado se guarda en la tabla `resultados` (usuario, día, juego, datos) y la privacidad del perfil en `profiles.privacidad`.
- Al entrar (o al abrir la web con la sesión iniciada) se fusionan los datos del navegador con los del servidor: lo que solo está en el navegador se sube
  (así no se pierden rachas de cuando eras invitado), lo que solo está en el servidor se baja, y si un resultado existe en ambos **manda el del servidor**.
- Un resultado enviado no se puede reescribir (no hay UPDATE) y no se aceptan días futuros. Si no hay conexión al terminar un juego, queda en el navegador y se sube después.
- Al cerrar sesión se suben los resultados pendientes y el navegador queda limpio como invitado; si el navegador tenía datos de otra cuenta, no se suben a la nueva.
- "Borrar mis resultados" borra también los del servidor.
- **Invitados:** sin sesión todo sigue guardándose solo en `localStorage`; no se envía nada.
- **Bases de datos ya creadas:** ejecuta `supabase/migracion-01-resultados.sql` (idempotente). Las nuevas ya lo traen en `schema.sql`.
- **Al añadir un juego nuevo** hay que ampliar la restricción `resultados_juego_valido` (si no, sus resultados no se guardan en el servidor):
  `alter table resultados drop constraint resultados_juego_valido, add constraint resultados_juego_valido check (juego in ('palabra',…,'nuevo'));`
  y añadir el id también en la migración/schema.
- Límite conocido: el cliente decide si ganaste, así que estos resultados no son fiables para rankings públicos (paso 4).

## Amigos (fase 2, paso 2)
- Pantalla **Amigos** (icono en el inicio, con insignia si tienes solicitudes; también en Perfil): buscar por `@usuario`, solicitudes recibidas y enviadas, y lista de amigos con su racha y cuántos juegos han hecho hoy.
- **Búsqueda exacta:** solo se encuentra a alguien escribiendo su usuario completo. No hay forma de listar usuarios: `profiles` ya solo es legible por su dueño y todo lo demás pasa por funciones del servidor (`buscar_usuario`, `solicitar_amistad`, `responder_amistad`, `eliminar_amistad`, `mis_amistades`). La tabla `amistades` no es accesible directamente desde la web.
- **Estados:** `pendiente` y `aceptada`. Rechazar o cancelar borra la fila. Si A pide a B y B pide a A, se aceptan solas.
- **Privacidad (la aplica el servidor):** hay dos niveles.

| Privacidad | Quién ve tu perfil | Qué ve quien te busca sin ser amigo |
|---|---|---|
| Público | cualquier usuario con sesión que te encuentre por tu @usuario | tu nombre y tu perfil completo (rachas, actividad, estadísticas por juego) |
| Privado | solo tus amigos | solo tu @usuario, con "Perfil privado"; puede enviarte una solicitud |

  Tus amigos aceptados te ven y salen en tus rankings sea cual sea tu nivel. Antes existían tres niveles ("Solo amigos" y un "Privado" que ocultaba hasta la búsqueda); ahora "Solo amigos" pasó a "Privado" y ya no hay forma de ser invisible, porque entonces nadie podría pedirte amistad.
- Límites: 30 solicitudes pendientes enviadas y 200 amistades+solicitudes por usuario.
- **Bases de datos ya creadas:** ejecuta `supabase/migracion-02-amigos.sql` (idempotente) después de la 01.
- Para evitar el acoso, ver **Bloquear usuarios** más abajo.

## Rankings entre amigos (fase 2, paso 3)
- Pantalla **Ranking** (botón "Ver ranking" dentro de Amigos) con dos pestañas:
  - **Del día:** gana quien más juegos gane ese día; si empatan, el menor tiempo total (solo cuenta si todos sus juegos ganados tienen tiempo válido); después, más juegos jugados. Los empates comparten puesto. Se puede ver también días anteriores.
  - **Rachas:** por racha actual y, si empatan, por mejor racha.
- **Quién sale:** tú y tus amigos aceptados. No hay forma de pedir el ranking de otra persona ni de un día que todavía no existe. Lo calcula el servidor (`ranking_dia`, `ranking_rachas`); `circulo()` es interna y no es llamable desde la web.
- Los tiempos y victorias los envía cada navegador, así que es un ranking entre amigos, no una clasificación oficial. Un valor de tiempo corrupto no rompe el ranking (se ignora). Para rankings públicos hay que validar en el servidor (paso 4).
- **Bases de datos ya creadas:** ejecuta `supabase/migracion-03-rankings.sql` (idempotente) después de la 01 y la 02.

## Ver el perfil de otra persona
- "Ver perfil" aparece en la lista de amigos, en las solicitudes recibidas de perfiles públicos y en el resultado de buscar por @usuario. Es de solo lectura: racha actual, mejor racha, días jugados, los últimos 28 días y las estadísticas de cada juego (las mismas que en tu propio Perfil). Si no sois amigos, el perfil incluye el botón "Añadir amigo".
- **Perfil público:** lo ve cualquier usuario con sesión. **Perfil privado:** solo sus amigos; a los demás el servidor les responde "Este perfil es privado: solo lo ven sus amigos".
- `ver_perfil` devuelve solo `st`, `t`, `att`, `sc`, `n`, `par` y `h` de cada resultado. **Nunca** devuelve los intentos de Palabra (`g`): desvelarían la solución del día a quien aún no ha jugado. Si añades un juego cuyas estadísticas usen otros campos, amplía esa lista en `ver_perfil`.
- **Bases de datos ya creadas:** ejecuta, en orden, `migracion-04-perfil-amigo.sql` y `migracion-05-privacidad-2-niveles.sql` (idempotentes). La 05 sustituye `perfil_amigo` por `ver_perfil` y pasa a "Privado" a quien tuviera "Solo amigos".

## Bloquear usuarios
Bloqueo **silencioso y simétrico**:
- Al bloquear se borra la amistad o solicitud entre los dos. Desbloquear **no** la restaura.
- Quien ha sido bloqueado no puede encontrarte, ver tu perfil (aunque sea público) ni enviarte solicitudes: para él es "No se ha encontrado ese usuario", como si no existieras. No recibe ningún aviso.
- Tú tampoco puedes ver ni añadir a quien has bloqueado, salvo para desbloquearlo. Si te bloquea otra persona, dejas de verla igual.
- Dónde se bloquea: en el perfil de otra persona ("Bloquear a @usuario"), en las solicitudes recibidas, y se desbloquea desde Ajustes → Usuarios bloqueados (o al buscar a esa persona). Siempre pide confirmación.
- La tabla `bloqueos` no es accesible desde la web; solo `bloquear_usuario`, `desbloquear_usuario` y `mis_bloqueados` (esta última nunca dice quién te ha bloqueado a ti). `hay_bloqueo()` y `circulo()` son internas. Máximo 200 bloqueos por usuario.
- **Bases de datos ya creadas:** ejecuta `supabase/migracion-06-bloqueos.sql` (idempotente) después de la 01 a la 05.
- No cubre nombres u usuarios ofensivos: eso necesitaría un botón "Denunciar" y alguien que revise las denuncias.

## Pendiente (fase 2)
Cuenta y RGPD (recuperar contraseña, cambiar contraseña y correo, borrar cuenta, política de privacidad), comprobación de intentos en servidor y ajustes de lanzamiento.
