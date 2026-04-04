/**
 * Manual check: Steam helper + optional IGDB→Steam chain (needs .env Twitch keys).
 * Run: node server/verify-pricing.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import axios from 'axios';
import { fetchSteamStorePriceOverview } from './steam-store-price.mjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

async function steamDirectTests() {
  console.log('\n--- Steam fetchSteamStorePriceOverview (Valve appdetails) ---');
  const cases = [
    { id: 367520, note: 'Hollow Knight (paid)' },
    { id: 1091500, note: 'Cyberpunk 2077 (paid)' },
    { id: 570, note: 'Dota 2 (F2P — expect null)' },
    { id: 0, note: 'invalid id' },
  ];
  for (const { id, note } of cases) {
    const r = await fetchSteamStorePriceOverview(id);
    const ok = id > 0 && r && Number.isFinite(r.final) && r.finalFormatted;
    console.log(`  [${ok ? 'OK' : id === 570 || id === 0 ? 'OK' : 'FAIL'}] ${id} ${note}:`, r ?? 'null');
  }
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

function findSteamExternalGame(externalGames) {
  for (const eg of externalGames) {
    const n = (eg.sourceName || '').toLowerCase();
    if (n.includes('steam') || eg.sourceId === 1) {
      const uid = eg.uid != null ? String(eg.uid).trim() : '';
      if (/^\d+$/.test(uid)) return { ...eg, steamAppId: Number(uid) };
    }
  }
  return null;
}

async function igdbChainTest() {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) {
    console.log('\n--- IGDB→Steam chain: skipped (no TWITCH_* in env) ---');
    return;
  }
  console.log('\n--- IGDB game 1942 → external_games → Steam price ---');
  const tokenRes = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: id,
      client_secret: secret,
      grant_type: 'client_credentials',
    },
  });
  const token = tokenRes.data.access_token;
  const fields =
    'id,name,external_games.uid,external_games.url,external_games.name,' +
    'external_games.external_game_source.name,external_games.external_game_source.id';
  const igdbRes = await axios.post(
    'https://api.igdb.com/v4/games',
    `where id = 1942; fields ${fields}; limit 1;`,
    {
      headers: {
        'Client-ID': id,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
    }
  );
  const row = igdbRes.data?.[0];
  if (!row) {
    console.log('  FAIL: no game row');
    return;
  }
  const ext = simplifyExternalGames(row.external_games);
  const steam = findSteamExternalGame(ext);
  console.log('  externalGames count:', ext.length);
  console.log('  steam link:', steam ?? 'none');
  if (!steam?.steamAppId) {
    console.log('  (no Steam id on this IGDB game — price chain N/A)');
    return;
  }
  const price = await fetchSteamStorePriceOverview(steam.steamAppId);
  console.log('  Steam price:', price ?? 'null');
  const acc = price && price.final > 0 && price.finalFormatted.includes('$');
  console.log('  ', acc ? 'OK — numeric + formatted price present' : 'FAIL');
}

async function main() {
  console.log('Pricing verification', `(${__filename})`);
  await steamDirectTests();
  await igdbChainTest();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
