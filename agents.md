# Agents

**Edit this file** whenever you want to change how AI assistants should behave on this project. Cursor loads it automatically via `.cursor/rules/agents-md.mdc`—no need to duplicate the same text in other rule files.

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
- **Developers:** clone + lockfile + `.env` / `.env.example` + documented `npm ci` → configure env → `npm run build` → `npm start` (when production server exists). Pin **Node** (`engines` / `.nvmrc`) for repeatable installs.
- **Single process:** design so **one Node process** can serve **`dist/`** plus `/api` and IGDB (and SQLite-backed REST) for production and for a future desktop shell.

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

1. **Backend:** relax startup; gate IGDB only; consistent errors; read creds from **env OR** persisted file/API.
2. **Backend:** `GET`/`POST` (or equivalent) **settings** for IGDB credentials — validate, **never log secrets**, clear errors.
3. **Frontend:** **Connect IGDB** / **Settings** form + optional **Test connection** / health check.
4. **Desktop:** Electron shell (start embedded server, `userData` paths) + **electron-builder** installers; **“for friends”** one-pager: install, where data lives, how to get Twitch keys, data stays on this PC.

### Role split (typical)

| Area | Owner |
|------|--------|
| No hard exit when keys missing; gate IGDB; status codes + JSON | Backend / API |
| Credential source: env (dev) vs saved config (packaged) | Backend |
| Settings API: validate, persist, no secret leakage in logs | Backend |
| First-run / Settings UI | Frontend |
| Electron, userData, embedded server, installers | Desktop / app / full-stack |

## Locked storage decision

**SQLite** at `data/journal.sqlite` — private per machine, migrations-friendly, supports future **grading** without rewriting huge JSON.

### Minimal data model (targets)

- **Library / games:** `igdbId`, `name`, `coverUrl`, optional `releaseYear`, `category` (`recent` | `favorite` | `wishlist` | `completed` | `dud`), `progress`, optional `hoursPlayed`, `lastPlayed`, `completedDate`, later **`userRating`** for grading.
- **Journal entries:** stable id, `gameId` (IGDB id), modal fields (title, notes/content, date, tags, mood, screenshot URL, session meta, etc.).
- **“Recent”:** derive (e.g. last journal activity) **or** store — pick **one rule** and document it in code.

### API surface (examples)

Granular `GET` / `POST` / `PATCH` for `/api/games`, `/api/entries`; optional `GET /api/library` for bootstrap. Use **SQLite transactions** for multi-row updates.

### Frontend data rules

- Replace mocks and hard-coded counts with **API-backed** state; **empty states** per section (e.g. “No recent games yet — add one from IGDB search”).
- **Stats** (hours, streaks, counts): compute from persisted data or show placeholders until signals exist — **no fake numbers**.

## IGDB search — game action menu (target UX)

**Today:** selecting a row immediately selects / navigates.

**Target:** click opens a **popover or small dialog** (Radix Popover/Dialog) anchored to the row, reusing **neon tokens** (`border-primary`, `journal-card`, typography). Content:

| Element | Source |
|--------|--------|
| Icon | `coverUrl` from proxy |
| Name | `name` |
| Rating | IGDB `aggregated_rating` / `total_rating` (0–100); show **“—”** if null — **extend proxy `fields` and response shape** |
| Actions | Three clear actions (wire to API once store exists) |

**Actions:**

1. **Add to wishlist** — upsert library game, category `wishlist` (or equivalent).
2. **Start a journal entry** — open `JournalEntryModal` pre-bound to that game (or `JournalPage` with modal open).
3. **Mark as completed** — category `completed`, optional `completedDate`.

**Implementation:** prefer **`onInspectGame(g)`** plus a shared **`IgdbGameActionMenu`** so `IgdbSearch` stays thin; or equivalent callbacks (`onAddToWishlist`, etc.).

## Grading (after library + journal + IGDB menu)

- **user grade** on library games (e.g. 1–5 or 1–10, optional short note).
- Show on **JournalPage** header and/or cards and in the **IGDB action menu** for games **already** in the library.
- Persist via the **same** game PATCH API.
- **Polish:** keyboard-friendly control, labels aligned with mood tags.

## Engineering hygiene (same effort band)

- Remove **`setShowSearchSuggestions`** dead code in `App.tsx`.
- **One** mapper: consolidate `igdbToGameCard` / `mapIgdbToCard`.
- **`vite.config.ts`:** proxy **`/api`** (not only `/api/igdb`) to the Node server for persistence in dev.
- **Production:** document one Node process serving static **`dist/`** and `/api` + IGDB (see `README.md`).

## Deferred / lower priority

- **Recommendations / ML-style** fill when users lack data for sections like “recent games” — **after** empty states and real persistence exist.
- **Electron + installers** — **primary path for “send to friends”** who won’t use Git; schedule after the **production Node server** + **IGDB optional startup** + **in-app credentials** story are in place (see **distribution gameplan**).
- **Docker / CI / observability** — valuable for technical users and automation; follow **[docs/distribution-gameplan.md](docs/distribution-gameplan.md)** when a concrete ticket specifies provider and triggers.
- **README vs agents.md** — README = short onboarding; **agents.md** + **docs/distribution-gameplan.md** = living spec; trim duplication only when you intentionally consolidate.

## Suggested implementation order

1. SQLite + API + `data/` in `.gitignore`.
2. React data layer (load/save + post-mutation UI refresh).
3. Strip mocks + empty states + computed counts/stats.
4. IGDB action menu + proxy rating fields + wire three actions to API.
5. Unify journal entries across dashboard and `JournalPage` by `gameId`.
6. Dead code + duplicate mappers + Vite `/api` proxy.
7. Grading UX.
8. README / production notes (keep in sync with reality).
9. **Friend-ready IGDB:** optional startup (no exit on missing keys), settings persistence + API, Settings / first-run UI; then **Electron + builder** + short friend-facing install doc (see **docs/distribution-gameplan.md**).
