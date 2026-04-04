// server/library-routes.mjs — REST API for games + journal entries
import { Router } from 'express';
import crypto from 'crypto';
import { CATEGORIES, rowToGame, rowToEntry } from './db.mjs';

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

export function createLibraryRouter(db) {
  const r = Router();

  r.get('/library', (req, res) => {
    try {
      const games = db.prepare('SELECT * FROM games ORDER BY updated_at DESC').all().map(rowToGame);
      const entries = db.prepare('SELECT * FROM journal_entries ORDER BY entry_date DESC').all().map(rowToEntry);
      res.json({ games, entries });
    } catch (e) {
      console.error('GET /api/library', e);
      res.status(500).json({ error: 'Failed to load library' });
    }
  });

  r.get('/games', (req, res) => {
    try {
      const games = db.prepare('SELECT * FROM games ORDER BY updated_at DESC').all().map(rowToGame);
      res.json({ games });
    } catch (e) {
      console.error('GET /api/games', e);
      res.status(500).json({ error: 'Failed to list games' });
    }
  });

  r.post('/games', (req, res) => {
    const body = req.body || {};
    const igdbId = Number(body.igdbId);
    const name = (body.name ?? '').toString().trim();
    const category = (body.category ?? '').toString();

    if (!Number.isInteger(igdbId) || igdbId <= 0) {
      return badRequest(res, 'igdbId must be a positive integer');
    }
    if (!name) return badRequest(res, 'name is required');
    if (!CATEGORIES.has(category)) {
      return badRequest(res, `category must be one of: ${[...CATEGORIES].join(', ')}`);
    }

    const coverUrl = body.coverUrl != null ? String(body.coverUrl) : null;
    const releaseYear = body.releaseYear != null ? Number(body.releaseYear) : null;
    const progress = body.progress != null ? Number(body.progress) : 0;
    const hoursPlayed = body.hoursPlayed != null ? Number(body.hoursPlayed) : null;
    const lastPlayed = body.lastPlayed != null ? String(body.lastPlayed) : null;
    const completedDate = body.completedDate != null ? String(body.completedDate) : null;
    const userRating = body.userRating != null ? Number(body.userRating) : null;

    if (Number.isNaN(progress) || progress < 0 || progress > 100) {
      return badRequest(res, 'progress must be between 0 and 100');
    }

    const existedRow = db.prepare('SELECT * FROM games WHERE igdb_id = ?').get(igdbId);
    const existedBefore = Boolean(existedRow);

    let listPriceToStore;
    if (Object.prototype.hasOwnProperty.call(body, 'listPrice')) {
      if (body.listPrice === null) {
        listPriceToStore = null;
      } else {
        const lp = Number(body.listPrice);
        if (Number.isNaN(lp) || lp < 0) {
          return badRequest(res, 'listPrice must be a non-negative number or null');
        }
        listPriceToStore = lp;
      }
    } else if (existedBefore) {
      listPriceToStore =
        existedRow.list_price != null && Number.isFinite(Number(existedRow.list_price))
          ? Number(existedRow.list_price)
          : null;
    } else {
      listPriceToStore = null;
    }

    try {
      const tx = db.transaction(() => {
        if (existedBefore) {
          db.prepare(`
            UPDATE games SET
              name = ?,
              cover_url = ?,
              release_year = ?,
              category = ?,
              progress = ?,
              hours_played = ?,
              last_played = ?,
              completed_date = ?,
              user_rating = COALESCE(?, user_rating),
              list_price = ?,
              updated_at = datetime('now')
            WHERE igdb_id = ?
          `).run(
            name,
            coverUrl,
            Number.isInteger(releaseYear) ? releaseYear : null,
            category,
            progress,
            Number.isFinite(hoursPlayed) ? hoursPlayed : null,
            lastPlayed,
            completedDate,
            Number.isFinite(userRating) ? userRating : null,
            listPriceToStore,
            igdbId
          );
        } else {
          db.prepare(`
            INSERT INTO games (
              igdb_id, name, cover_url, release_year, category, progress,
              hours_played, last_played, completed_date, user_rating, list_price, completion_memory
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            igdbId,
            name,
            coverUrl,
            Number.isInteger(releaseYear) ? releaseYear : null,
            category,
            progress,
            Number.isFinite(hoursPlayed) ? hoursPlayed : null,
            lastPlayed,
            completedDate,
            Number.isFinite(userRating) ? userRating : null,
            listPriceToStore,
            null
          );
        }
      });
      tx();
      const game = rowToGame(db.prepare('SELECT * FROM games WHERE igdb_id = ?').get(igdbId));
      res.status(existedBefore ? 200 : 201).json({ game });
    } catch (e) {
      console.error('POST /api/games', e);
      res.status(500).json({ error: 'Failed to save game' });
    }
  });

  r.patch('/games/:igdbId', (req, res) => {
    const igdbId = Number(req.params.igdbId);
    if (!Number.isInteger(igdbId) || igdbId <= 0) {
      return badRequest(res, 'Invalid igdbId');
    }

    const body = req.body || {};
    const allowed = [
      'name',
      'coverUrl',
      'releaseYear',
      'category',
      'progress',
      'hoursPlayed',
      'lastPlayed',
      'completedDate',
      'userRating',
      'listPrice',
      'completionMemory',
    ];
    const patch = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key];
    }

    if (patch.category != null && !CATEGORIES.has(String(patch.category))) {
      return badRequest(res, `category must be one of: ${[...CATEGORIES].join(', ')}`);
    }
    if (patch.progress != null) {
      const p = Number(patch.progress);
      if (Number.isNaN(p) || p < 0 || p > 100) {
        return badRequest(res, 'progress must be between 0 and 100');
      }
      patch.progress = p;
    }
    if (patch.listPrice !== undefined) {
      if (patch.listPrice === null) {
        patch.listPrice = null;
      } else {
        const lp = Number(patch.listPrice);
        if (Number.isNaN(lp) || lp < 0) {
          return badRequest(res, 'listPrice must be a non-negative number or null');
        }
        patch.listPrice = lp;
      }
    }

    if (Object.keys(patch).length === 0) {
      return badRequest(res, 'No updatable fields provided');
    }

    const row = db.prepare('SELECT * FROM games WHERE igdb_id = ?').get(igdbId);
    if (!row) return res.status(404).json({ error: 'Game not found' });

    const next = {
      name: patch.name != null ? String(patch.name).trim() : row.name,
      cover_url: patch.coverUrl !== undefined ? (patch.coverUrl == null ? null : String(patch.coverUrl)) : row.cover_url,
      release_year:
        patch.releaseYear !== undefined
          ? patch.releaseYear == null
            ? null
            : Number(patch.releaseYear)
          : row.release_year,
      category: patch.category != null ? String(patch.category) : row.category,
      progress: patch.progress != null ? patch.progress : row.progress,
      hours_played:
        patch.hoursPlayed !== undefined
          ? patch.hoursPlayed == null
            ? null
            : Number(patch.hoursPlayed)
          : row.hours_played,
      last_played:
        patch.lastPlayed !== undefined
          ? patch.lastPlayed == null
            ? null
            : String(patch.lastPlayed)
          : row.last_played,
      completed_date:
        patch.completedDate !== undefined
          ? patch.completedDate == null
            ? null
            : String(patch.completedDate)
          : row.completed_date,
      user_rating:
        patch.userRating !== undefined
          ? patch.userRating == null
            ? null
            : Number(patch.userRating)
          : row.user_rating,
      list_price:
        patch.listPrice !== undefined
          ? patch.listPrice == null
            ? null
            : Number(patch.listPrice)
          : row.list_price,
      completion_memory:
        patch.completionMemory !== undefined
          ? patch.completionMemory == null
            ? null
            : String(patch.completionMemory)
          : row.completion_memory,
    };

    if (next.progress >= 100 && ['recent', 'favorite', 'wishlist'].includes(next.category)) {
      const ur = Number.isFinite(next.user_rating) ? next.user_rating : null;
      if (ur == null || ur < 1 || ur > 10) {
        return badRequest(
          res,
          'Progress 100 requires a user rating (1–10). Finish the game with a journal entry, or PATCH userRating together with progress.'
        );
      }
      next.category = 'completed';
      if (!next.completed_date) {
        next.completed_date = new Date().toISOString();
      }
    }

    if (!next.name) return badRequest(res, 'name cannot be empty');
    if (!CATEGORIES.has(next.category)) return badRequest(res, 'Invalid category');
    if (next.list_price != null && (Number.isNaN(next.list_price) || next.list_price < 0)) {
      return badRequest(res, 'Invalid listPrice');
    }

    const releaseYearVal =
      next.release_year == null || next.release_year === ''
        ? null
        : Number.isInteger(Number(next.release_year)) && !Number.isNaN(Number(next.release_year))
          ? Number(next.release_year)
          : null;

    try {
      db.prepare(`
        UPDATE games SET
          name = ?,
          cover_url = ?,
          release_year = ?,
          category = ?,
          progress = ?,
          hours_played = ?,
          last_played = ?,
          completed_date = ?,
          user_rating = ?,
          list_price = ?,
          completion_memory = ?,
          updated_at = datetime('now')
        WHERE igdb_id = ?
      `).run(
        next.name,
        next.cover_url,
        releaseYearVal,
        next.category,
        next.progress,
        Number.isFinite(next.hours_played) ? next.hours_played : null,
        next.last_played,
        next.completed_date,
        Number.isFinite(next.user_rating) ? next.user_rating : null,
        next.list_price != null && Number.isFinite(next.list_price) ? next.list_price : null,
        next.completion_memory != null ? next.completion_memory : null,
        igdbId
      );
      res.json({ game: rowToGame(db.prepare('SELECT * FROM games WHERE igdb_id = ?').get(igdbId)) });
    } catch (e) {
      console.error('PATCH /api/games', e);
      res.status(500).json({ error: 'Failed to update game' });
    }
  });

  r.delete('/games/:igdbId', (req, res) => {
    const igdbId = Number(req.params.igdbId);
    if (!Number.isInteger(igdbId) || igdbId <= 0) {
      return badRequest(res, 'Invalid igdbId');
    }
    try {
      const info = db.prepare('DELETE FROM games WHERE igdb_id = ?').run(igdbId);
      if (info.changes === 0) return res.status(404).json({ error: 'Game not found' });
      res.status(204).end();
    } catch (e) {
      console.error('DELETE /api/games', e);
      res.status(500).json({ error: 'Failed to delete game' });
    }
  });

  r.get('/entries', (req, res) => {
    const gameId = req.query.gameId != null ? Number(req.query.gameId) : null;
    try {
      let rows;
      if (gameId != null && Number.isInteger(gameId) && gameId > 0) {
        rows = db.prepare('SELECT * FROM journal_entries WHERE game_id = ? ORDER BY entry_date DESC').all(gameId);
      } else {
        rows = db.prepare('SELECT * FROM journal_entries ORDER BY entry_date DESC').all();
      }
      res.json({ entries: rows.map(rowToEntry) });
    } catch (e) {
      console.error('GET /api/entries', e);
      res.status(500).json({ error: 'Failed to list entries' });
    }
  });

  r.post('/entries', (req, res) => {
    const body = req.body || {};
    const gameId = Number(body.gameId);
    const title = (body.title ?? '').toString().trim();
    const entryDate = (body.entryDate ?? body.date ?? '').toString().trim();

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return badRequest(res, 'gameId must be a positive integer (IGDB id)');
    }
    if (!title) return badRequest(res, 'title is required');
    if (!entryDate) return badRequest(res, 'entryDate is required (ISO string)');

    const id = body.id && String(body.id).length > 0 ? String(body.id) : crypto.randomUUID();
    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    const tagsJson = JSON.stringify(tags);

    const rawSync = body.syncGameProgress;
    let syncProgress = null;
    if (rawSync !== undefined && rawSync !== null && rawSync !== '') {
      const p = Number(rawSync);
      if (Number.isFinite(p) && p >= 0 && p <= 100) syncProgress = p;
    }

    const gBefore = db.prepare('SELECT * FROM games WHERE igdb_id = ?').get(gameId);
    if (!gBefore) {
      return badRequest(res, 'Game not in library — add the game before creating a journal entry');
    }

    if (syncProgress === 100 && !['completed', 'dud'].includes(gBefore.category)) {
      const fg = body.finishGame;
      if (!fg || typeof fg !== 'object') {
        return badRequest(
          res,
          'finishGame is required when syncGameProgress is 100 (provide userRating 1–10 and optional completionMemory)'
        );
      }
      const ur = Number(fg.userRating);
      if (!Number.isFinite(ur) || ur < 1 || ur > 10) {
        return badRequest(res, 'finishGame.userRating must be a number from 1 to 10');
      }
    }

    try {
      const tx = db.transaction(() => {
        db.prepare(`
          INSERT INTO journal_entries (
            id, game_id, title, area_explored, boss_defeated, item_found,
            screenshot_url, notes, mood, session_length, progress_at_entry, tags_json, entry_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          gameId,
          title,
          body.areaExplored != null ? String(body.areaExplored) : null,
          body.bossDefeated != null ? String(body.bossDefeated) : null,
          body.itemFound != null ? String(body.itemFound) : null,
          body.screenshotUrl != null ? String(body.screenshotUrl) : body.screenshot != null ? String(body.screenshot) : null,
          body.notes != null ? String(body.notes) : null,
          (body.mood ?? 'neutral').toString(),
          body.sessionLength != null ? String(body.sessionLength) : null,
          body.progressAtEntry != null ? Number(body.progressAtEntry) : body.progress != null ? Number(body.progress) : null,
          tagsJson,
          entryDate
        );

        const g = db.prepare('SELECT * FROM games WHERE igdb_id = ?').get(gameId);
        let category = g.category;
        if (category === 'wishlist') category = 'recent';

        let progress = g.progress;
        let completed_date = g.completed_date;
        let user_rating =
          g.user_rating != null && Number.isFinite(Number(g.user_rating)) ? Number(g.user_rating) : null;
        let completion_memory =
          g.completion_memory != null && String(g.completion_memory).trim() !== ''
            ? String(g.completion_memory)
            : null;

        if (syncProgress != null) {
          progress = syncProgress;
        }

        if (syncProgress === 100 && !['completed', 'dud'].includes(g.category)) {
          category = 'completed';
          completed_date = new Date().toISOString();
          const fg = body.finishGame;
          user_rating = Number(fg.userRating);
          const mem = fg.completionMemory;
          completion_memory =
            mem != null && String(mem).trim() !== '' ? String(mem).trim() : null;
        }

        db.prepare(`
          UPDATE games SET
            category = ?,
            progress = ?,
            last_played = ?,
            completed_date = ?,
            user_rating = ?,
            completion_memory = ?,
            updated_at = datetime('now')
          WHERE igdb_id = ?
        `).run(
          category,
          progress,
          entryDate,
          completed_date,
          user_rating,
          completion_memory,
          gameId
        );
      });
      tx();
      const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
      const game = rowToGame(db.prepare('SELECT * FROM games WHERE igdb_id = ?').get(gameId));
      res.status(201).json({ entry: rowToEntry(row), game });
    } catch (e) {
      if (e && e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        return badRequest(res, 'Entry id already exists');
      }
      console.error('POST /api/entries', e);
      res.status(500).json({ error: 'Failed to create entry' });
    }
  });

  r.patch('/entries/:id', (req, res) => {
    const id = req.params.id;
    const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Entry not found' });

    const body = req.body || {};
    const next = {
      title: body.title != null ? String(body.title).trim() : row.title,
      area_explored: body.areaExplored !== undefined ? (body.areaExplored == null ? null : String(body.areaExplored)) : row.area_explored,
      boss_defeated: body.bossDefeated !== undefined ? (body.bossDefeated == null ? null : String(body.bossDefeated)) : row.boss_defeated,
      item_found: body.itemFound !== undefined ? (body.itemFound == null ? null : String(body.itemFound)) : row.item_found,
      screenshot_url:
        body.screenshotUrl !== undefined
          ? body.screenshotUrl == null
            ? null
            : String(body.screenshotUrl)
          : body.screenshot !== undefined
            ? body.screenshot == null
              ? null
              : String(body.screenshot)
            : row.screenshot_url,
      notes: body.notes !== undefined ? (body.notes == null ? null : String(body.notes)) : row.notes,
      mood: body.mood != null ? String(body.mood) : row.mood,
      session_length:
        body.sessionLength !== undefined
          ? body.sessionLength == null
            ? null
            : String(body.sessionLength)
          : row.session_length,
      progress_at_entry:
        body.progressAtEntry !== undefined
          ? body.progressAtEntry == null
            ? null
            : Number(body.progressAtEntry)
          : body.progress !== undefined
            ? body.progress == null
              ? null
              : Number(body.progress)
            : row.progress_at_entry,
      entry_date: body.entryDate != null ? String(body.entryDate) : row.entry_date,
    };

    let tagsJson = row.tags_json;
    if (body.tags != null) {
      const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
      tagsJson = JSON.stringify(tags);
    }

    if (!next.title) return badRequest(res, 'title cannot be empty');
    if (!next.entry_date) return badRequest(res, 'entryDate cannot be empty');

    try {
      db.prepare(`
        UPDATE journal_entries SET
          title = ?,
          area_explored = ?,
          boss_defeated = ?,
          item_found = ?,
          screenshot_url = ?,
          notes = ?,
          mood = ?,
          session_length = ?,
          progress_at_entry = ?,
          tags_json = ?,
          entry_date = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        next.title,
        next.area_explored,
        next.boss_defeated,
        next.item_found,
        next.screenshot_url,
        next.notes,
        next.mood,
        next.session_length,
        Number.isFinite(next.progress_at_entry) ? next.progress_at_entry : null,
        tagsJson,
        next.entry_date,
        id
      );
      res.json({ entry: rowToEntry(db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id)) });
    } catch (e) {
      console.error('PATCH /api/entries', e);
      res.status(500).json({ error: 'Failed to update entry' });
    }
  });

  r.delete('/entries/:id', (req, res) => {
    try {
      const info = db.prepare('DELETE FROM journal_entries WHERE id = ?').run(req.params.id);
      if (info.changes === 0) return res.status(404).json({ error: 'Entry not found' });
      res.status(204).end();
    } catch (e) {
      console.error('DELETE /api/entries', e);
      res.status(500).json({ error: 'Failed to delete entry' });
    }
  });

  return r;
}
