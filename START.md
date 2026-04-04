# Start here — local development

Step-by-step setup for **Game Journal** on your machine. For product goals and agent notes, see [`README.md`](./README.md) and [`agents.md`](./agents.md).

## Prerequisites

- **Node.js** — use a current LTS (e.g. 20.x or 22.x). This project uses native modules (**`better-sqlite3`**); if `npm install` fails, install [build tools for your OS](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/troubleshooting.md) and retry.

## 1. Install dependencies

```bash
npm install
```

## 2. Environment variables

Create **`.env`** or **`.env.local`** in the **repository root** (not under `server/`). The server loads **`.env.local` first**, then **`.env`**.

| Variable | Required for IGDB | Notes |
|----------|-------------------|--------|
| `TWITCH_CLIENT_ID` | Yes, for search | [Twitch Developer Console](https://dev.twitch.tv/console/apps) — register an app |
| `TWITCH_CLIENT_SECRET` | Yes, for search | Same app — **Client Secret** |
| `PORT` | No | API server port; default **`3001`** (avoids clashing with Vite) |

**Without** Twitch credentials, the app still runs: **library and journal APIs** work; **IGDB search** returns `503` with `igdb_not_configured` until you add keys and restart.

## 3. Run the dev stack

```bash
npm run dev
```

This starts:

- **Vite** — dev server for the React app (often [http://localhost:5173](http://localhost:5173); another port if 5173 is busy).
- **Node** — `server/igdb-proxy.mjs` on **`http://localhost:3001`** (or your `PORT`).

Vite proxies **`/api`** to that Node process (see `vite.config.ts`), so the browser only talks to the Vite origin.

## 4. Verify

- Open the URL Vite prints in the terminal.
- Optional: `GET http://localhost:3001/api/igdb/health` — confirms whether IGDB env vars are set and token works.

## Where your data lives

- SQLite file: **`data/journal.sqlite`** (created automatically; directory **`data/`** is gitignored).
- Back up by copying that file while the server is stopped (or use SQLite backup tools).

## Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite + API server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Preview the built static app (API is **not** started — use for UI-only checks, or run the Node server separately) |
| `npm run lint` | ESLint |

## API surface (local)

Mounted under **`/api`** on the Node server (proxied as `/api/...` from Vite in dev):

**Library**

- `GET /api/library` — games + journal entries (bootstrap)
- `GET` / `POST` `/api/games`, `PATCH` / `DELETE` `/api/games/:igdbId`
- `GET` / `POST` `/api/entries`, `PATCH` / `DELETE` `/api/entries/:id`

**IGDB** (require credentials)

- `GET /api/igdb/health`
- `POST /api/igdb/search` and `POST /api/igdb/games/search` — JSON body `{ "query": "...", "limit": 8 }`
- `POST /api/igdb/game-details` — JSON body `{ "id": <igdbId>, "name": "optional hint" }`

## Production (today)

There is **no** `npm start` script yet that serves **`dist/`** and **`/api`** together. For a single-process production story, see the **Production** section in [`README.md`](./README.md).

## Troubleshooting

- **Port in use** — set `PORT` in `.env` and match `vite.config.ts` proxy `target` if you change the API port.
- **IGDB errors** — confirm Client ID/Secret, app not revoked, and check server logs for HTTP status from Twitch/IGDB.
- **Empty library after clone** — expected; data is local only.
