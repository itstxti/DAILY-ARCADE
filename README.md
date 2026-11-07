<div align="center">

# DAILY ARCADE

<p>
  A browser-based collection of <strong>17 daily puzzle games</strong>.<br>
  A new challenge every day, streaks, friends rankings and live duels.
</p>

<p>
  <strong>JavaScript</strong> ·
  <strong>Supabase</strong> ·
  <strong>PWA</strong> ·
  <strong>Vercel</strong>
</p>

![status](https://img.shields.io/badge/status-portfolio_project-blue) ![no framework](https://img.shields.io/badge/framework-none-lightgrey) ![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8)

<a href="https://daily-arcade-sigma.vercel.app">
  <strong>Play Daily Arcade →</strong>
</a>

</div>

<!-- Add your live demo URL above, replacing "#" -->

## Features

<table>
  <tr>
    <td align="center"><strong>Daily Challenges</strong></td>
    <td align="center">A new puzzle in every game each day at midnight (Madrid time), the same for every player</td>
  </tr>
  <tr>
    <td align="center"><strong>Streaks & Stats</strong></td>
    <td align="center">Games played, wins, streaks, best and average time, and a 28-day activity map</td>
  </tr>
  <tr>
    <td align="center"><strong>Friends & Rankings</strong></td>
    <td align="center">Add friends by username and compare daily and streak rankings, with public or private profiles</td>
  </tr>
  <tr>
    <td align="center"><strong>Live Duels</strong></td>
    <td align="center">Challenge a friend to a best-of-5 match across randomly chosen games</td>
  </tr>
  <tr>
    <td align="center"><strong>Star Scoring</strong></td>
    <td align="center">Every game is scored from 0 to 5 stars, with a time penalty for hints and checks</td>
  </tr>
  <tr>
    <td align="center"><strong>Spoiler-free Sharing</strong></td>
    <td align="center">Share the result of a single game or of the whole day without revealing solutions</td>
  </tr>
  <tr>
    <td align="center"><strong>Installable & Offline</strong></td>
    <td align="center">Works as a PWA and keeps running without a connection once the day's page has been opened</td>
  </tr>
  <tr>
    <td align="center"><strong>Accessibility</strong></td>
    <td align="center">Light, dark or system theme, plus a colour-blind friendly palette</td>
  </tr>
  <tr>
    <td align="center"><strong>Guest Mode</strong></td>
    <td align="center">Play without an account; progress is uploaded when you sign in with email, username or Google</td>
  </tr>
  <tr>
    <td align="center"><strong>Admin Panel</strong></td>
    <td align="center">Edit the challenge calendar from a built-in dashboard</td>
  </tr>
</table>

## The Games

| Game               | Goal                                                              |
| ------------------ | ----------------------------------------------------------------- |
| **Palabra**        | Guess the 5-letter word in 5 attempts.                            |
| **Cifrado**        | Decode the quote: every letter hides another one.                 |
| **Coronas**        | One crown per row, column and colour, with none touching.         |
| **Sudoku mini**    | Fill the 6×6 board without repeating numbers.                     |
| **Escalera**       | Change one letter at a time to get from one word to another.      |
| **Operaciones**    | Reach the target number using sums, differences, products and divisions. |
| **Camino**         | Draw a line through every cell, passing the numbers in order.     |
| **Luces**          | Turn off all the lights with as few presses as possible.          |
| **Tuberías**       | Connect the matching pairs of dots and fill the whole board.      |
| **Sopa de letras** | Find the 6 hidden words in the grid.                              |
| **Sospechosos**    | Work out who was where, with what, from 5–6 clues (one unique solution). |
| **Balanza**        | Place the weights so the beam balances: weight × distance on both sides. |
| **Intruso**        | Spot the one pattern that breaks the rule (shape, colour, rotation) in 5 rounds. |
| **Mezcla**         | Match a target colour by mixing drops of 4 base paints, using as few drops as possible. |
| **Siluetas**       | Build a cube figure that fits both its front and side shadows with the minimum number of cubes. |
| **Rayo**           | Place a limited number of mirrors so the laser lights every gem and reaches the exit. |
| **Carátula**       | Guess the movie from its pixelated poster (needs a `TMDB_KEY` env var in Vercel, see below). |

## Tech Stack

<table>
  <tr>
    <td align="center"><strong>Frontend</strong></td>
    <td align="center">
      <img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white">
      <img src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white">
      <img src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black">
    </td>
  </tr>
  <tr>
    <td align="center"><strong>Backend & Database</strong></td>
    <td align="center">
      <img src="https://img.shields.io/badge/Supabase-181818?logo=supabase&logoColor=3ECF8E">
      <img src="https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white">
    </td>
  </tr>
  <tr>
    <td align="center"><strong>PWA</strong></td>
    <td align="center">
      <img src="https://img.shields.io/badge/Service_Worker-5A0FC8?logo=pwa&logoColor=white">
      <img src="https://img.shields.io/badge/Web_App_Manifest-5A0FC8?logo=pwa&logoColor=white">
    </td>
  </tr>
  <tr>
    <td align="center"><strong>Deployment</strong></td>
    <td align="center">
      <img src="https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white">
    </td>
  </tr>
</table>

## Screenshots

<p align="center">
<img width="49%" alt="image" src="https://github.com/user-attachments/assets/96d05d1a-d3f1-483d-9433-3bd200ba1c52" />
<img width="49%" alt="image" src="https://github.com/user-attachments/assets/72e02b15-56e4-4c04-8d33-5b2b756dba3d" />
</p>
<p align="center">
<img width="49%" alt="image" src="https://github.com/user-attachments/assets/b8a0076b-a87f-4d8c-b57e-4b42f825f47d" />
<img width="49%" alt="image" src="https://github.com/user-attachments/assets/c6aec438-014f-49a4-803f-a94e91ec48f9" />
</p>

## Installation

### Local mode

Leave `js/config.js` empty and open `index.html`. Challenges are read from the `local/` folder. To see what each day brings, open `admin-local/calendario.html`.

Google sign-in, offline mode and installation need `https://` or `http://localhost`:

```bash
npx serve
```

### With Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run these files in order:
   * `supabase/schema.sql`
   * `supabase/seed.sql`
   * `supabase/duelos.sql`
   * `supabase/endurecimiento.sql`

   Already have a database? Run `supabase/juegos_sospechosos_balanza.sql` and `supabase/juegos_intruso_mezcla_siluetas.sql` and `supabase/juego_rayo.sql` and `supabase/juego_caratula.sql`, then `duelos.sql` and `endurecimiento.sql` again (all are idempotent).
3. Copy your *Project URL* and *publishable/anon* key into `js/config.js`. Never use the `service_role` key.
4. Sign up in the app, then make yourself an admin:

   ```sql
   update profiles set rol = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

**Optional:** to sign in with a username, deploy `supabase/functions/login/index.ts` as an Edge Function named `login` with *Verify JWT* turned off. To enable Google sign-in, configure the provider under *Authentication → Providers → Google*.

## How to Play

1. Pick a game from the home screen.
2. Every game shares the same toolbar: **Undo · Restart · Check · Hint · Give up**, showing only what makes sense for that game.
3. Hints and checks add seconds to your time, shown on the button (e.g. `Hint ⏱15 s`).
4. Finish faster for more stars. Giving up scores 0.

### Keyboard

The whole app can be used without a mouse.

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move through buttons and links. Each board (Sudoku, Coronas, Luces) and on-screen keyboard is a single tab stop. |
| Arrow keys | Move the focus to the nearest control in that direction (home, boards, settings, rankings…). In Sudoku this also selects the cell. |
| `Enter` / `Space` | Activate the focused control. |
| `Esc` | Go back. |
| Letters, `Enter`, `Backspace` | Type in Palabra, Cifrado and Escalera; digits `1`–`6` in Sudoku. |
| Arrow keys or `WASD` | Draw the path in Camino. |
| Sopa de letras | `Tab` to the board, arrows move the cursor, `Enter` on the first and on the last letter, `Esc` cancels. |
| Tuberías | `Tab` to the board, arrows move the cursor, `Enter` on a dot starts a pipe, arrows extend (or go back along) it, `Enter`/`Esc` release. |

Games that need the arrow keys for themselves register with `flechas: true`. Board containers opt in to the single tab stop with `data-rv="name"`.

### Scoring

| Time vs. reference | Stars |
| ------------------ | ----- |
| Up to 1×           | ⭐⭐⭐⭐⭐ |
| Up to 1.5×         | ⭐⭐⭐⭐ |
| Up to 2×           | ⭐⭐⭐ |
| Up to 3×           | ⭐⭐ |
| More               | ⭐ |

Palabra is scored by attempts instead: 1 attempt gives 5 stars, down to 1 star for the fifth. Duels do not use stars and do not count towards streaks or rankings.

## Adding a Game

1. Copy `js/games/_plantilla.js` to `js/games/your-game.js` and fill it in.
2. Add its `<script>` tag to `index.html`.
3. Add it to `SHELL` in `sw.js` and bump `V`.
4. Register it in Supabase with a migration (see `supabase/juegos_nuevos.sql`).
5. To include it in duels, add its id to `duelo_juegos()` in `duelos.sql`.

## Project Structure

```
index.html          App entry point
admin.html          Admin panel
sw.js               Service Worker
js/games/           One file per game (+ _plantilla.js)
js/core.js          Shared utilities, scoring and reference times
js/sfx.js           Optional sound effects (Web Audio, no audio files)
js/musica.js        Optional generative background music (Web Audio; key and melody change every day)
js/teclado.js       Keyboard navigation (focus, arrows, Esc)
js/duelo.js         Duel client
supabase/           SQL schema, seed, duels, hardening + login function
```

> [!WARNING]
> `supabase/seed.sql` and `local/` contain the solutions for the coming months. 

## Carátula (TMDB)

Carátula loads each day's poster live from [TMDB](https://www.themoviedb.org); no image is stored in this repository (the list in `content/peliculas.js` only holds titles and years).
The browser never talks to TMDB with a key: it calls `/api/tmdb` (`api/tmdb.js`, a Vercel serverless function) which adds the key on the server.
To enable it, create a free API key (the v3 "API Key", not the Read Access Token) at <https://www.themoviedb.org/settings/api> and add it in Vercel → Settings → Environment Variables as `TMDB_KEY`, then redeploy. Without it the game shows "not available" and nothing leaks.
Locally, a plain static server does not run `/api/*`: use `vercel dev`, or set `window.TMDB_PROXY = ''` in `js/config.js` to hide the game. TMDB requires attribution (already shown in the game) and its logo in the credits of your site.
Carátula is not part of the duels: it depends on TMDB being reachable and on each deployment having its own key.
