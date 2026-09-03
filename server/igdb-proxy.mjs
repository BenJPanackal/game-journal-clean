// server/igdb-proxy.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // try .env.local first
dotenv.config();                       // then fall back to .env

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { openDatabase } from './db.mjs';
import { createLibraryRouter } from './library-routes.mjs';
import { createSettingsRouter } from './settings-routes.mjs';
import { createGuideRouter } from './guide-routes.mjs';
import { credentialSource, hasIgdbCredentials, resolveTwitchCredentials } from './twitch-credentials.mjs';

const app = express();

// Dev: allow any localhost origin (Vite may use 5173, 5174, etc.)
app.use(cors({ origin: true, credentials: false }));
app.use(express.json());
app.use(express.text({ type: 'text/plain' })); // also accept text/plain

const db = openDatabase();

/** Default 3001 so Vite never steals this port when 5173 is busy. Set PORT in .env to override. */
const PORT = Number(process.env.PORT) || 3001;

// ---- Token cache (invalidated when stored credentials change)
let accessToken = null;
let tokenExpiresAt = 0;
/** Fingerprint creds so we refresh token if Client ID changes. */
let cachedCredsKey = '';

function invalidateIgdbTokenCache() {
  accessToken = null;
  tokenExpiresAt = 0;
  cachedCredsKey = '';
}

app.use(
  '/api',
  createSettingsRouter(db, { onCredentialsChanged: invalidateIgdbTokenCache })
);

if (!hasIgdbCredentials(db)) {
  console.warn(
    '⚠️ IGDB disabled: add Twitch Developer credentials in Setup / .env (TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET). Library API still works.'
  );
}

function requireIgdb(req, res, next) {
  if (!hasIgdbCredentials(db)) {
    return res.status(503).json({
      error: 'igdb_not_configured',
      message:
        'Add your Twitch Developer Client ID and Secret in Setup (or TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET in .env) to use IGDB search.',
    });
  }
  next();
}

async function getAccessToken() {
  const creds = resolveTwitchCredentials(db);
  if (!creds) throw new Error('Missing Twitch credentials');

  const key = `${creds.clientId}:${creds.clientSecret}`;
  const now = Date.now();
  if (cachedCredsKey !== key) {
    accessToken = null;
    cachedCredsKey = key;
  }
  if (accessToken && now < tokenExpiresAt - 60_000) return accessToken;

  const tokenRes = await axios.post(
    'https://id.twitch.tv/oauth2/token',
    null,
    {
      params: {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: 'client_credentials',
      },
    }
  );

  accessToken = tokenRes.data.access_token;
  tokenExpiresAt = now + tokenRes.data.expires_in * 1000;
  return accessToken;
}

const igdbDeps = {
  getAccessToken,
  resolveTwitchCredentials: () => resolveTwitchCredentials(db),
  hasIgdbCredentials: () => hasIgdbCredentials(db),
};
app.use('/api', createLibraryRouter(db, { igdb: igdbDeps }));
app.use('/api', createGuideRouter(db, igdbDeps));

function yearFromUnix(unixSeconds) {
  if (!unixSeconds) return null;
  try { return new Date(unixSeconds * 1000).getFullYear(); } catch { return null; }
}

function coverUrlFromImageId(id, size = 't_cover_big') {
  return id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : null;
}

/** List/search payload — minimal fields for faster IGDB responses (summary loads in game-details). */
function simplifySearchGame(g) {
  return {
    id: g.id,
    name: g.name,
    year: yearFromUnix(g.first_release_date),
    coverUrl: coverUrlFromImageId(g.cover?.image_id),
  };
}

function simplifyExternalGames(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => ({
      uid: x?.uid != null ? String(x.uid) : null,
      url: x?.url != null ? String(x.url) : null,
      name: x?.name != null ? String(x.name) : null,
      sourceName: x?.external_game_source?.name != null ? String(x.external_game_source.name) : null,
      sourceId: x?.external_game_source?.id != null ? Number(x.external_game_source.id) : null,
    }))
    .filter((x) => x.url || x.uid);
}

/** Full card / detail modal — store links from IGDB external_games. */
function simplifyDetailGame(g) {
  const genres = Array.isArray(g.genres)
    ? g.genres.map((x) => x?.name).filter(Boolean)
    : [];
  const platforms = Array.isArray(g.platforms)
    ? g.platforms.map((x) => x?.name).filter(Boolean)
    : [];
  const screenshotUrls = Array.isArray(g.screenshots)
    ? g.screenshots
        .slice(0, 8)
        .map((s) => coverUrlFromImageId(s?.image_id, 't_screenshot_med'))
        .filter(Boolean)
    : [];
  const externalGames = simplifyExternalGames(g.external_games);
  return {
    ...simplifySearchGame(g),
    summary: g.summary ?? null,
    genres,
    platforms,
    screenshotUrls,
    externalGames,
  };
}

const IGDB_SEARCH_FIELDS = 'id,name,first_release_date,cover.image_id';

const IGDB_DETAIL_FIELDS =
  'id,name,first_release_date,summary,cover.image_id,genres.name,platforms.name,screenshots.image_id,' +
  'external_games.uid,external_games.url,external_games.name,' +
  'external_games.external_game_source.name,external_games.external_game_source.id';

// --- Health endpoint to quickly verify credentials + token
app.get('/api/igdb/health', async (req, res) => {
  const src = credentialSource(db);
  if (!hasIgdbCredentials(db)) {
    return res.json({
      ok: false,
      igdbConfigured: false,
      credentialSource: src,
      message: 'IGDB credentials not configured.',
    });
  }
  try {
    const token = await getAccessToken();
    res.json({
      ok: true,
      igdbConfigured: true,
      credentialSource: src,
      tokenPresent: Boolean(token),
    });
  } catch (err) {
    console.error('Health check error:', err?.response?.data || err.message);
    res.status(500).json({
      ok: false,
      igdbConfigured: true,
      credentialSource: src,
      error: err?.response?.data || err.message,
    });
  }
});

// --- shared handler so we can mount multiple paths
async function handleSearch(req, res) {
  try {
    let userQuery = '';
    let limit = 8;

    if (req.is('application/json')) {
      userQuery = (req.body?.query ?? '').toString().trim();
      limit = Math.min(Math.max(Number(req.body?.limit) || 8, 1), 20);
    } else if (req.is('text/plain')) {
      // If someone POSTs raw text, treat it as either a full IGDB query or a simple search term.
      const body = (req.body ?? '').toString();
      const looksLikeIgdbQuery = /fields\s|\blimit\b|search\s*"/i.test(body);

      const creds = resolveTwitchCredentials(db);
      const token = await getAccessToken();
      const igdbQuery = looksLikeIgdbQuery
        ? body
        : `search "${body.trim()}"; fields ${IGDB_SEARCH_FIELDS}; limit 8;`;

      const igdbRes = await axios.post(
        'https://api.igdb.com/v4/games',
        igdbQuery,
        {
          headers: {
            'Client-ID': creds.clientId,
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'text/plain',
          },
        }
      );

      const simplified = igdbRes.data.map(simplifySearchGame);

      return res.json({ results: simplified });
    } else {
      return res.status(400).json({ error: 'Unsupported Content-Type' });
    }

    if (!userQuery) {
      return res.status(400).json({ error: 'Missing "query"' });
    }

    const creds = resolveTwitchCredentials(db);
    const token = await getAccessToken();

    const igdbRes = await axios.post(
      'https://api.igdb.com/v4/games',
      `search "${userQuery}";
       fields ${IGDB_SEARCH_FIELDS};
       limit ${limit};`,
      {
        headers: {
          'Client-ID': creds.clientId,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'text/plain',
        },
      }
    );

    const simplified = igdbRes.data.map(simplifySearchGame);

    res.json({ results: simplified });
  } catch (err) {
    // ← This will show you the REAL reason (401, 403, rate-limit, etc.)
    const status = err?.response?.status || 500;
    const data = err?.response?.data || err.message;
    console.error('IGDB search error:', status, data);
    res.status(500).json({
      error: 'IGDB search failed',
      details: { status, data }, // bubble up details to the client for now (dev)
    });
  }
}

// Mount both paths so the UI can call either
app.post('/api/igdb/search', requireIgdb, handleSearch);
app.post('/api/igdb/games/search', requireIgdb, handleSearch);

/** One game by IGDB id — genres, platforms, screenshots, external store links. */
app.post('/api/igdb/game-details', requireIgdb, async (req, res) => {
  const id = Number(req.body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  try {
    const creds = resolveTwitchCredentials(db);
    const token = await getAccessToken();
    const igdbRes = await axios.post(
      'https://api.igdb.com/v4/games',
      `where id = ${id};
fields ${IGDB_DETAIL_FIELDS};
limit 1;`,
      {
        headers: {
          'Client-ID': creds.clientId,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'text/plain',
        },
      }
    );
    const row = igdbRes.data?.[0];
    if (!row) return res.status(404).json({ error: 'Game not found' });
    res.json({ game: simplifyDetailGame(row) });
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data || err.message;
    console.error('IGDB game-details error:', status, data);
    res.status(500).json({
      error: 'IGDB game-details failed',
      details: { status, data },
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`✅ API + IGDB proxy running on http://localhost:${PORT}`);
  console.log(`   Twitch / IGDB credentials → ${credentialSource(db)} (configured: ${hasIgdbCredentials(db)})`);
});

server.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(
      `❌ Port ${PORT} is already in use. Stop the old API process (Task Manager → end "Node.js", or close the other terminal), then run npm run dev again.`
    );
  } else {
    console.error('❌ API server failed to start:', err?.message || err);
  }
  process.exit(1);
});
