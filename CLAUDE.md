# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multiplayer local quiz game inspired by the Brazilian board game "Perfil". Players guess an entity from up to 10 progressive clues. Supports up to 11 simultaneous players via LAN. The first player to join becomes the HOST, who controls game flow; all others are regular players.

## Architecture

This is a monorepo with two separate services that must both run concurrently:

- **`backend/`** — Bun + Elysia 1.x server on port **3001**. Handles all game logic, player sessions, and real-time events via native Bun WebSocket.
- **`frontend/`** — Next.js 16 App Router on port **3000**. Pure UI layer; all state comes from WebSocket events. Uses Material UI (`@mui/material`) and Tailwind CSS v4 for styling.

The frontend connects to `window.location.hostname:3001/ws`, so it automatically works on LAN when accessed by IP. No build-time config needed for LAN play.

## Development Commands

**Both services at once** (from repo root):
```bash
bun startgame.ts   # starts backend (3001) + frontend (3000) in parallel, prefixed logs
```

**Backend only** (from `backend/`):
```bash
bun install
bun run dev        # watch mode
bun run start      # production
```

**Frontend only** (from `frontend/`):
```bash
bun install
bun run dev        # Next.js with Turbopack
bun run build
bun run lint       # eslint
```

There are no test suites; verification is done by running the game manually.

A root `tsconfig.json` exists solely to give the TypeScript language server type coverage for `startgame.ts`; it points `typeRoots` at `backend/node_modules` where `bun-types` is installed. It is not used by either service's own build.

## Backend Architecture

**Entry point:** `src/index.ts` — Elysia 1.x app (Bun-native) that handles:
- REST API at `/api/` for CRUD on disciplinas, temas, and cartas
- Native WebSocket at `/ws` (delegated to `src/ws.ts` via `wsHandlers`)
- `GET /health`, `GET /game-state`, and `GET /network-ip` status endpoints

`GET /network-ip` returns `{ ip: string }` — the machine's first non-internal IPv4 address via `os.networkInterfaces()`, falling back to `"localhost"`. Used by the lobby's invite QR code to produce a LAN-accessible URL.

**Game state:** `src/game.ts` — `GerenciadorJogo` singleton (`gerenciadorJogo`) holds all runtime state in memory (player maps, current card, turn tracking) and syncs to SQLite via `src/db/queries.ts`. State persists across server restarts through `carregarSessaoAtiva()` on construction.

**Database:** SQLite at `data/quiz.db` via `bun:sqlite` + `drizzle-orm`. Drizzle schema (for typed queries) in `src/db/schema.ts`; raw SQL `CREATE TABLE` statements in `src/db/index.ts:initDatabase()` (also handles `ALTER TABLE` migrations idempotently). Seeded on startup from `src/db/seed.ts`. `drizzle-kit` is installed as a dev dependency but there is no `drizzle.config.ts` — all schema changes must go through `initDatabase()` as idempotent SQL, not through `drizzle-kit` migrations.

**WebSocket protocol** (all handled in `src/ws.ts`): All messages are JSON `{ event: string, data: any }`. On connect, server immediately sends `{ event: 'session-id', data: { id: string } }` — this ID is the stable Elysia `ws.id` (derived from a closure in `raw.data.id`, not a UUID). Connection tracking uses `connections: Map<string, ServerWebSocket>` keyed by `ws.id`. Helper functions: `broadcast`, `sendTo`, `broadcastExcept`.

> **Elysia WS internals:** Elysia creates a new `ElysiaWS` wrapper object on every handler call (`open`, `message`, `close`). `ws.raw` is the underlying stable Bun `ServerWebSocket`. Always store `ws.raw` in the connections map and use `ws.id` (not the wrapper object) as the key. Elysia auto-parses JSON messages before calling `message(ws, raw)`, so `raw` arrives as an already-parsed object, not a string — `ws.ts` handles both cases.

- Client → Server: `join-lobby`, `request-game-state`, `roll-dice`, `set-play-order`, `select-theme`, `start-game`, `reveal-clue`, `pass-turn`, `submit-answer`, `validate-answer`, `reveal-answer`, `restart-game`, `exit-victory-screen`, `sair-lobby`
- Server → Client: `session-id`, `joined-lobby`, `lobby-state`, `player-joined`, `player-left`, `dice-rolled`, `play-order-set`, `theme-selected`, `game-started`, `clue-revealed`, `new-answer`, `answer-correct`, `answer-incorrect`, `answers-updated`, `next-card`, `answer-revealed`, `victory-state`, `game-ended`, `game-restarted`, `return-to-lobby`
- `game-started` and `next-card` events include `currentCardIndex` (0-based) and `totalCards` for the card progress counter.

**Scoring:** Cards start at 10 points. After the 2nd clue is revealed, points decrease by 1 per clue down to a floor of 1. Logic in `GerenciadorJogo.calcularPontos()`.

**Turn mechanics:**
- When a player's answer is marked **wrong**, the turn passes to the next player (`proximoJogador()`). The frontend resets `hasAnswered` for all clients on `answer-incorrect`, so players can submit again when their turn comes back.
- When a player's answer is **correct**, the current card ends (3-second delay then `next-card` or `victory-state`). `proximoJogador()` is **not** called — the winner keeps their turn for the next card (`proximaCarta()` only advances the card index and resets clues).
- A player can reveal at most one clue per turn (`revelouEstaTurno` flag, persisted to DB and reset when the turn changes).

**Card source:** Cards are fetched from the DB by `temaId` if a theme is selected; otherwise fall back to all cards, then to the hardcoded `gameCards` array in `src/models.ts` (mirrored in `frontend/lib/cards.ts`).

**Session reactivation:** When a client reconnects, `reativarJogador` in `game.ts` checks three guards before restoring a player: (1) the session ID must belong to the current active session, (2) the player's stored socket must not be actively held by a different connection (prevents same-browser multi-tab identity theft), (3) the player record must exist in the DB.

**Input validation:** `src/schemas/jogo.schema.ts` — `validarNome`, `validarResposta`, `validarIndiceDica` validators used by `ws.ts` before processing events.

## Frontend Architecture

**Pages** (all in `frontend/app/`):
- `/` (`page.tsx`) — name entry screen, stores name in `localStorage`
- `/lobby` (`lobby/page.tsx`) — waiting room; HOST sees theme selector (disciplina → tema), control buttons, and an **invite button** that opens a QR-code modal; the modal fetches the LAN IP from `GET /network-ip` so the QR code encodes `http://<lan-ip>:3000` instead of `localhost`; players see dice roll
- `/game` (`game/page.tsx`) — main game screen; HOST view shows full card + clues + answer validation panel; player view shows revealed clues + answer input + card progress counter
- `/victory` (`victory/page.tsx`) — final ranking; HOST can restart or exit to lobby
- `/admin` (`admin/page.tsx`) — content management UI for disciplinas, temas, and cartas (CRUD via REST API)
- `/sobre` (`sobre/page.tsx`) — static about/landing page; navigates to `/` directly

**Socket singleton:** `lib/socket.ts` — `getSocket()` returns a lazily-created `WsClient` instance (native WebSocket wrapper), connecting to `hostname:3001/ws`. The `WsClient` class mimics Socket.IO's `.on/.off/.emit` API. All messages are JSON `{ event, data }`. Session persistence uses a UUID in `localStorage` (`perfil_session_id`) sent as `?sessionId=` query param on connect; `'connect'` event fires only after the server sends `session-id` (so `socket.id` is populated before handlers run). Auto-reconnects up to 5 times with exponential backoff. UUID generation uses `crypto.randomUUID()` with a `Math.random()`-based fallback for non-HTTPS contexts (mobile browsers on HTTP).

**Game constants:** `lib/config.ts` — exports `GAME_CONFIG` (max players, correct-answer display time, clues per card, server port/URL). Prefer changing constants here over scattering magic numbers in components.

**Fallback cards:** `lib/cards.ts` — frontend-side duplicate of the hardcoded `gameCards` array (same data as `backend/src/models.ts`). Used if the backend sends no card data.

**Sound singleton:** `lib/soundManager.ts` — `soundManager` (exported instance) pre-loads all `HTMLAudioElement` objects at module evaluation time. Call `soundManager.play(name: SoundName)` or `soundManager.stop(name)` in client components. Guard against SSR is built-in. Sound files live in `public/sound/`. To add a new sound: copy the `.mp3` to `public/sound/`, add the name to `SoundName` and `SOUND_PATHS` in `soundManager.ts`. The singleton persists across Next.js navigations, so background/looping sounds must be stopped in the socket event handlers that trigger navigation (e.g. `return-to-lobby`, `game-restarted`), not only in the HOST's button handlers.

**`clue-revealed` dual purpose:** this event fires both when a clue is revealed AND when a turn is passed (with the same indices). Sound logic in `game/page.tsx` uses `revealedCluesCountRef` to distinguish: `newRevealed.length > count` → play `revealClue`; equal → play `passTurn`.

**Routing flow:** All navigation is driven by socket events; pages push routes reactively (e.g., `game-started` → `router.push('/game')`, `return-to-lobby` → `router.push('/lobby')`).

## Key Constraints

- Max 11 players per session (enforced in `GerenciadorJogo.adicionarJogador`).
- Each player may only reveal one clue per turn (`revelouEstaTurno` flag, persisted to DB).
- Only the HOST can: start game, validate answers, reveal answer, select theme, restart.
- `validate-answer` auto-calculates points server-side; the client does not send a points value.
- Disconnects are soft (socket ID cleared to `''`, player kept in DB); `sair-lobby` is a hard remove.
- The HOST does not accumulate score and their score is not displayed in either game view.
- `bun run --watch` sends SIGTERM (not SIGINT) on file changes, so `gerenciadorJogo.limparTudo()` (wired to SIGINT only) is never called on hot reload — stale session data can persist in SQLite across restarts during development.
