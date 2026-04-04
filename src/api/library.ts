/** Shapes returned by the Node SQLite API (camelCase JSON). */

export type LibraryCategory = 'recent' | 'favorite' | 'wishlist' | 'completed' | 'dud';

/** Story-style entries (areas, bosses) vs session logs for live / multiplayer games. */
export type JournalMode = 'story' | 'session';

export type LibraryGame = {
  igdbId: number;
  name: string;
  coverUrl: string | null;
  releaseYear: number | null;
  category: LibraryCategory;
  progress: number;
  hoursPlayed: number | null;
  lastPlayed: string | null;
  completedDate: string | null;
  userRating: number | null;
  /** Final thoughts saved when marking complete via journal survey. */
  completionMemory: string | null;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  favoriteRank: number | null;
  /** Omitted on older API responses; UI defaults to story. */
  journalMode?: JournalMode;
};

export type LibraryEntry = {
  id: string;
  gameId: number;
  title: string;
  areaExplored: string | null;
  bossDefeated: string | null;
  itemFound: string | null;
  /** Competitive / ranked tier before this session (session journal). */
  rankBefore: string | null;
  rankAfter: string | null;
  screenshotUrl: string | null;
  notes: string | null;
  mood: string;
  sessionLength: string | null;
  progressAtEntry: number | null;
  tags: string[];
  entryDate: string;
  createdAt: string;
  updatedAt: string;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as {
      error?: unknown;
      message?: unknown;
      details?: { status?: number; data?: unknown };
    };
    if (j && typeof j.error === 'string') {
      if (j.error === 'igdb_not_configured' && typeof j.message === 'string') {
        return j.message;
      }
      if (j.details?.data != null) {
        const extra =
          typeof j.details.data === 'string'
            ? j.details.data
            : JSON.stringify(j.details.data);
        return `${j.error} (${extra.slice(0, 240)}${extra.length > 240 ? '…' : ''})`;
      }
      return j.error;
    }
  } catch {
    /* not JSON */
  }
  const trimmed = text.trim();
  const looksLikeHtml =
    /^<!doctype html/i.test(trimmed) || /<html[\s>]/i.test(trimmed) || trimmed.startsWith('<html');
  if (looksLikeHtml) {
    return 'Got an HTML page instead of JSON — often the dev proxy is pointed at the wrong port (API should be on 3001; check vite.config.ts and restart npm run dev).';
  }
  if (trimmed && !trimmed.startsWith('<') && trimmed.length < 400) return trimmed;
  if (res.status === 502 || res.status === 503) {
    return `API unreachable (proxy target or API server not running — expect Node on port 3001). ${res.statusText || res.status}`;
  }
  return res.statusText || `HTTP ${res.status}`;
}

export async function fetchLibrary(): Promise<{ games: LibraryGame[]; entries: LibraryEntry[] }> {
  const res = await fetch('/api/library');
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export type PostGameBody = {
  igdbId: number;
  name: string;
  category: LibraryCategory;
  coverUrl?: string | null;
  releaseYear?: number | null;
  progress?: number;
  hoursPlayed?: number | null;
  lastPlayed?: string | null;
  completedDate?: string | null;
  userRating?: number | null;
  journalMode?: JournalMode;
};

export async function postGame(body: PostGameBody): Promise<LibraryGame> {
  const res = await fetch('/api/games', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = await res.json();
  return data.game as LibraryGame;
}

export async function patchGame(
  igdbId: number,
  patch: Partial<{
    name: string;
    coverUrl: string | null;
    releaseYear: number | null;
    category: LibraryCategory;
    progress: number;
    hoursPlayed: number | null;
    lastPlayed: string | null;
    completedDate: string | null;
    userRating: number | null;
    completionMemory: string | null;
    isFavorite: boolean;
    favoriteRank: number | null;
    journalMode: JournalMode;
  }>
): Promise<LibraryGame> {
  const res = await fetch(`/api/games/${igdbId}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = await res.json();
  return data.game as LibraryGame;
}

export type PostEntryBody = {
  gameId: number;
  title: string;
  entryDate: string;
  areaExplored?: string | null;
  bossDefeated?: string | null;
  itemFound?: string | null;
  rankBefore?: string | null;
  rankAfter?: string | null;
  screenshotUrl?: string | null;
  notes?: string | null;
  mood?: string;
  sessionLength?: string | null;
  progressAtEntry?: number | null;
  tags?: string[];
  /** When set, updates library game progress in the same DB transaction (one round-trip). */
  syncGameProgress?: number | null;
  /** Required when syncGameProgress is 100 and the game is not already completed (journal completion flow). */
  finishGame?: {
    userRating: number;
    completionMemory?: string | null;
  };
};

export async function createEntry(
  body: PostEntryBody
): Promise<{ entry: LibraryEntry; game: LibraryGame | null }> {
  const res = await fetch('/api/entries', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { entry: LibraryEntry; game?: LibraryGame | null };
  return { entry: data.entry, game: data.game ?? null };
}
