import type { IgdbGame } from '../components/IgdbSearch';
import type { LibraryEntry, LibraryGame } from '../api/library';

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
  /** USD list price from library row; null/undefined shows as em dash in UI */
  listPrice?: number | null;
  userRating?: number | null;
  completionMemory?: string | null;
};

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=400&fit=crop';

const DEFAULT_COLORS = {
  primary: '#6366F1',
  secondary: '#10B981',
  accent: '#F59E0B',
};

const usdPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatListPriceUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return usdPrice.format(value);
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

/** Prefer Steam final price (USD) when game-details returned Valve data linked from IGDB. */
function igdbLinkedSteamListPriceUsd(g: IgdbGame): number | null {
  const sp = g.steamPrice;
  if (!sp || !Number.isFinite(sp.final)) return null;
  return sp.final;
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
  listPrice?: number | null;
} {
  const year = igdbReleaseYear(g);
  const listPrice = igdbLinkedSteamListPriceUsd(g);
  return {
    igdbId: g.id,
    name: g.name,
    coverUrl: igdbCoverUrl(g),
    releaseYear: year != null ? year : null,
    category: 'recent',
    progress: 0,
    ...(listPrice != null ? { listPrice } : {}),
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
    lastPlayed: g.lastPlayed?.trim() ? g.lastPlayed : 'Never',
    progress: g.progress,
    hoursPlayed: g.hoursPlayed ?? 0,
    category: g.category,
    releaseYear: g.releaseYear ?? undefined,
    streak: 0,
    colors: DEFAULT_COLORS,
    completedDate: g.completedDate ?? undefined,
    listPrice: g.listPrice ?? null,
    userRating: g.userRating ?? null,
    completionMemory: g.completionMemory ?? null,
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
