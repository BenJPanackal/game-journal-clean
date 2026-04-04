// server/db.mjs — SQLite for local library + journal (see agents.md)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'journal.sqlite');

const MIGRATION_VERSION = 1;

const CATEGORIES = new Set(['recent', 'favorite', 'wishlist', 'completed', 'dud']);

export { CATEGORIES, DB_PATH };

function columnExists(db, table, col) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === col);
}

function ensureSchema(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS games (
      igdb_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      cover_url TEXT,
      release_year INTEGER,
      category TEXT NOT NULL CHECK (category IN ('recent','favorite','wishlist','completed','dud')),
      progress REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      hours_played REAL,
      last_played TEXT,
      completed_date TEXT,
      user_rating REAL CHECK (user_rating IS NULL OR (user_rating >= 0 AND user_rating <= 10)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      game_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      area_explored TEXT,
      boss_defeated TEXT,
      item_found TEXT,
      screenshot_url TEXT,
      notes TEXT,
      mood TEXT NOT NULL DEFAULT 'neutral',
      session_length TEXT,
      progress_at_entry REAL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      entry_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_entries_game_id ON journal_entries(game_id);
    CREATE INDEX IF NOT EXISTS idx_entries_entry_date ON journal_entries(entry_date);
  `);

  const row = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(MIGRATION_VERSION);
  if (!row) {
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(MIGRATION_VERSION);
  }

  if (!columnExists(db, 'games', 'list_price')) {
    db.exec('ALTER TABLE games ADD COLUMN list_price REAL');
  }
}

export function openDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  ensureSchema(db);
  return db;
}

export function rowToGame(row) {
  if (!row) return null;
  return {
    igdbId: row.igdb_id,
    name: row.name,
    coverUrl: row.cover_url,
    releaseYear: row.release_year,
    category: row.category,
    progress: row.progress,
    hoursPlayed: row.hours_played,
    lastPlayed: row.last_played,
    completedDate: row.completed_date,
    userRating: row.user_rating,
    listPrice: row.list_price != null && Number.isFinite(Number(row.list_price)) ? Number(row.list_price) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToEntry(row) {
  if (!row) return null;
  let tags = [];
  try {
    tags = JSON.parse(row.tags_json || '[]');
    if (!Array.isArray(tags)) tags = [];
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    gameId: row.game_id,
    title: row.title,
    areaExplored: row.area_explored,
    bossDefeated: row.boss_defeated,
    itemFound: row.item_found,
    screenshotUrl: row.screenshot_url,
    notes: row.notes,
    mood: row.mood,
    sessionLength: row.session_length,
    progressAtEntry: row.progress_at_entry,
    tags,
    entryDate: row.entry_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
