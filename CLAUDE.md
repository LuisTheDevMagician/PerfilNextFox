# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multiplayer local quiz game inspired by the Brazilian board game "Perfil". Players guess an entity from up to 10 progressive clues. Supports up to 9 simultaneous players via LAN (including HOST). The first player to join becomes the HOST, who controls game flow; all others are regular players.

## Architecture

This is a monorepo with two separate services that must both run concurrently:

- **`backend/`** — Bun + Elysia 1.x server on port **3001**. Handles all game logic, player sessions, and real-time events via native Bun WebSocket.
- **`frontend/`** — Next.js 16 App Router on port **3000**. Pure UI layer; all state comes from WebSocket events. Uses React 19, Material UI v7 (`@mui/material`), and Tailwind CSS v4 for styling.

The frontend connects to `window.location.hostname:3001/ws`, so it automatically works on LAN when accessed by IP. No build-time config needed for LAN play. If phones get `ERR_CONNECTION_REFUSED` while the invite IP is correct, suspect the host firewall before the code: on Fedora/firewalld, a NetworkManager hotspot (`10.42.0.1`) runs in the `nm-shared` zone, which rejects everything except DHCP/DNS/SSH, so ports 3000/3001 (and 8080 for Moodle) must be opened in that zone.

## Development Commands

**Both services at once** (from repo root):
```bash
bun startgame.ts   # production mode: backend (3001) + frontend (3000) in parallel, prefixed logs
```

`startgame.ts` runs the **built** artifacts (`backend/dist/index.js` and `frontend/.next/standalone/server.js`), not the dev servers. It installs dependencies if `node_modules` is missing and builds only if those two files are **absent** — it never rebuilds. After editing source, it keeps serving the old build until you run `bun run build` in the affected service (or delete `backend/dist` / `frontend/.next`). When iterating on code, run the two `bun run dev` commands below in separate terminals instead.

**Backend only** (from `backend/` — the DB path `./data/quiz.db` is cwd-relative):
```bash
bun install
bun run dev        # watch mode, runs src/index.ts directly
bun run build      # bundles to dist/index.js (--target bun)
bun run start      # runs dist/index.js — requires a build first
```

**Frontend only** (from `frontend/`):
```bash
bun install
bun run dev        # Next.js with Turbopack
bun run build      # next build with output: 'standalone'
bun run start      # copies public/ and .next/static into .next/standalone, then runs server.js on 0.0.0.0:3000
bun run lint       # eslint
```

There are no test suites; verification is done by running the game manually.

A root `tsconfig.json` exists solely to give the TypeScript language server type coverage for `startgame.ts`; it points `typeRoots` at `backend/node_modules` where `bun-types` is installed. It is not used by either service's own build.

## Backend Architecture

**Entry point:** `src/index.ts` — Elysia 1.x app (Bun-native) that handles:
- REST API at `/api/` for CRUD on disciplinas, temas, and cartas
- Native WebSocket at `/ws` (delegated to `src/ws.ts` via `wsHandlers`)
- `GET /health`, `GET /game-state`, and `GET /network-ip` status endpoints

`GET /network-ip` returns `{ ip: string }` — reads `process.env.LAN_IP` first (injected by `bunDockerCompose.ts`); falls back to the first non-internal IPv4 from `os.networkInterfaces()`, then `"localhost"`. Used by the lobby's invite QR code to produce a LAN-accessible URL.

**Game state:** `src/game.ts` — `GerenciadorJogo` singleton (`gerenciadorJogo`) holds all runtime state in memory (player maps, current card, turn tracking) and syncs to SQLite via `src/db/queries.ts`. State persists across server restarts through `carregarSessaoAtiva()` on construction.

**Database:** SQLite at `data/quiz.db` via `bun:sqlite`. Every read and write goes through raw `sqlite.prepare()` statements in `src/db/queries.ts`, which return snake_case rows (the `mapDbTo*` helpers in `game.ts` normalise them). `drizzle-orm` is wired up (`db` export in `src/db/index.ts`, schema in `src/db/schema.ts`) but **nothing queries through it**, and `schema.ts` is out of sync with the real tables (no `tema_id` on `sessoes_jogo`, no content tables) — add new queries to `queries.ts` as raw SQL rather than relying on it. Tables are created by raw `CREATE TABLE` statements in `src/db/index.ts:initDatabase()`, which also handles `ALTER TABLE` migrations idempotently (try/catch). `drizzle-kit` is installed as a dev dependency but there is no `drizzle.config.ts` — all schema changes must go through `initDatabase()` as idempotent SQL, not through `drizzle-kit` migrations. Seeded on startup from `src/db/seed.ts` (skipped once the seed disciplina exists).

`backend/data/quiz.db` is committed to git (only the `-wal`/`-shm` sidecars are ignored), so playing locally can leave it modified — don't commit it unintentionally. Docker excludes it via `.dockerignore` and uses the `quiz_db_data` volume instead, so cards created locally don't exist in Docker mode (it starts from `seed.ts` only).

Active session tables: `sessoes_jogo`, `jogadores_sessao`, `respostas_pendentes`. Persistent stats tables: `jogadores` (global scores/wins per player name) and `historico_partidas` (past match outcomes) are **written** by the game loop (`upsertJogador` on join; score, win and history rows in `encerrarJogo()`) but never read by any endpoint or screen. Content tables for the admin panel: `disciplinas`, `temas`, `cartas` (`cartas.dicas` is a JSON-encoded array of exactly 10 strings).

**WebSocket protocol** (all handled in `src/ws.ts`): All messages are JSON `{ event: string, data: any }`. On connect, server immediately sends `{ event: 'session-id', data: { id: string } }` — this ID is the stable Elysia `ws.id` (derived from a closure in `raw.data.id`, not a UUID). Connection tracking uses `connections: Map<string, ServerWebSocket>` keyed by `ws.id`. Helper functions: `broadcast`, `sendTo`, `broadcastExcept`.

> **Elysia WS internals:** Elysia creates a new `ElysiaWS` wrapper object on every handler call (`open`, `message`, `close`). `ws.raw` is the underlying stable Bun `ServerWebSocket`. Always store `ws.raw` in the connections map and use `ws.id` (not the wrapper object) as the key. Elysia auto-parses JSON messages before calling `message(ws, raw)`, so `raw` arrives as an already-parsed object, not a string — `ws.ts` handles both cases.

- Client → Server: `join-lobby`, `request-game-state`, `roll-dice`, `set-play-order`, `select-theme`, `start-game`, `reveal-clue`, `pass-turn`, `submit-answer`, `validate-answer`, `reveal-answer`, `restart-game`, `exit-victory-screen`, `sair-lobby`, `spectator-join`
- Server → Client: `session-id`, `joined-lobby`, `lobby-full`, `error`, `lobby-state`, `player-joined`, `player-left`, `dice-rolled`, `play-order-set`, `theme-selected`, `game-started`, `clue-revealed`, `new-answer`, `answer-correct`, `answer-incorrect`, `answers-updated`, `next-card`, `answer-revealed`, `victory-state`, `game-restarted`, `return-to-lobby`, `answer-submitted`, `spectator-state`
- The frontend also registers listeners for `game-ended`, `next-player` and `name-taken`, but the server never emits them — those handlers are dead. A duplicate player name is reported as `lobby-full` (`adicionarJogador` returns `null` for both a full lobby and a name already in use).
- `join-lobby` carries `{ nome, sessionId }`. It creates a new session (deactivating any other) when there is no active session **or no currently connected player**, then reactivates or adds the player; the first player added to a session becomes HOST.
- `spectator-join` is handled in `ws.ts` without registering a player — responds with `spectator-state` containing full session snapshot (or `{ gameStarted: false, players: [] }` if no active session). Any WebSocket connection receives all `broadcast` events regardless of whether it called `join-lobby`, so the spectator tab gets real-time updates automatically.
- `game-started` and `next-card` events include `currentCardIndex` (0-based) and `totalCards` for the card progress counter.
- Most turn-change events (`game-started`, `clue-revealed` on pass, `answer-incorrect`, `next-card`) include `turnStartedAt: Date.now()` — a Unix ms timestamp clients use to compute remaining time independently (no per-tick WS messages). `answer-submitted` is broadcast when any player submits an answer, signalling all clients to freeze their countdown display immediately.

**Scoring:** Cards start at 10 points. After the 2nd clue is revealed, points decrease by 1 per clue down to a floor of 1. Logic in `GerenciadorJogo.calcularPontos()`.

**Turn mechanics:**
- When a player's answer is marked **wrong**, the turn passes to the next player (`proximoJogador()`). The frontend resets `hasAnswered` for all clients on `answer-incorrect`, so players can submit again when their turn comes back.
- When a player's answer is **correct**, the current card ends (3-second delay then `next-card` or `victory-state`). `proximoJogador()` is **not** called — the winner keeps their turn for the next card (`proximaCarta()` only advances the card index and resets clues).
- A player can reveal at most one clue per turn (`revelouEstaTurno` flag, persisted to DB and reset when the turn changes).

**40-second turn timer:**
- `GerenciadorJogo.iniciarTimerVez()` records `this.turnStartedAt = Date.now()` and sets a 42-second server-side `setTimeout` as a fallback auto-pass. Clients receive `turnStartedAt` in turn-change events and independently compute remaining time with `40 - (Date.now() - turnStartedAt) / 1000` in a 100ms interval.
- Client auto-pass fires at ~40s (via a `useEffect` watching `timeLeft === 0`); the server fallback fires at 42s if the client never responded.
- When a player submits an answer, `pausarTimerVez()` cancels the server timer and `answer-submitted` is broadcast so all clients freeze their countdown display.
- `cancelarTimerVez()` is called at the start of `revelarResposta()` to prevent a ghost auto-pass during the 3-second reveal delay.
- On reconnect, `handleRequestGameState` includes `turnStartedAt: gerenciadorJogo.getTurnStartedAt()` so the reconnecting client can resume the correct countdown offset.

**Card source:** Cards are fetched from the DB by `temaId` if a theme is selected; otherwise fall back to all cards, then to the hardcoded `gameCards` array in `src/models.ts` (mirrored in `frontend/lib/cards.ts`). This lookup is duplicated in `getCartaAtual()`, `getTotalCartas()` and `proximaCarta()`, and they disagree when no theme is selected: `proximaCarta()` ends the game at `gameCards.length` while the other two use all DB cards. Change the three together when touching card selection.

**Card content:** `CARTAS.md` is the user-facing guide to the disciplina → tema → carta hierarchy and card-writing conventions (linked from `README.md`). Keep it in sync if you change admin/API validation, card ordering or scoring. Facts that matter when authoring or seeding content:
- A match plays every card of the selected tema, in the order `buscarCartasPorTema` returns them. That query has no `ORDER BY`, so in practice it's insertion (rowid) order — a deck meant to go easy → hard must be inserted in that order, and reordering means recreating the cards.
- Players pick any clue index on their turn (`reveal-clue` carries the index), so clue order is only a convention: clue 1 hardest → clue 10 almost gives the answer away, written in first person, never containing the answer.
- The lobby's theme selector hides temas with zero cards.
- For bulk authoring, script against the REST API rather than writing SQLite directly — it enforces the same rules as the admin panel (name, tema, exactly 10 non-empty clues). The backend must be running; when it isn't, start it temporarily from `backend/` with `bun src/index.ts` and stop it afterwards. Check `GET /game-state` first so cards aren't changed mid-match.

**Session reactivation:** When a client reconnects, `reativarJogador` in `game.ts` looks up the player by searching `allJogadores` (already scoped to the current session via `buscarJogadoresSessao`) rather than the global `buscarJogadorPorSessionId` — this prevents old records from previous sessions matching and causing fake "lobby full" errors or HOST identity loss. One remaining guard: if the stored socket ID is non-empty and differs from the reconnecting socket, reactivation is refused (prevents multi-tab identity theft).

**Input validation:** `src/schemas/jogo.schema.ts` — `validarNome`, `validarResposta`, `validarIndiceDica` validators used by `ws.ts` before processing events.

## Frontend Architecture

**Pages** (all in `frontend/app/`):
- `/` (`page.tsx`) — name entry screen, stores name in `localStorage`
- `/lobby` (`lobby/page.tsx`) — waiting room; HOST sees theme selector (disciplina → tema), control buttons, invite QR-code modal, and **Abrir Tela Espectador** button (HOST only); the invite modal fetches the LAN IP from `GET /network-ip` and builds the QR URL as `http://<lan-ip>:<NEXT_PUBLIC_INVITE_PORT>` (defaults to `3000`; set to `8080` in Docker so the QR points to Moodle); players see dice roll
- `/game` (`game/page.tsx`) — main game screen; HOST view shows full card + clues + answer validation panel; player view shows revealed clues + answer input + card progress counter. Overlays (correct/wrong/nobody) imported from `app/components/RespostasOverlay.tsx`
- `/espectador` (`espectador/page.tsx`) — read-only spectator screen opened in a new tab from the lobby (HOST only). Three states: **waiting** (floating card animation + spinner + player list with dice rolls), **in-game** (two-panel layout: card+clues left 65%, host badge+timer+scoreboard right 35%), **end-game** (trophy + ranking, no action buttons). Connects via `lib/spectatorSocket.ts`, never emits action events
- `/victory` (`victory/page.tsx`) — final ranking; HOST can restart or exit to lobby
- `/admin` (`admin/page.tsx`) — content management UI for disciplinas, temas, and cartas (CRUD via REST API); tab components live in `admin/components/` (DisciplinasTab, TemasTab, CartasTab)
- `/sobre` (`sobre/page.tsx`) — static about/landing page; navigates to `/` directly

**Socket singleton:** `lib/socket.ts` — `getSocket()` returns a lazily-created `WsClient` instance (native WebSocket wrapper), connecting to `hostname:3001/ws`. The `WsClient` class mimics Socket.IO's `.on/.off/.emit` API. All messages are JSON `{ event, data }`. Session persistence uses a UUID in `localStorage` (`perfil_session_id`). It is appended as `?sessionId=` on connect, but the server never reads the query string — what `reativarJogador` actually matches is the `sessionId` field pages send in the `join-lobby` payload (via `getSessionId()`). `'connect'` event fires only after the server sends `session-id` (so `socket.id` is populated before handlers run). Auto-reconnects up to 5 times with linear backoff (1 s, 2 s, 3 s … per attempt). UUID generation uses `crypto.randomUUID()` with a `Math.random()`-based fallback for non-HTTPS contexts (mobile browsers on HTTP).

**Spectator socket:** `lib/spectatorSocket.ts` — `getSpectatorSocket()` returns a separate `SpectatorWsClient` singleton. Connects with `?spectator=true` (no `perfil_session_id`) so it never interferes with the player's session. On receiving `session-id`, immediately emits `spectator-join`; the backend responds with `spectator-state` (current game snapshot) without registering a player. Receives all broadcasts passively. Never call `join-lobby` or any action event from this socket.

**Backend URL:** there is no shared API base. Both sockets and the lobby's `/network-ip` fetch use `window.location.hostname:3001` (LAN-safe), but the three admin tabs (`const API = 'http://localhost:3001/api'`) and the lobby's HOST theme-selector fetch are hardcoded to `localhost:3001` — they only work in a browser on the machine running the backend. The `NEXT_PUBLIC_BACKEND_URL` / `NEXT_PUBLIC_WS_URL` build args in `frontend/Dockerfile` are not read by any code.

**Game constants:** `lib/config.ts` exports `GAME_CONFIG`, but **nothing imports it**. The real values are hardcoded at their use sites (`9` players in `game.ts`, `40` s / `42000` ms for the turn timer in `game/page.tsx` / `game.ts`, `3000` ms reveal delays in `ws.ts` and `game.ts`) — changing `config.ts` alone has no effect.

**Fallback cards:** `lib/cards.ts` — frontend-side duplicate of the hardcoded `gameCards` array (same data as `backend/src/models.ts`). Only its `Card` type is imported (by `game/page.tsx`); the array itself is unused.

**Shared overlay components:** `app/components/RespostasOverlay.tsx` — exports `Modal`, `CountdownRing`, `OverlayAcerto`, `OverlayErro`, `OverlayNinguemAcertou`. Each overlay component manages its own sound (`soundManager.play`) and auto-dismiss (`setTimeout`) via `useEffect`; the parent just sets `show={true}` and provides an `onDismiss` callback. `game/page.tsx` and `espectador/page.tsx` both import from here — do not duplicate these definitions. `OverlayNinguemAcertou` stops its sound in the `useEffect` cleanup so audio cuts immediately when the overlay dismisses.

**Sound singleton:** `lib/soundManager.ts` — `soundManager` (exported instance) pre-loads all `HTMLAudioElement` objects at module evaluation time. Call `soundManager.play(name: SoundName)` or `soundManager.stop(name)` in client components. Guard against SSR is built-in. Sound files live in `public/sound/`. Existing names: `answearRight`, `answearWrong`, `revealClue`, `sendButton`, `victoryScreenSound`, `passTurn`, `noOneCorrect`, `rolldice`. To add a new sound: copy the `.mp3` to `public/sound/`, add the name to `SoundName` and `SOUND_PATHS` in `soundManager.ts`. The singleton persists across Next.js navigations, so background/looping sounds must be stopped in the socket event handlers that trigger navigation (e.g. `return-to-lobby`, `game-restarted`), not only in the HOST's button handlers.

**`clue-revealed` dual purpose:** this event fires both when a clue is revealed AND when a turn is passed (with the same indices). Sound logic in `game/page.tsx` uses `revealedCluesCountRef` to distinguish: `newRevealed.length > count` → play `revealClue`; equal → play `passTurn`.

**Routing flow:** All navigation is driven by socket events; pages push routes reactively (e.g., `game-started` → `router.push('/game')`, `return-to-lobby` → `router.push('/lobby')`).

## Key Constraints

- Max 9 players per session (enforced in `GerenciadorJogo.adicionarJogador`).
- Each player may only reveal one clue per turn (`revelouEstaTurno` flag, persisted to DB).
- Only the HOST can: start game, validate answers, reveal answer, select theme, restart. The server enforces this (`e_host` check in `ws.ts`) for `set-play-order`, `select-theme`, `start-game`, `restart-game` and `exit-victory-screen` only; `validate-answer` and `reveal-answer` have **no** server-side HOST check and are gated solely by the HOST UI.
- `validate-answer` auto-calculates points server-side; the client does not send a points value.
- Disconnects are soft (socket ID cleared to `''`, player kept in DB); `sair-lobby` is a hard remove.
- The HOST does not accumulate score and their score is not displayed in either game view.
- `bun run --watch` sends SIGTERM (not SIGINT) on file changes, so `gerenciadorJogo.limparTudo()` (wired to SIGINT only) is never called on hot reload — stale session data can persist in SQLite across restarts during development.

## Docker / AVA Mode (Moodle)

This repo has a second deployment mode that wraps the game in a Moodle LMS instance for classroom use.

**Entry point:**
```bash
bun bunDockerCompose.ts           # detect LAN IP, start all 4 containers
bun bunDockerCompose.ts --build   # same + rebuild images
docker compose down -v            # full reset (drops DB and Moodle data volumes)
```

**Services (docker-compose.yml):**
| Container | Port | Purpose |
|---|---|---|
| `perfil_moodle` | 8080 | Moodle LMS (Apache + PHP, image in `moodle/`) |
| `perfil_frontend` | 3000 | Next.js (same image as dev) |
| `perfil_backend` | 3001 | Bun/Elysia (same image as dev) |
| `perfil_mariadb` | 3306 | MariaDB for Moodle (not used by the game) |

**Known issue — backend image:** `backend/package.json` `start` now runs `dist/index.js`, but `backend/Dockerfile` never runs `bun run build` and `.dockerignore` excludes `dist`, so a freshly built backend image fails to start. Adding `RUN bun run build` after the `COPY` lines should fix it.

**LAN IP injection:** `bunDockerCompose.ts` detects the host's first non-internal IPv4 and passes it as two env vars: `MOODLE_WWWROOT=http://<ip>:8080` and `LAN_IP=<ip>`. The backend reads `LAN_IP` in `getLanIp()`. If you change networks (e.g. Wi-Fi → cable → hotspot), re-run `bunDockerCompose.ts` to update both.

**`MOODLE_WWWROOT` is hard-set in `config.php`** — the Moodle CLI refuses to override it (`error code 4`). `bunDockerCompose.ts` patches it directly with `sed` after the containers start, then calls `purge_caches.php`. Never use `admin/cli/cfg.php --name=wwwroot` for this.

**`moodle/entrypoint.sh`** handles two cases on startup:
- DB empty → runs `admin/cli/install.php` (first run, slow)
- DB exists but `config.php` missing (container recreated without `-v`) → regenerates `config.php` from env vars without reinstalling

**Moodle block (`moodle-block/perfilnextfox/`):** Bind-mounted read-only into the container at `/var/www/html/blocks/perfilnextfox`. No rebuild needed when editing PHP files — changes take effect on page reload. `block_perfilnextfox.php` builds the iframe `src` from `$CFG->wwwroot` host + `:3000` (always port 3000 — the game frontend, not Moodle).

**`NEXT_PUBLIC_INVITE_PORT` is a build-time ARG**, not a runtime env var. It is baked into the Next.js bundle during `docker build` via `frontend/Dockerfile`. Currently hardcoded to `"8080"` in `docker-compose.yml` `build.args` so the QR code in the lobby points to Moodle. To change it you must rebuild the frontend image (`--build`).

**Guest access for students:** In each Moodle course, go to Participants → Métodos de inscrição → enable **Acesso como visitante**. Students open the course URL, click "Entrar como visitante", and launch the game from the block — no account needed.
