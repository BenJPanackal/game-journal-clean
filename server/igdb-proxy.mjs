// server/igdb-proxy.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // try .env.local first
dotenv.config();                       // then fall back to .env

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { openDatabase } from './db.mjs';
import { createLibraryRouter } from './library-routes.mjs';

const app = express();

// Dev: allow any localhost origin (Vite may use 5173, 5174, etc.)
app.use(cors({ origin: true, credentials: false }));
app.use(express.json());
app.use(express.text({ type: 'text/plain' })); // also accept text/plain

const db = openDatabase();
app.use('/api', createLibraryRouter(db));

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;
/** Default 3001 so Vite never steals this port when 5173 is busy. Set PORT in .env to override. */
const PORT = Number(process.env.PORT) || 3001;

// Quick helper to see what envs the server actually has
const hasClientId = Boolean(TWITCH_CLIENT_ID);
const hasSecret   = Boolean(TWITCH_CLIENT_SECRET);

if (!hasClientId || !hasSecret) {
  console.error('❌ Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET. Put them in .env.local or .env at the project root.');
  process.exit(1);
}

// ---- Token cache
let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpiresAt - 60_000) return accessToken;

  const tokenRes = await axios.post(
    'https://id.twitch.tv/oauth2/token',
    null,
    {
      params: {
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      },
    }
  );

  accessToken = tokenRes.data.access_token;
  tokenExpiresAt = now + tokenRes.data.expires_in * 1000;
  return accessToken;
}

function yearFromUnix(unixSeconds) {
  if (!unixSeconds) return null;
  try { return new Date(unixSeconds * 1000).getFullYear(); } catch { return null; }
}

function coverUrlFromImageId(id, size = 't_cover_big') {
  return id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : null;
}

/** List/search payload — keep small for faster IGDB responses */
function simplifySearchGame(g) {
  return {
    id: g.id,
    name: g.name,
    year: yearFromUnix(g.first_release_date),
    summary: g.summary ?? null,
    coverUrl: coverUrlFromImageId(g.cover?.image_id),
  };
}

/** Full card / detail modal */
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
  return {
    ...simplifySearchGame(g),
    genres,
    platforms,
    screenshotUrls,
  };
}

const IGDB_SEARCH_FIELDS =
  'id,name,first_release_date,summary,cover.image_id';

const IGDB_DETAIL_FIELDS =
  'id,name,first_release_date,summary,cover.image_id,genres.name,platforms.name,screenshots.image_id';

// --- Health endpoint to quickly verify env + token
app.get('/api/igdb/health', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ ok: true, hasClientId, hasSecret, tokenPresent: Boolean(token) });
  } catch (err) {
    console.error('Health check error:', err?.response?.data || err.message);
    res.status(500).json({
      ok: false,
      hasClientId,
      hasSecret,
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

      const token = await getAccessToken();
      const igdbQuery = looksLikeIgdbQuery
        ? body
        : `search "${body.trim()}"; fields ${IGDB_SEARCH_FIELDS}; limit 8;`;

      const igdbRes = await axios.post(
        'https://api.igdb.com/v4/games',
        igdbQuery,
        {
          headers: {
            'Client-ID': TWITCH_CLIENT_ID,
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

    const token = await getAccessToken();

    const igdbRes = await axios.post(
      'https://api.igdb.com/v4/games',
      `search "${userQuery}";
       fields ${IGDB_SEARCH_FIELDS};
       limit ${limit};`,
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
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
app.post('/api/igdb/search', handleSearch);
app.post('/api/igdb/games/search', handleSearch);

/** One game by IGDB id — genres, platforms, screenshots (separate from search for speed) */
app.post('/api/igdb/game-details', async (req, res) => {
  const id = Number(req.body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  try {
    const token = await getAccessToken();
    const igdbRes = await axios.post(
      'https://api.igdb.com/v4/games',
      `where id = ${id};
fields ${IGDB_DETAIL_FIELDS};
limit 1;`,
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
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

app.listen(PORT, () => {
  console.log(`✅ IGDB proxy running on http://localhost:${PORT}`);
  console.log(`   Env check → hasClientId: ${hasClientId}, hasSecret: ${hasSecret}`);
});
