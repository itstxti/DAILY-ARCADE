# Daily Arcade

Daily Arcade es una web de juegos diarios: cada día a medianoche (hora de Madrid) hay un reto nuevo en cada juego. Se puede jugar como invitado o con cuenta para guardar resultados y rachas, añadir amigos y comparar rankings. Es HTML, CSS y JavaScript puro.

## Características

- 10 juegos diarios: Palabra, Cifrado, Coronas, Sudoku mini, Escalera, Operaciones, Camino, Luces, Tuberías y Sopa de letras.
- Rachas, perfil con estadísticas por juego y mapa de los últimos 28 días.
- Cuentas con correo, con @usuario o con Google; modo invitado sin cuenta.
- Amigos, ranking del día y de rachas, y perfil público o privado.
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
2. En **SQL Editor** ejecuta `supabase/schema.sql` y después `supabase/seed.sql` (510 retos desde el 31-10-2026). 
3. Copia la *Project URL* y la clave *publishable/anon* en `js/config.js`. Nunca la `service_role`.
4. Abre la web, crea tu cuenta y hazte administrador:
   ```sql
   update profiles set rol = 'admin'
   where id = (select id from auth.users where email = 'tu@correo.com');
   ```
   Cierra sesión y vuelve a entrar: en Cuenta aparece el enlace al panel (`admin.html`).

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

- **Jugar:** elige un juego en el inicio. Cada uno tiene su «Cómo se juega». Los resultados se guardan en el navegador y, con cuenta, también en el servidor.
- **Cuenta:** en Perfil o Ajustes, «Entrar o crear cuenta». Se puede entrar con correo o con @usuario, y lo jugado como invitado se sube al entrar.
- **Amigos y ranking:** con sesión iniciada, busca a un amigo por su @usuario exacto. El ranking solo muestra a ti y a tus amigos.
- **Privacidad:** en Ajustes, el perfil puede ser Público o Privado. El invitado no tiene perfil que otros vean.
- **Administración:** los administradores editan el calendario de retos desde `admin.html`.
- **Añadir un juego:**
  1. Copia `js/games/_plantilla.js` a `js/games/tu-juego.js` y rellénalo.
  2. Añade su `<script>` en `index.html` (el orden es el del inicio).
  3. Añádelo a la lista `SHELL` de `sw.js` y sube el número de `V`.
  4. Con Supabase, ejecuta una migración que dé de alta el juego (ejemplo: `juegos-nuevos.sql`).
- **Sin conexión:** si añades o quitas archivos de la web, actualiza `SHELL` y `V` en `sw.js`.
