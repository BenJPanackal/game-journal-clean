// server/igdb-proxy.mjs
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors({ origin: ['http://localhost:5173'], credentials: false }));
app.use(express.json());

const {
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  PORT = 5174,
} = process.env;

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  console.error('❌ Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env.local');
  process.exit(1);
}

// In-memory token cache
let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpiresAt - 60_000) {
    return accessToken;
  }

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
  const expiresIn = tokenRes.data.expires_in; // seconds
  tokenExpiresAt = now + expiresIn * 1000;
  return accessToken;
}

function yearFromUnix(unixSeconds) {
  if (!unixSeconds) return null;
  try {
    return new Date(unixSeconds * 1000).getFullYear();
  } catch {
    return null;
  }
}

function coverUrlFromImageId(id, size = 't_cover_big') {
  return id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : null;
}

// POST /api/igdb/search  { query: string, limit?: number }
app.post('/api/igdb/search', async (req, res) => {
  try {
    const { query, limit = 8 } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing "query" (string)' });
    }

    const token = await getAccessToken();

    // IGDB search uses POST with their query language:
    // https://api-docs.igdb.com/#about
    const igdbRes = await axios.post(
      'https://api.igdb.com/v4/games',
      `search "${query}";
       fields id,name,first_release_date,summary,cover.image_id;
       limit ${Math.min(Math.max(Number(limit) || 8, 1), 20)};`,
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
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
    console.error('IGDB search error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'IGDB search failed' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ IGDB proxy running on http://localhost:${PORT}`);
});
