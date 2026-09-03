import axios from 'axios';

/** @type {{ pattern: RegExp, base: string, type: string }[]} */
const NAME_WIKI_HINTS = [
  { pattern: /elden ring/i, base: 'https://eldenring.wiki.fextralife.com', type: 'fextralife' },
];

const WIKIA_CATEGORY = 2;
const OFFICIAL_CATEGORY = 1;

export function detectWikiType(url) {
  if (/fextralife\.com/i.test(url)) return 'fextralife';
  if (/fandom\.com|wikia\.com|wiki\.gg|mediawiki/i.test(url)) return 'mediawiki';
  return 'mediawiki';
}

function pickWikiFromWebsites(websites) {
  if (!Array.isArray(websites)) return null;
  let wikia = null;
  let official = null;
  for (const w of websites) {
    const url = w?.url ? String(w.url).trim() : '';
    if (!url) continue;
    const cat = Number(w.category);
    if (cat === WIKIA_CATEGORY && !wikia) wikia = url;
    if (cat === OFFICIAL_CATEGORY && !official) official = url;
    if (/fandom\.com|wikia\.com|fextralife\.com|wiki\.gg/i.test(url) && !wikia) wikia = url;
  }
  if (!wikia) return official ? { wikiBaseUrl: null, officialUrl: official } : null;
  return {
    wikiBaseUrl: wikia.replace(/\/wiki\/.*$/, '').replace(/\/$/, ''),
    wikiSourceType: detectWikiType(wikia),
    officialUrl: official,
  };
}

function hintByName(gameName) {
  for (const h of NAME_WIKI_HINTS) {
    if (h.pattern.test(gameName)) {
      return { wikiBaseUrl: h.base, wikiSourceType: h.type, officialUrl: null };
    }
  }
  return null;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} igdbId
 */
export function getCachedGuideSources(db, igdbId) {
  return db.prepare('SELECT * FROM game_guide_sources WHERE igdb_id = ?').get(igdbId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} igdbId
 * @param {{ wikiBaseUrl?: string | null, wikiSourceType?: string | null, officialUrl?: string | null }} data
 */
export function saveGuideSources(db, igdbId, data) {
  db.prepare(
    `INSERT INTO game_guide_sources (igdb_id, wiki_base_url, wiki_source_type, official_url, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(igdb_id) DO UPDATE SET
       wiki_base_url = COALESCE(excluded.wiki_base_url, game_guide_sources.wiki_base_url),
       wiki_source_type = COALESCE(excluded.wiki_source_type, game_guide_sources.wiki_source_type),
       official_url = COALESCE(excluded.official_url, game_guide_sources.official_url),
       updated_at = datetime('now')`
  ).run(
    igdbId,
    data.wikiBaseUrl ?? null,
    data.wikiSourceType ?? null,
    data.officialUrl ?? null
  );
}

/**
 * @param {number} igdbId
 * @param {{ getAccessToken: () => Promise<string>, resolveTwitchCredentials: () => { clientId: string } | null, hasIgdbCredentials: () => boolean }} igdb
 */
export async function fetchIgdbWebsites(igdbId, igdb) {
  if (!igdb.hasIgdbCredentials()) return [];
  const creds = igdb.resolveTwitchCredentials();
  if (!creds) return [];
  const token = await igdb.getAccessToken();
  const body = `fields websites.url, websites.category; where id = ${Number(igdbId)};`;
  const res = await axios.post('https://api.igdb.com/v4/games', body, {
    headers: {
      'Client-ID': creds.clientId,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    },
    timeout: 12000,
  });
  return res.data?.[0]?.websites ?? [];
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} igdbId
 * @param {string} gameName
 * @param {{ getAccessToken: () => Promise<string>, resolveTwitchCredentials: () => { clientId: string } | null, hasIgdbCredentials: () => boolean }} igdb
 */
export async function resolveGameGuideSources(db, igdbId, gameName, igdb) {
  const cached = getCachedGuideSources(db, igdbId);
  if (cached?.wiki_base_url) {
    return {
      wikiBaseUrl: String(cached.wiki_base_url),
      wikiSourceType: String(cached.wiki_source_type || detectWikiType(cached.wiki_base_url)),
      officialUrl: cached.official_url ? String(cached.official_url) : null,
    };
  }

  let resolved = null;
  try {
    const websites = await fetchIgdbWebsites(igdbId, igdb);
    resolved = pickWikiFromWebsites(websites);
  } catch (e) {
    console.warn('guide: IGDB websites fetch failed', igdbId, e?.message || e);
  }

  if (!resolved?.wikiBaseUrl) {
    const hint = hintByName(gameName);
    if (hint) resolved = hint;
  }

  if (resolved?.wikiBaseUrl) {
    saveGuideSources(db, igdbId, {
      wikiBaseUrl: resolved.wikiBaseUrl,
      wikiSourceType: resolved.wikiSourceType || detectWikiType(resolved.wikiBaseUrl),
      officialUrl: resolved.officialUrl ?? null,
    });
    return {
      wikiBaseUrl: resolved.wikiBaseUrl,
      wikiSourceType: resolved.wikiSourceType || detectWikiType(resolved.wikiBaseUrl),
      officialUrl: resolved.officialUrl ?? null,
    };
  }

  return null;
}
