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

// Allow your Vite dev server
app.use(cors({ origin: ['http://localhost:5173'], credentials: false }));
app.use(express.json());
app.use(express.text({ type: 'text/plain' })); // also accept text/plain

const db = openDatabase();
app.use('/api', createLibraryRouter(db));

const {
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  PORT = 5174,
} = process.env;

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
        : `search "${body.trim()}"; fields id,name,first_release_date,summary,cover.image_id; limit 8;`;

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

      const simplified = igdbRes.data.map((g) => ({
        id: g.id,
        name: g.name,
        year: yearFromUnix(g.first_release_date),
        summary: g.summary ?? null,
        coverUrl: coverUrlFromImageId(g.cover?.image_id),
      }));

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
       fields id,name,first_release_date,summary,cover.image_id;
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

    const simplified = igdbRes.data.map((g) => ({
      id: g.id,
      name: g.name,
      year: yearFromUnix(g.first_release_date),
      summary: g.summary ?? null,
      coverUrl: coverUrlFromImageId(g.cover?.image_id),
    }));

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

app.listen(PORT, () => {
  console.log(`✅ IGDB proxy running on http://localhost:${PORT}`);
  console.log(`   Env check → hasClientId: ${hasClientId}, hasSecret: ${hasSecret}`);
});
