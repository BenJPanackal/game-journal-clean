import type { IgdbGame } from '../components/IgdbSearch';
import type { JournalMode, LibraryEntry, LibraryGame } from '../api/library';

export type { JournalMode };

/** Card/list shape used across App (matches former mock fields). */
export type UiGame = {
  id: number;
  title: string;
  image: string;
  cover: string;
  lastPlayed: string;
  progress: number;
  hoursPlayed: number;
  category: string;
  releaseYear?: number;
  streak: number;
  colors: { primary: string; secondary: string; accent: string };
  completedDate?: string;
  userRating?: number | null;
  completionMemory?: string | null;
  isFavorite?: boolean;
  favoriteRank?: number | null;
  /** Drives journal form fields: story vs live / multiplayer session log. */
  journalMode: JournalMode;
};

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=400&fit=crop';

const DEFAULT_COLORS = {
  primary: '#6366F1',
  secondary: '#10B981',
  accent: '#F59E0B',
};

/** Date + time (hours and minutes only, locale-aware); ISO strings from the API become readable labels. */
/** Labels for the three structured entry fields (same DB columns, different copy for session games). */
export function journalFieldLabels(mode: JournalMode | undefined): {
  area: string;
  boss: string;
  item: string;
} {
  if (mode === 'session') {
    return {
      area: 'Characters / roles',
      boss: 'Mode / playlist',
      item: 'Highlight / outcome',
    };
  }
  return {
    area: 'Area Explored',
    boss: 'Boss Defeated',
    item: 'Item Found',
  };
}

export function formatLastPlayedDisplay(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v || v === 'Never') return 'Never';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function igdbCoverUrl(g: IgdbGame): string {
  if (g.coverUrl) return g.coverUrl;
  if (g.cover?.image_id) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`;
  }
  return FALLBACK_COVER;
}

export function igdbReleaseYear(g: IgdbGame): number | undefined {
  if (g.year != null) return g.year;
  if (g.first_release_date != null) {
    return new Date(g.first_release_date * 1000).getFullYear();
  }
  return undefined;
}

/** Build POST /api/games body when adding from IGDB (new library row). */
export function igdbToNewLibraryGame(g: IgdbGame): {
  igdbId: number;
  name: string;
  coverUrl: string | null;
  releaseYear: number | null;
  /** Shows under Recent; user can move to List or Favorites from the sidebar */
  category: 'recent';
  progress: number;
} {
  const year = igdbReleaseYear(g);
  return {
    igdbId: g.id,
    name: g.name,
    coverUrl: igdbCoverUrl(g),
    releaseYear: year != null ? year : null,
    category: 'recent',
    progress: 0,
  };
}

/** Map persisted game → UI card. */
export function apiGameToUiGame(g: LibraryGame): UiGame {
  const cover = g.coverUrl || FALLBACK_COVER;
  return {
    id: g.igdbId,
    title: g.name,
    image: cover,
    cover,
    lastPlayed: formatLastPlayedDisplay(g.lastPlayed?.trim() ? g.lastPlayed : 'Never'),
    progress: g.progress,
    hoursPlayed: g.hoursPlayed ?? 0,
    category: g.category,
    releaseYear: g.releaseYear ?? undefined,
    streak: 0,
    colors: DEFAULT_COLORS,
    completedDate: g.completedDate ?? undefined,
    userRating: g.userRating ?? null,
    completionMemory: g.completionMemory ?? null,
    isFavorite: g.isFavorite ?? false,
    favoriteRank: g.favoriteRank ?? null,
    journalMode: g.journalMode === 'session' ? 'session' : 'story',
  };
}

/** Dashboard “Latest entry” card (legacy field names: content, date, screenshot). */
export type DashboardEntry = {
  id: string;
  gameId: number;
  title: string;
  content: string;
  date: string;
  game: string;
  sessionLength: string;
  areaExplored: string;
  bossDefeated: string;
  itemFound: string;
  mood: string;
  tags: string[];
  screenshot?: string;
};

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function apiEntryToDashboard(e: LibraryEntry, gameTitle: string): DashboardEntry {
  return {
    id: e.id,
    gameId: e.gameId,
    title: e.title,
    content: e.notes ?? '',
    date: formatEntryDate(e.entryDate),
    game: gameTitle,
    sessionLength: e.sessionLength ?? '',
    areaExplored: e.areaExplored ?? '',
    bossDefeated: e.bossDefeated ?? '',
    itemFound: e.itemFound ?? '',
    mood: e.mood,
    tags: e.tags,
    screenshot: e.screenshotUrl ?? undefined,
  };
}

/** JournalPage row (legacy: date string, content, screenshot, numeric id → string). */
export type JournalRowEntry = {
  id: string;
  date: string;
  title: string;
  content: string;
  sessionLength: string;
  mood: string;
  areaExplored: string;
  bossDefeated: string;
  itemFound: string;
  tags: string[];
  screenshot?: string;
  achievements: string[];
};

export function apiEntryToJournalRow(e: LibraryEntry): JournalRowEntry {
  return {
    id: e.id,
    date: e.entryDate,
    title: e.title,
    content: e.notes ?? '',
    sessionLength: e.sessionLength ?? '',
    mood: e.mood,
    areaExplored: e.areaExplored ?? '',
    bossDefeated: e.bossDefeated ?? '',
    itemFound: e.itemFound ?? '',
    tags: e.tags,
    screenshot: e.screenshotUrl ?? undefined,
    achievements: [],
  };
}

/** Payload from JournalEntryModal before POST /api/entries. */
export type NewJournalEntryPayload = {
  title: string;
  entryDate: string;
  areaExplored: string | null;
  bossDefeated: string | null;
  itemFound: string | null;
  screenshotUrl: string | null;
  notes: string | null;
  mood: string;
  sessionLength: string | null;
  progressAtEntry: number | null;
  tags: string[];
  /** Required by API when moving to 100% from an in-progress category */
  finishGame?: { userRating: number; completionMemory?: string | null };
};
