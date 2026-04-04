# Distribution, DevOps, and friend installs — gameplan

Living notes from project planning. **Target audience for “single download”:** friends who should **not** need GitHub or Git; each person uses **their own** Twitch Developer app (Client ID + Secret) for IGDB so usage stays on their account (e.g. not one shared key for 70+ users).

---

## DevOps / automation (on standby)

When working in **automation-first** mode, concrete repo work may include:

- **CI** — GitHub Actions (or other): install, lint/test, build; optional deploy.
- **Containers** — Dockerfile / compose for local and prod-like runs; named volume or bind mount for `data/`.
- **Hosting** — static front + API layout (Vercel/Netlify + serverless vs VM/K8s vs single Node serving `dist/` + `/api`).
- **Observability** — health checks, structured logs, basic metrics/alerts where appropriate.
- **Security in CI** — dependency scanning, secret hygiene, clear rollback patterns.

Pin reproducibility for developers: lockfile, `engines.node` / `.nvmrc`, `.env.example`, documented `npm ci` → configure env → `npm run build` → `npm start`. Document that **`data/`** is local SQLite state (gitignored) and how to back it up (copy `journal.sqlite`).

---

## Who the user is (choose the packaging story)

| Audience | Fit |
|----------|-----|
| **Developer** | Clone repo + env + `npm run dev` / production server — replicable, not an “installer.” |
| **Friend (no Git)** | **Desktop installer** — one `.exe` / `.dmg`; double-click to run. Not “open `index.html`” (app needs local API + SQLite). |
| **Technical self-hoster** | **Docker** + compose: `docker pull` + compose file; still need IGDB secrets via env. |
| **Zip of Node + `node_modules`** | Last resort — fragile (AV, paths, updates, native modules like `better-sqlite3`). |

**Recommendation for “send to friends”:** **Electron** (or **Tauri** — lighter, different integration) **+ electron-builder** (or equivalent) producing installers.

**Caveat:** `better-sqlite3` is **native**. Packaging must **rebuild for target OS/arch** (and for Electron’s Node ABI if the DB runs inside Electron’s main process). Plan this **before** treating packaging as a last-minute step.

**Practical order**

1. Finish **production path**: `vite build` + **one Node process** serves `dist/` and `/api` (and IGDB proxy), SQLite under `data/` (or app userData when packaged).
2. Add **Electron shell** + **electron-builder** (e.g. `npm run dist`) → installer artifacts.
3. Short **“for friends”** doc: install steps, where saves live, how to add Twitch keys, “data stays on this PC.”

---

## Credentials: friends never touch `.env`

**Developer workflow:** `.env` / `.env.local` at repo root for local dev (unchanged).

**Packaged app workflow:**

1. Friend installs the app (no Git).
2. Friend creates a Twitch Developer app → copies **Client ID** and **Client Secret** (IGDB uses Twitch client-credentials flow).
3. **First launch** (or until configured): **“Connect IGDB”** / **Settings** screen:
   - Short copy: search uses IGDB; **each user needs their own free Twitch app** so quotas stay on their account.
   - Link to official Twitch / IGDB setup docs.
   - Two inputs: Client ID, Client Secret (mask secret).
   - **Save** → persist locally → IGDB search works.
4. **Journaling / SQLite library** should still work **without** IGDB if product allows “offline library only” until keys are set (product choice).

**Where keys live (packaged)**

- Prefer a file under the OS **app user data** directory (e.g. Electron `app.getPath('userData')`), e.g. `igdb-credentials.json` — **not** next to the executable.
- **Nicer:** store **Client Secret** in OS credential store (e.g. **keytar**); plain local file is acceptable for an early version if threat model is “other users on same PC.”

---

## Backend behavior change (required for “configure after install”)

Today’s dev server may **exit on startup** if `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` are missing. For shipped / friend UX:

- **Do not** `process.exit(1)` for missing keys on the **product** path.
- **Start** the API and static hosting anyway: library, SQLite, UI.
- **IGDB routes** return a clear **`401` / `503`** with JSON such as `{ "error": "igdb_not_configured" }` until both credentials are present (from env **or** from saved user settings).
- UI shows **“Add your Twitch keys in Settings”** instead of a broken search.

**Optional polish:** Settings to **rotate** keys; **“Test connection”** calling `/api/igdb/health` or a one-off token fetch.

**HTTP surface (conceptual):** e.g. `GET` / `POST` settings for IGDB credentials (validate, never log secrets, clear errors).

---

## Role split (who does what)

| Area | Owner (typical) |
|------|------------------|
| No hard exit when keys missing; gate IGDB; status codes + JSON | **Backend / API** |
| Read credentials from env (dev) vs saved config (packaged) | **Backend** |
| Settings API: validate, persist, don’t leak secrets in logs | **Backend** |
| First-run / Settings UI (paste ID + Secret, Save, errors) | **Frontend** |
| Electron: userData path, spawn embedded server, installer | **Desktop / full-stack / app** |

---

## Summary

- **Distribution for non-dev friends:** installer via **Electron + builder**, not the raw repo.
- **IGDB:** each friend’s **own** Twitch app; **in-app** setup stores keys under **userData** (not `.env`).
- **Server:** treat IGDB as **optional until configured**; library/journal can still run.
- **DevOps:** CI, Docker, observability — implement when pointed at concrete goals (e.g. “GitHub Actions on push to `main`”).
- **Native modules:** plan **better-sqlite3** + Electron rebuild targets early (**Windows-only** vs **Windows + macOS** drives signing/notarization scope).
