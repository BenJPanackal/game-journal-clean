import { Router } from 'express';
import { llmSettingsForClient } from './guide/llm-settings.mjs';
import { handleGuideAsk, getGuideSourcesForGame, patchGuideSources } from './guide/ask-handler.mjs';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ getAccessToken: () => Promise<string>, resolveTwitchCredentials: () => { clientId: string, clientSecret: string } | null, hasIgdbCredentials: () => boolean }} igdb
 */
export function createGuideRouter(db, igdb) {
  const r = Router();

  r.get('/guide/status', (req, res) => {
    try {
      res.json(llmSettingsForClient(db));
    } catch (e) {
      console.error('GET /api/guide/status', e);
      res.status(500).json({ error: 'Failed to load guide status' });
    }
  });

  r.post('/guide/ask', async (req, res) => {
    try {
      const result = await handleGuideAsk(db, req.body || {}, igdb);
      res.status(result.status).json(result.body);
    } catch (e) {
      console.error('POST /api/guide/ask', e);
      res.status(500).json({ error: 'Guide request failed', message: e?.message || String(e) });
    }
  });

  r.get('/guide/sources/:igdbId', (req, res) => {
    const igdbId = Number(req.params.igdbId);
    if (!Number.isFinite(igdbId)) return res.status(400).json({ error: 'Invalid game id' });
    const sources = getGuideSourcesForGame(db, igdbId);
    if (!sources) return res.status(404).json({ error: 'No guide sources cached for this game' });
    res.json(sources);
  });

  r.patch('/guide/sources/:igdbId', (req, res) => {
    const igdbId = Number(req.params.igdbId);
    if (!Number.isFinite(igdbId)) return res.status(400).json({ error: 'Invalid game id' });
    const row = db.prepare('SELECT igdb_id FROM games WHERE igdb_id = ?').get(igdbId);
    if (!row) return res.status(404).json({ error: 'Game not found in library' });
    const result = patchGuideSources(db, igdbId, req.body || {});
    res.status(result.status).json(result.body);
  });

  return r;
}
