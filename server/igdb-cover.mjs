import axios from 'axios';

export function coverUrlFromImageId(id, size = 't_cover_big') {
  return id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : null;
}

/**
 * @param {number} igdbId
 * @param {{ getAccessToken: () => Promise<string>, resolveTwitchCredentials: () => { clientId: string } | null, hasIgdbCredentials: () => boolean }} igdb
 */
export async function fetchIgdbCoverUrl(igdbId, igdb) {
  if (!igdb.hasIgdbCredentials()) return null;
  const creds = igdb.resolveTwitchCredentials();
  if (!creds) return null;
  const token = await igdb.getAccessToken();
  const res = await axios.post(
    'https://api.igdb.com/v4/games',
    `fields cover.image_id; where id = ${Number(igdbId)};`,
    {
      headers: {
        'Client-ID': creds.clientId,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
      timeout: 12000,
    }
  );
  const imageId = res.data?.[0]?.cover?.image_id;
  return coverUrlFromImageId(imageId);
}

/**
 * Fill cover_url from IGDB when missing (e.g. after a partial library insert).
 * @param {import('better-sqlite3').Database} db
 */
export async function backfillMissingCovers(db, igdb) {
  if (!igdb?.hasIgdbCredentials?.()) return 0;
  const rows = db
    .prepare(`SELECT igdb_id FROM games WHERE cover_url IS NULL OR trim(cover_url) = ''`)
    .all();
  let fixed = 0;
  for (const row of rows) {
    try {
      const url = await fetchIgdbCoverUrl(row.igdb_id, igdb);
      if (url) {
        db.prepare('UPDATE games SET cover_url = ? WHERE igdb_id = ?').run(url, row.igdb_id);
        fixed += 1;
      }
    } catch (e) {
      console.warn('cover backfill failed for igdb_id', row.igdb_id, e?.message || e);
    }
  }
  return fixed;
}
