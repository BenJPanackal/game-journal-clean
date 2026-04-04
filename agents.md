# Agents

**Edit this file** whenever you want to change how AI assistants should behave on this project. Cursor can load it via `.cursor/rules/agents-md.mdc`; you can also `@agents.md` in chat. Do not duplicate the same guidance in other rule files unless you intend to.

## How assistants should edit this file

- **Prefer additive changes:** add a section or patch paragraphs in place. **Avoid replacing the entire file** unless the user asked for a full restructure or merge.
- Treat this as **one living document** to append to over time.

## Git: commit and push after changing this file

If **you** (the agent) **create or update** `agents.md`—including when maintaining agent instructions—**finish by publishing the change to GitHub** unless the user explicitly asked you not to:

1. `git add` `agents.md` and any related files you changed in the same task (for example `.cursor/rules/agents-md.mdc`, `README.md`).
2. `git commit` using the user’s message if they gave one; otherwise a short imperative summary of what changed.
3. `git push` to `origin` on the **current branch** (this repo may use `master` or `main`).

Do not commit unrelated working-tree changes unless the user asked to include them.

---

## Product alignment

- **Offline-first, private, local data per machine** — v1 uses **SQLite** (`data/journal.sqlite`, **better-sqlite3**), not large hand-edited JSON blobs; **`data/` must be gitignored** so nothing user-specific is committed.
- **IGDB** for search and metadata; **real cover art** from the proxy, not placeholder icons.
- **Journal entries** with session details; **narrative / story-game** focus; **neon-style UI** — already largely acceptable; **polish can wait** until core behavior is real.
- **Repo today:** Vite + React (**not Electron**). Browsers cannot write arbitrary files on disk — extend the **Node** server (`server/igdb-proxy.mjs` or a merged `server/index.mjs`) with **REST** that reads/writes the DB.
- **“Real-time” in the UI:** after each successful API mutation, update React state (context / query) so lists and counts refresh immediately **without** a full reload.
- **Developers:** clone + lockfile + `.env` / `.env.example` + documented `npm ci` → configure env → **`npm run dev`** (or **`npm run build`** + API on 3001 + **`npm run preview`** until **`npm start`** exists). Pin **Node** (`engines` / `.nvmrc`) when ready.
- **Single process:** design so **one Node process** can serve **`dist/`** plus `/api` and IGDB (and SQLite-backed REST) for production and for a future desktop shell.

## Current codebase snapshot (keep in sync when architecture changes)

**Process entry:** `node server/igdb-proxy.mjs` — single Express app, default **`PORT=3001`** (override in `.env`). Dotenv: `.env.local` then `.env`.

**Database:** `server/db.mjs` → **`data/journal.sqlite`** (WAL, `foreign_keys`), **`data/`** is **gitignored**. Tables **`games`** (PK `igdb_id`), **`journal_entries`** (PK `id` TEXT), **`schema_migrations`**. Game columns include **`user_rating`** (0–10 or NULL), **`completion_memory`**, **`journal_mode`**, favorites flags/rank, plus category / progress / dates / cover / name. A legacy **`list_price`** column may exist in older DBs but is **not** exposed or updated by the API. Entries store mood, notes, tags as **`tags_json`**, optional **`progress_at_entry`**, etc. Schema evolves via **`MIGRATION_VERSION`** plus conditional **`ALTER TABLE`** for new columns.

**Library API:** `server/library-routes.mjs` mounted at **`/api`** — `GET /library` (games + entries bootstrap), `GET|POST /api/games`, **`PATCH|DELETE /api/games/:igdbId`**, `GET|POST /api/entries`, **`PATCH|DELETE /api/entries/:id`**. **PATCH game rule:** if **`progress` reaches 100** while category is still **`recent` | `favorite` | `wishlist`**, server requires **`userRating`** in **1–10** (or rejects); on success it sets **`category: completed`** and **`completed_date`** when missing.

**IGDB:** Same Express app. **`requireIgdb`** gates search/detail; missing Twitch env → **503** JSON **`{ error: 'igdb_not_configured', message }`** — server **warns** but **does not exit**. Routes: **`POST /api/igdb/search`**, **`POST /api/igdb/game-details`** (includes **`external_games`** / store links from IGDB), **`GET /api/igdb/health`**. Search/detail field lists live in **`igdb-proxy.mjs`** (`IGDB_SEARCH_FIELDS`, `IGDB_DETAIL_FIELDS`).

**Frontend integration:** Relative **`fetch('/api/...')`** — see **`src/api/library.ts`** (types **`LibraryGame`**, **`LibraryEntry`**, helpers and error parsing including proxy-misconfig hints). **`src/lib/libraryUi.ts`** maps API shapes ↔ UI cards. **`IgdbGameDetailModal`** opens from IGDB search selection: loads **`/api/igdb/game-details`**, supports add-to-library + open journal. **`CompletionSurveyModal`** (and related handlers in **`App`**) tie **completion + rating + memory** into **`PATCH /api/games`**. **`JournalPage`** consumes the same library/entry model.

**Dev vs production today:** **`npm run dev`** = **concurrently** Vite + Node server. **`vite.config.ts`** proxies **`/api`** → **`http://localhost:3001`**. **`npm run build`** outputs **`dist/`**; **`npm run preview`** can serve the built UI **if** the Node API is still running on 3001 (preview inherits **`server.proxy`** in Vite 7). There is **no** **`npm start`** and **no** **`express.static('dist')`** on the API yet — true **one-process** production is still a gap (see README “Production (target)”).

**Friend / packaged path (not in repo yet):** Per-user credentials in **Settings**, persistence under **userData**, **Electron + electron-builder** — still per **`docs/distribution-gameplan.md`**. **IGDB optional at startup** is already satisfied in code; **saved non-env credentials** are not.

### Friend installs (no GitHub / no Git)

**Target:** friends **download an installer** (e.g. **Electron + electron-builder** → `.exe` / `.dmg`), **double‑click**, use the app — **not** clone the repo. A plain static site or “open `index.html`” is **insufficient** because the app needs a **local API** and **SQLite**.

**Full detail:** **[docs/distribution-gameplan.md](docs/distribution-gameplan.md)** (DevOps on standby: CI, Docker, observability — implement when given a concrete goal).

**Locked product choices**

- **Each user has their own Twitch Developer app** (Client ID + Secret for IGDB client-credentials). Do **not** rely on one shared key for many users (quota / ToS / abuse).
- **Friends never use `.env`.** **Developers** keep using `.env` at repo root for local dev.
- **Packaged app:** first run or **Settings** — short copy + link to official Twitch/IGDB docs, inputs for Client ID and Client Secret (mask secret), **Save** → persist under the OS **app user data** dir (e.g. Electron `app.getPath('userData')`), not next to the executable. Optional later: **keytar** (or similar) for the secret only.
- **IGDB is optional until configured:** the server **must start** without Twitch env vars. **Do not** `process.exit(1)` on missing keys in the shipped path. **IGDB routes** return **`401` / `503`** and JSON like `{ "error": "igdb_not_configured" }` until credentials exist (from **env** in dev or **saved settings** in packaged builds). UI: “Add your Twitch keys in Settings” instead of broken search. **Library / journal** should still work without IGDB if the product allows it.
- **Native modules:** **`better-sqlite3`** (and Electron’s Node ABI if applicable) require **planned rebuilds** per target OS/arch; decide **Windows-only** vs **Windows + macOS** early (signing / notarization scope).

### Suggested sequence (credentials + packaging)

1. **Backend:** relax startup; gate IGDB only; consistent errors — **done for `.env` path**; **still to do:** read Twitch creds from **persisted settings** (userData) in addition to env.
2. **Backend:** `GET`/`POST` **settings** for IGDB credentials — validate, **never log secrets**, clear errors — **not done**.
3. **Frontend:** **Connect IGDB** / **Settings** form + optional **Test connection** / health check — **not done**.
4. **Desktop:** Electron shell (start embedded server, `userData` paths) + **electron-builder** installers; **“for friends”** one-pager — **not done**.

### Role split (typical)

| Area | Owner |
|------|--------|
| No hard exit when keys missing; gate IGDB; status codes + JSON | Backend / API |
| Credential source: env (dev) vs saved config (packaged) | Backend |
| Settings API: validate, persist, no secret leakage in logs | Backend |
| First-run / Settings UI | Frontend |
| Electron, userData, embedded server, installers | Desktop / app / full-stack |

## Locked storage decision

**SQLite** at `data/journal.sqlite` — implemented; migrations-friendly; **`data/`** gitignored.

### Data model (as implemented)

- **Games (API camelCase):** `igdbId`, `name`, `coverUrl`, `releaseYear`, `category` (`recent` | `favorite` | `wishlist` | `completed` | `dud`), `progress`, `hoursPlayed`, `lastPlayed`, `completedDate`, **`userRating`** (0–10), **`completionMemory`**, **`journalMode`**, `isFavorite`, `favoriteRank`, `createdAt`, `updatedAt`.
- **Journal entries:** `id` (string), `gameId`, title, area/boss/item, `screenshotUrl`, `notes`, `mood`, `sessionLength`, `progressAtEntry`, `tags[]`, `entryDate`, timestamps.
- **“Recent” / tabs:** driven by **stored `category`** and UI filters over **`fetchLibrary()`**; align any future “smart recent” behavior with explicit rules in **`libraryUi`** / `App` and document there.

### API surface (implemented)

`GET /api/library`, `GET /api/games`, `POST /api/games`, `PATCH /api/games/:igdbId`, `DELETE /api/games/:igdbId`, `GET /api/entries`, `POST /api/entries`, `PATCH /api/entries/:id`, `DELETE /api/entries/:id`. Use **transactions** where multiple statements must stay atomic (already used on some writes).

### Frontend data rules

- **Library and entries** load from **`/api/library`**; after mutations, **refetch** or update local state so the UI stays consistent — **no** long-lived mock game lists as source of truth.
- **Empty states** and **stats**: prefer honest placeholders or values **derived from** `games` / `entries` — avoid hard-coded dashboard numbers that contradict the DB.

## IGDB search and game detail (implemented)

- **`IgdbSearch`:** debounced search, portal dropdown; **`onSelect`** drives preview state (e.g. **`igdbPreview`** in `App`).
- **`IgdbGameDetailModal`:** full-screen style modal — cover, year, summary (expandable), genres/platforms/screenshots, **IGDB store links**, **add to library** (via **`POST /api/games`** / shared helpers), **open journal** for that game. Uses merged search row + detail payload (`IgdbGame` type extended for detail fields).
- **Optional enhancement:** surface **IGDB critic/aggregated ratings** in search or detail — would require adding fields to **`IGDB_DETAIL_FIELDS`** / **`IGDB_SEARCH_FIELDS`** and the simplified JSON shape in **`igdb-proxy.mjs`**.

## Grading and completion (partially implemented)

- **`userRating`** and **`completionMemory`** persist through **PATCH** / **POST** game APIs; server enforces **rating 1–10** when **progress → 100** promotes a game to **completed**.
- **Completion survey UI** (`CompletionSurveyModal` and related `App` flow) connects user input to **`patchGame`** / entry saves.
- **Remaining polish:** clearer surfacing of rating on all cards/headers, keyboard UX, and any extra copy/tooltips — without weakening server validation.

## Engineering hygiene and gaps

- **Done (don’t re-litigate unless regressions):** Vite **`/api`** → **3001**; IGDB **optional** startup; duplicate **`mapIgdbToCard`** / dead search state removed in favor of current IGDB flow.
- **Still open:** **`npm start`** + **`express.static`** (or equivalent) so **one Node process** serves **`dist/`** + `/api`; add **`engines`** / **`.nvmrc`** when you pin Node for collaborators; tighten **CORS** if the API is exposed beyond localhost.
- **README / production:** keep **README** “Production (target)” aligned once the unified server exists.

## Deferred / lower priority

- **Recommendations / ML-style** fill when users lack data for sections like “recent games.”
- **Electron + installers** — **primary path for “send to friends”** who won’t use Git; **in-app Twitch credentials** + settings API still ahead of packaging (see **distribution gameplan**).
- **Docker / CI / observability** — follow **[docs/distribution-gameplan.md](docs/distribution-gameplan.md)** when a concrete goal is set.
- **README vs agents.md** — README = short onboarding; **agents.md** + **docs/distribution-gameplan.md** = living spec.

## Implementation status (high level)

| Area | Status |
|------|--------|
| SQLite + `data/` gitignore + migrations pattern | Done |
| Library + journal REST + `fetchLibrary` client | Done |
| IGDB search, health, game-details | Done |
| IGDB optional credentials (no exit) | Done |
| Detail modal + add to library + journal from search | Done |
| Completion + `userRating` / `completionMemory` + survey flow | Done |
| Single-process production server + `npm start` | **Not done** |
| In-app IGDB credentials + settings API | **Not done** |
| Electron / installers | **Not done** |
| CI / Docker / observability | Optional / ticket-driven |

**Suggested next focus for deployment intent:** implement **static + API** on one Express app, **`npm start`**, then refresh **README**; then **friend credentials** path; then **Electron** per **docs/distribution-gameplan.md**.
