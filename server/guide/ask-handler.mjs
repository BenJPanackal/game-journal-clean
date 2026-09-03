import crypto from 'crypto';
import { rowToGame } from '../db.mjs';
import { extractWikiSections, formatFactsAnswer } from './parse-sections.mjs';
import { mediaWikiApiUrl, mediaWikiFetchPage, mediaWikiSearchPage } from './fetchers/mediawiki.mjs';
import { fetchFextralifePage, guessFextralifeSlug } from './fetchers/fextralife.mjs';
import {
  resolveGameGuideSources,
  saveGuideSources,
  getCachedGuideSources,
  detectWikiType,
} from './resolve-sources.mjs';
import { getLlmSettings, hasGuideLlm } from './llm-settings.mjs';
import { rephraseWithLlm } from './optional-llm.mjs';

const CHUNK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ANSWER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function normQuestion(q) {
  return String(q || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkId(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 32);
}

function queryCacheId(igdbId, question, includeCommunity) {
  return crypto
    .createHash('sha256')
    .update(`${igdbId}:${normQuestion(question)}:${includeCommunity ? 1 : 0}`)
    .digest('hex')
    .slice(0, 32);
}

function isFresh(iso, ttlMs) {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < ttlMs;
}

/** @param {import('better-sqlite3').Database} db */
function getCachedChunk(db, url) {
  const row = db.prepare('SELECT * FROM guide_chunks WHERE source_url = ?').get(url);
  if (!row || !isFresh(row.fetched_at, CHUNK_TTL_MS)) return null;
  return row;
}

/** @param {import('better-sqlite3').Database} db */
function saveChunk(db, { igdbId, sourceUrl, sourceType, title, content }) {
  const id = chunkId(sourceUrl);
  db.prepare(
    `INSERT INTO guide_chunks (id, igdb_id, source_url, source_type, title, content, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(source_url) DO UPDATE SET
       title = excluded.title,
       content = excluded.content,
       fetched_at = datetime('now')`
  ).run(id, igdbId, sourceUrl, sourceType, title, content);
}

/** @param {import('better-sqlite3').Database} db */
function getAnswerCache(db, igdbId, question, includeCommunity) {
  const id = queryCacheId(igdbId, question, includeCommunity);
  const row = db.prepare('SELECT * FROM guide_query_cache WHERE id = ?').get(id);
  if (!row || !isFresh(row.created_at, ANSWER_CACHE_TTL_MS)) return null;
  try {
    return JSON.parse(row.answer_json);
  } catch {
    return null;
  }
}

/** @param {import('better-sqlite3').Database} db */
function saveAnswerCache(db, igdbId, question, includeCommunity, payload) {
  const id = queryCacheId(igdbId, question, includeCommunity);
  db.prepare(
    `INSERT INTO guide_query_cache (id, igdb_id, question_norm, include_community, answer_json, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET answer_json = excluded.answer_json, created_at = datetime('now')`
  ).run(id, igdbId, normQuestion(question), includeCommunity ? 1 : 0, JSON.stringify(payload));
}

/**
 * @param {{ wikiBaseUrl: string, wikiSourceType: string, searchTerm: string, igdbId: number, db: import('better-sqlite3').Database }}
 */
async function fetchWikiPage({ wikiBaseUrl, wikiSourceType, searchTerm, igdbId, db }) {
  if (wikiSourceType === 'fextralife') {
    const slug = guessFextralifeSlug(searchTerm);
    if (!slug) return null;
    const url = `${wikiBaseUrl.replace(/\/$/, '')}/${slug}`;
    const cached = getCachedChunk(db, url);
    if (cached) {
      return {
        title: cached.title,
        html: cached.content,
        pageUrl: cached.source_url,
        sourceType: 'wiki',
      };
    }
    const page = await fetchFextralifePage(wikiBaseUrl, slug);
    if (!page) return null;
    saveChunk(db, {
      igdbId,
      sourceUrl: page.pageUrl,
      sourceType: 'wiki',
      title: page.title,
      content: page.html,
    });
    return { ...page, sourceType: 'wiki' };
  }

  const apiUrl = mediaWikiApiUrl(wikiBaseUrl);
  const hit = await mediaWikiSearchPage(apiUrl, searchTerm);
  if (!hit) return null;

  const cached = getCachedChunk(db, hit.pageUrl);
  if (cached) {
    return {
      title: cached.title,
      html: cached.content,
      pageUrl: cached.source_url,
      sourceType: 'wiki',
    };
  }

  const page = await mediaWikiFetchPage(apiUrl, hit.title);
  if (!page) return null;
  saveChunk(db, {
    igdbId,
    sourceUrl: page.pageUrl,
    sourceType: 'wiki',
    title: page.title,
    content: page.html,
  });
  return { ...page, sourceType: 'wiki' };
}

function buildCitations(sections, page) {
  const tier = page.sourceType === 'official' ? 'official' : 'wiki';
  return sections.slice(0, 4).map((s) => ({
    tier,
    title: s.title,
    url: page.pageUrl,
    excerpt: s.body.slice(0, 400),
  }));
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ gameId: number, question: string, includeCommunity?: boolean, useLlm?: boolean }} body
 * @param {object} igdb
 */
export async function handleGuideAsk(db, body, igdb) {
  const gameId = Number(body.gameId);
  const question = String(body.question || '').trim();
  const includeCommunity = Boolean(body.includeCommunity);
  const useLlm = Boolean(body.useLlm);

  if (!Number.isFinite(gameId) || gameId <= 0) {
    return { status: 400, body: { error: 'gameId is required' } };
  }
  if (question.length < 3) {
    return { status: 400, body: { error: 'question must be at least 3 characters' } };
  }
  if (question.length > 500) {
    return { status: 400, body: { error: 'question is too long' } };
  }

  const gameRow = db.prepare('SELECT * FROM games WHERE igdb_id = ?').get(gameId);
  const game = rowToGame(gameRow);
  if (!game) {
    return { status: 404, body: { error: 'Game not found in library' } };
  }

  if (includeCommunity) {
    return {
      status: 501,
      body: {
        error: 'community_sources_not_available',
        message: 'Community sources (Reddit, forums) are not available in v1. Wiki-only answers are supported.',
      },
    };
  }

  const cachedAnswer = getAnswerCache(db, gameId, question, false);
  if (cachedAnswer && (!useLlm || cachedAnswer.mode === 'llm')) {
    return { status: 200, body: { ...cachedAnswer, cached: true } };
  }

  const sources = await resolveGameGuideSources(db, gameId, game.name, igdb);
  if (!sources?.wikiBaseUrl) {
    return {
      status: 404,
      body: {
        error: 'wiki_not_configured',
        message:
          'No wiki URL found for this game. Add the game via IGDB (for website links) or set a wiki URL in guide sources.',
      },
    };
  }

  const page = await fetchWikiPage({
    wikiBaseUrl: sources.wikiBaseUrl,
    wikiSourceType: sources.wikiSourceType,
    searchTerm: question,
    igdbId: gameId,
    db,
  });

  if (!page) {
    return {
      status: 404,
      body: {
        error: 'wiki_page_not_found',
        message: `Could not find a wiki page matching "${question}" on ${sources.wikiBaseUrl}.`,
        wikiBaseUrl: sources.wikiBaseUrl,
      },
    };
  }

  const sections = extractWikiSections(page.html);
  const facts = formatFactsAnswer(sections, page.title);
  const citations = buildCitations(facts.sections, page);

  let answer = facts.answer;
  let mode = 'facts';
  let disclaimer = null;

  if (useLlm && hasGuideLlm(db)) {
    try {
      const llm = getLlmSettings(db);
      answer = await rephraseWithLlm({
        provider: llm.provider,
        apiKey: llm.apiKey,
        ollamaBaseUrl: llm.ollamaBaseUrl,
        question,
        sections: facts.sections,
      });
      mode = 'llm';
      disclaimer = 'Answer rephrased by your local/cloud LLM from wiki excerpts only.';
    } catch (e) {
      console.warn('guide: LLM rephrase failed, falling back to facts', e?.message || e);
      disclaimer = 'LLM rephrase failed — showing parsed wiki sections instead.';
    }
  }

  const payload = {
    answer,
    citations,
    disclaimer,
    mode,
    wikiBaseUrl: sources.wikiBaseUrl,
    pageTitle: page.title,
    pageUrl: page.pageUrl,
  };

  saveAnswerCache(db, gameId, question, false, payload);
  return { status: 200, body: payload };
}

/** @param {import('better-sqlite3').Database} db */
export function getGuideSourcesForGame(db, igdbId) {
  const row = getCachedGuideSources(db, igdbId);
  if (!row) return null;
  return {
    igdbId,
    wikiBaseUrl: row.wiki_base_url,
    wikiSourceType: row.wiki_source_type,
    officialUrl: row.official_url,
    updatedAt: row.updated_at,
  };
}

/** @param {import('better-sqlite3').Database} db */
export function patchGuideSources(db, igdbId, body) {
  const wikiBaseUrl =
    body.wikiBaseUrl != null && String(body.wikiBaseUrl).trim()
      ? String(body.wikiBaseUrl).trim().replace(/\/$/, '')
      : null;
  if (!wikiBaseUrl) {
    return { status: 400, body: { error: 'wikiBaseUrl is required' } };
  }
  const wikiSourceType =
    body.wikiSourceType != null ? String(body.wikiSourceType) : detectWikiType(wikiBaseUrl);
  saveGuideSources(db, igdbId, {
    wikiBaseUrl,
    wikiSourceType,
    officialUrl: body.officialUrl != null ? String(body.officialUrl).trim() || null : null,
  });
  return { status: 200, body: getGuideSourcesForGame(db, igdbId) };
}
