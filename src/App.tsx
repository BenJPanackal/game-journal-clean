import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Heart, Clock, Bookmark, Star, Gamepad2, Trophy, Target, Plus, Minus, X, Edit3, MapPin, Sword, Flame, TrendingUp, Database, ThumbsDown, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import JournalPage from './components/JournalPage';
import JournalEntryModal from './components/JournalEntryModal';
import IgdbGameDetailModal from './components/IgdbGameDetailModal';
import CompletionSurveyModal from './components/CompletionSurveyModal';
import IgdbSearch from "./components/IgdbSearch";
import type { IgdbGame } from "./components/IgdbSearch";
import { createEntry, fetchLibrary, patchGame, postGame } from './api/library';
import type { LibraryEntry, LibraryGame } from './api/library';
import {
  apiEntryToDashboard,
  apiGameToUiGame,
  formatListPriceUsd,
  igdbToNewLibraryGame,
  type NewJournalEntryPayload,
  type UiGame,
} from './lib/libraryUi';


const SidebarGameCard = ({
  game,
  onClick,
  showFavoriteToggle,
  onToggleFavorite,
}: {
  game: UiGame;
  onClick: () => void;
  showFavoriteToggle: boolean;
  onToggleFavorite: (game: UiGame) => void;
}) => (
  <div 
    onClick={() => {
      console.log('🎮 Sidebar game clicked:', game.title);
      onClick();
    }}
    className="mb-2 journal-card hover:border-primary/50 smooth-transition interactive-hover z-depth-1 rounded-lg overflow-hidden"
  >
    <div className="p-3">
      <div className="flex gap-3">
        <div className="relative flex-shrink-0">
          <img
            src={game.cover}
            alt={game.title}
            className="w-10 h-14 object-cover rounded border border-primary/20"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=400&fit=crop';
            }}
          />
          {game.progress > 0 && (
            <div 
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs text-white z-depth-1"
              style={{
                background: game.progress === 100 ? '#22C55E' : `linear-gradient(45deg, ${game.colors.primary}, ${game.colors.secondary})`,
                fontSize: '9px'
              }}
            >
              {game.progress === 100 ? '✓' : `${game.progress}%`}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1 gap-1">
            <h4 className="text-xs truncate readable-accent min-w-0" style={{ color: game.colors.primary }}>
              {game.title}
            </h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              {showFavoriteToggle ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(game);
                  }}
                  className="p-0.5 rounded hover:bg-destructive/15"
                  title={game.category === 'favorite' ? 'Remove from favorites' : 'Add to favorites'}
                  aria-label={game.category === 'favorite' ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart
                    className={`w-3 h-3 ${
                      game.category === 'favorite'
                        ? 'text-destructive fill-destructive'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ) : (
                game.category === 'favorite' && (
                  <Heart className="w-3 h-3 text-destructive fill-destructive" />
                )
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground mb-1">
              {game.category === 'completed' ? `Completed ${game.completedDate ? new Date(game.completedDate).toLocaleDateString() : ''}` : game.lastPlayed}
            </p>
            {game.streak > 0 && (
              <div className="flex items-center gap-1 bg-destructive/20 rounded-full px-2 py-0.5">
                <Flame className="w-2 h-2 text-destructive" />
                <span className="text-xs text-destructive">{game.streak}d</span>
              </div>
            )}
          </div>
          
          {game.hoursPlayed > 0 && (
            <p className="text-xs text-secondary">{game.hoursPlayed}h</p>
          )}
          <p className="text-xs text-accent flex items-center gap-1 mt-0.5">
            <DollarSign className="w-3 h-3 flex-shrink-0" />
            {formatListPriceUsd(game.listPrice)}
          </p>
        </div>
      </div>
    </div>
  </div>
);

const MainGameCard = ({
  game,
  onClick,
  isLargest = false,
  onToggleFavorite,
}: {
  game: UiGame;
  onClick: () => void;
  isLargest?: boolean;
  onToggleFavorite?: (game: UiGame) => void;
}) => {
  const progressGradient = game.progress > 0 ? 
    (game.progress === 100 ? 'linear-gradient(90deg, #22C55E, #16A34A)' : `linear-gradient(90deg, ${game.colors.primary}, ${game.colors.secondary})`) : 
    'none';

  const cardSize = isLargest ? "p-8" : "p-6";
  const imageSize = isLargest ? "w-32 h-42" : "w-24 h-32";
  const titleSize = isLargest ? "text-3xl" : "text-2xl";
  const zDepth = isLargest ? "z-depth-3" : "z-depth-2";

  return (
    <div 
      onClick={() => {
        console.log('🎮 Main game card clicked:', game.title);
        onClick();
      }}
      className={`journal-card journal-card-dashboard hover:border-primary/50 smooth-transition interactive-hover ${zDepth} rounded-lg overflow-hidden ${cardSize} ${isLargest ? 'ring-1 ring-primary/20' : ''}`}
    >
      <div className="flex gap-6">
        <div className="relative flex-shrink-0">
          <img
            src={game.cover}
            alt={game.title}
            className={`${imageSize} object-cover rounded-lg border border-primary/20 z-depth-1 shadow-lg`}
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=400&fit=crop';
            }}
          />
          {game.progress === 100 && (
            <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-sm rounded-full p-1">
              <Trophy className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className={`${titleSize} readable-accent`} style={{ color: game.colors.primary }}>
                  {game.title}
                </h3>
                {game.streak > 0 && (
                  <div className="flex items-center gap-1 bg-destructive/30 backdrop-blur-sm rounded-full px-3 py-1">
                    <Flame className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">{game.streak} day streak</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {game.category === 'completed' ? `Completed ${game.completedDate ? new Date(game.completedDate).toLocaleDateString() : ''}` : game.lastPlayed}
                </span>
                {game.hoursPlayed > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {game.hoursPlayed}h played
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {formatListPriceUsd(game.listPrice)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              {onToggleFavorite && !['completed', 'dud'].includes(game.category) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(game);
                  }}
                  className="text-xs px-2 py-1 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 fast-transition whitespace-nowrap"
                >
                  <Heart
                    className={`w-3 h-3 inline mr-1 align-middle ${
                      game.category === 'favorite' ? 'fill-destructive' : ''
                    }`}
                  />
                  {game.category === 'favorite' ? 'Unfavorite' : 'Favorite'}
                </button>
              )}
            </div>
          </div>
          
          {game.progress > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="readable-text">{game.progress}%</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-3 rounded-full smooth-transition relative"
                  style={{
                    width: `${game.progress}%`,
                    background: progressGradient,
                    boxShadow: `0 0 6px ${game.progress === 100 ? '#22C55E' : game.colors.primary}30`
                  }}
                >
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${game.progress === 100 ? '#16A34A' : game.colors.secondary}20, transparent)`,
                      animation: 'shimmer 2s infinite'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {game.progress === 0 && ['recent', 'wishlist', 'favorite'].includes(game.category) && (
            <div className="flex items-center gap-2 mt-4">
              <Bookmark className="w-5 h-5 text-accent" />
              <span className="text-accent">
                {game.category === 'wishlist'
                  ? 'On your list'
                  : game.category === 'favorite'
                    ? 'Favorite — not started'
                    : 'Recently added'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${className}`}>
    {children}
  </span>
);

function mergeGame(list: LibraryGame[], next: LibraryGame): LibraryGame[] {
  const i = list.findIndex((g) => g.igdbId === next.igdbId);
  if (i === -1) return [next, ...list];
  const copy = [...list];
  copy[i] = next;
  return copy;
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState<'inprogress' | 'completed'>('inprogress');
  const [activeTab, setActiveTab] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<UiGame | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [libraryGames, setLibraryGames] = useState<LibraryGame[]>([]);
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [entryExpanded, setEntryExpanded] = useState(false);
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);
  const [igdbPreview, setIgdbPreview] = useState<IgdbGame | null>(null);
  const [completionSurveyOpen, setCompletionSurveyOpen] = useState(false);
  const [completionDraft, setCompletionDraft] = useState<{
    game: UiGame;
    payload: NewJournalEntryPayload;
  } | null>(null);

  const gameTitleById = useMemo(() => {
    const m = new Map<number, string>();
    for (const g of libraryGames) m.set(g.igdbId, g.name);
    return m;
  }, [libraryGames]);

  const refreshLibrary = useCallback(async () => {
    setLibraryError(null);
    const { games, entries } = await fetchLibrary();
    setLibraryGames(games);
    setLibraryEntries(entries);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLibraryLoading(true);
    refreshLibrary()
      .catch((e) => {
        if (!cancelled) setLibraryError(e instanceof Error ? e.message : 'Failed to load library');
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshLibrary]);

  const getTabCounts = () => ({
    recent: libraryGames.filter((g) => g.category === 'recent').length,
    favorite: libraryGames.filter((g) => g.category === 'favorite').length,
    wishlist: libraryGames.filter((g) => g.category === 'wishlist').length,
    completed: libraryGames.filter((g) => g.category === 'completed').length,
    duds: libraryGames.filter((g) => g.category === 'dud').length,
  });

  const getFilteredUiGames = (): UiGame[] => {
    const q = sidebarSearchQuery.toLowerCase();
    const match = (g: LibraryGame) => g.name.toLowerCase().includes(q);

    if (activeCategory === 'completed') {
      if (activeTab === 'completed' || activeTab === 'favorite') {
        return libraryGames.filter((g) => g.category === 'completed' && match(g)).map(apiGameToUiGame);
      }
      if (activeTab === 'duds') {
        return libraryGames.filter((g) => g.category === 'dud' && match(g)).map(apiGameToUiGame);
      }
      return [];
    }
    return libraryGames
      .filter((g) => g.category === activeTab && match(g))
      .map(apiGameToUiGame);
  };

  const getAvailableTabs = () => {
    if (activeCategory === 'completed') {
      return [
        { id: 'completed', label: 'Done', icon: Trophy, color: 'green-600' },
        { id: 'favorite', label: 'Favs', icon: Heart, color: 'destructive' },
        { id: 'duds', label: 'Duds', icon: ThumbsDown, color: 'letdowns' },
      ];
    }
    return [
      { id: 'recent', label: 'Recent', icon: Clock, color: 'secondary' },
      { id: 'favorite', label: 'Favs', icon: Heart, color: 'destructive' },
      { id: 'wishlist', label: 'List', icon: Bookmark, color: 'accent' },
    ];
  };

  const getRecentGames = (): UiGame[] =>
    libraryGames.filter((g) => g.category === 'recent').slice(0, 3).map(apiGameToUiGame);

  const handleGameClick = (game: UiGame) => {
    setSelectedGame(game);
  };

  const handleBackToMain = () => {
    setSelectedGame(null);
  };

  const openIgdbPreview = (g: IgdbGame) => {
    setSearchQuery(g.name);
    setIgdbPreview(g);
  };

  const addIgdbGameFromModal = async (g: IgdbGame) => {
    try {
      const saved = await postGame(igdbToNewLibraryGame(g));
      setLibraryGames((prev) => mergeGame(prev, saved));
      handleGameClick(apiGameToUiGame(saved));
    } catch (e) {
      console.error(e);
      setLibraryError(e instanceof Error ? e.message : 'Could not add game to library');
      throw e;
    }
  };

  const openJournalFromIgdbPreview = () => {
    if (!igdbPreview) return;
    const row = libraryGames.find((x) => x.igdbId === igdbPreview.id);
    if (row) handleGameClick(apiGameToUiGame(row));
  };

  const persistJournalEntry = async (
    game: UiGame,
    payload: NewJournalEntryPayload,
    completion?: { userRating: number; completionMemory: string | null }
  ): Promise<void | 'deferred'> => {
    const progress =
      completion != null
        ? 100
        : payload.progressAtEntry != null && Number.isFinite(payload.progressAtEntry)
          ? payload.progressAtEntry
          : game.progress;

    const inlineFinish =
      completion == null &&
      progress >= 100 &&
      !['completed', 'dud'].includes(game.category) &&
      payload.finishGame != null &&
      Number.isFinite(payload.finishGame.userRating) &&
      payload.finishGame.userRating >= 1 &&
      payload.finishGame.userRating <= 10;

    if (
      !completion &&
      progress >= 100 &&
      !['completed', 'dud'].includes(game.category) &&
      !inlineFinish
    ) {
      setCompletionDraft({ game, payload });
      setCompletionSurveyOpen(true);
      return 'deferred';
    }

    const shouldSyncProgress =
      completion != null ||
      progress !== game.progress ||
      (inlineFinish && progress >= 100);

    const finishGamePayload =
      completion != null
        ? {
            userRating: completion.userRating,
            completionMemory: completion.completionMemory,
          }
        : inlineFinish
          ? {
              userRating: payload.finishGame!.userRating,
              completionMemory: payload.finishGame!.completionMemory ?? null,
            }
          : undefined;

    const { entry, game: updatedGame } = await createEntry({
      gameId: game.id,
      title: payload.title,
      entryDate: payload.entryDate,
      areaExplored: payload.areaExplored,
      bossDefeated: payload.bossDefeated,
      itemFound: payload.itemFound,
      screenshotUrl: payload.screenshotUrl,
      notes: payload.notes,
      mood: payload.mood,
      sessionLength: payload.sessionLength,
      progressAtEntry: payload.progressAtEntry,
      tags: payload.tags,
      syncGameProgress: shouldSyncProgress ? progress : undefined,
      finishGame: finishGamePayload,
    });
    setLibraryEntries((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)]);

    if (updatedGame) {
      setLibraryGames((prev) => mergeGame(prev, updatedGame));
      setSelectedGame((sg) => (sg && sg.id === game.id ? apiGameToUiGame(updatedGame) : sg));
    }
  };

  const handleSaveJournalEntryFromDashboard = async (payload: NewJournalEntryPayload) => {
    const recent = getRecentGames()[0];
    const listPick = libraryGames.find((g) => g.category === 'wishlist');
    const inProgressPick = libraryGames.find((g) =>
      ['recent', 'favorite', 'wishlist'].includes(g.category)
    );
    const fallback = libraryGames[0] ? apiGameToUiGame(libraryGames[0]) : null;
    const target =
      recent ?? (listPick ? apiGameToUiGame(listPick) : null) ?? (inProgressPick ? apiGameToUiGame(inProgressPick) : null) ?? fallback;
    if (!target) {
      setLibraryError('Add a game to your library before creating an entry.');
      return;
    }
    return persistJournalEntry(target, payload);
  };

  const handleSaveJournalEntryForSelectedGame = async (payload: NewJournalEntryPayload) => {
    if (!selectedGame) return;
    return persistJournalEntry(selectedGame, payload);
  };

  const handleCompletionSurveyConfirm = async (data: {
    userRating: number;
    completionMemory: string | null;
  }) => {
    if (!completionDraft) return;
    const { game, payload } = completionDraft;
    setCompletionDraft(null);
    setCompletionSurveyOpen(false);
    setLibraryError(null);
    try {
      await persistJournalEntry(game, payload, data);
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : 'Could not save completion');
    }
  };

  const handleCompletionSurveyCancel = () => {
    setCompletionDraft(null);
    setCompletionSurveyOpen(false);
    setLibraryError('Completion cancelled — that journal entry was not saved.');
  };

  const handleToggleFavorite = async (g: UiGame) => {
    if (['completed', 'dud'].includes(g.category)) return;
    setLibraryError(null);
    try {
      const nextCat = g.category === 'favorite' ? 'recent' : 'favorite';
      const updated = await patchGame(g.id, { category: nextCat });
      setLibraryGames((prev) => mergeGame(prev, updated));
      setSelectedGame((sg) => (sg?.id === g.id ? apiGameToUiGame(updated) : sg));
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : 'Could not update favorites');
    }
  };

  const sortedDashboardEntries = useMemo(
    () => [...libraryEntries].sort((a, b) => b.entryDate.localeCompare(a.entryDate)),
    [libraryEntries]
  );

  const latestEntry =
    sortedDashboardEntries.length > 0
      ? apiEntryToDashboard(
          sortedDashboardEntries[0],
          gameTitleById.get(sortedDashboardEntries[0].gameId) ?? 'Unknown game'
        )
      : null;

  const handleReadFullEntry = () => {
    if (!latestEntry) return;
    const row = libraryGames.find((g) => g.igdbId === latestEntry.gameId);
    if (row) handleGameClick(apiGameToUiGame(row));
  };

  const handleStatCardClick = (statType: string) => {
    if (statType === 'completed') {
      setActiveCategory('completed');
      setActiveTab('completed');
    } else {
      setActiveCategory('inprogress');
      setActiveTab('recent');
    }
  };

  const handleScreenshotClick = (screenshot: string) => {
    setScreenshotModal(screenshot);
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'excited':
        return 'bg-secondary/20 text-secondary';
      case 'satisfied':
        return 'bg-accent/20 text-accent';
      case 'neutral':
        return 'bg-neutral/20 text-neutral';
      case 'emotional':
        return 'bg-primary/20 text-primary';
      case 'frustrated':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-accent/20 text-accent';
    }
  };

  useEffect(() => {
    if (activeCategory === 'completed') {
      setActiveTab('completed');
    }
  }, [activeCategory]);

  const entriesForSelectedGame = useMemo(() => {
    if (!selectedGame) return [];
    return libraryEntries.filter((e) => e.gameId === selectedGame.id);
  }, [libraryEntries, selectedGame]);

  if (selectedGame) {
    return (
      <JournalPage
        game={selectedGame}
        onBack={handleBackToMain}
        entries={entriesForSelectedGame}
        onSaveEntry={handleSaveJournalEntryForSelectedGame}
      />
    );
  }

  const tabCounts = getTabCounts();
  const inProgressCount = libraryGames.filter((g) =>
    ['recent', 'favorite', 'wishlist'].includes(g.category)
  ).length;
  const totalHours = libraryGames.reduce((sum, game) => sum + (game.hoursPlayed ?? 0), 0);
  const weeklyHours = '—';
  const gamesPlayedThisWeek = '—';
  const activeStreaks = 0;
  const availableTabs = getAvailableTabs();
  const modalGame: UiGame | null = getRecentGames()[0] ?? (libraryGames[0] ? apiGameToUiGame(libraryGames[0]) : null);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-sidebar border-r border-sidebar-border z-depth-2 flex flex-col scanlines">
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl text-primary readable-accent mb-2">
            GAME JOURNAL
          </h1>
          <p className="text-sm text-muted-foreground">Track your gaming adventures</p>
        </div>

        {/* Category Cards - Fixed completed card styling to match in-progress exactly */}
        <div className="p-4 grid grid-cols-2 gap-2">
          <div
            onClick={() => handleStatCardClick('inprogress')}
            className={`journal-card z-depth-1 rounded-lg p-3 text-center interactive-hover cursor-pointer ${
              activeCategory === 'inprogress' ? 'ring-2 ring-secondary/50 bg-secondary/10' : ''
            }`}
          >
            <Target className="w-4 h-4 mx-auto mb-1 text-secondary" />
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-secondary">{inProgressCount}</p>
          </div>
          <div
            onClick={() => handleStatCardClick('completed')}
            className={`journal-card z-depth-1 rounded-lg p-3 text-center interactive-hover cursor-pointer ${
              activeCategory === 'completed' ? 'ring-2 ring-destructive/50 bg-destructive/10' : ''
            }`}
          >
            <Trophy className="w-4 h-4 mx-auto mb-1 text-destructive" />
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-destructive">{tabCounts.completed}</p>
          </div>
        </div>

        {/* Border separator */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

        {/* Dynamic Tab Navigation - Made scrollable */}
        <div className="px-4 py-2">
          <div className="scrollable-tabs">
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg min-w-max">
              {availableTabs.map(tab => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                const colorClass = tab.color === 'green-600' ? 'bg-green-600 text-white' : 
                                 tab.color === 'letdowns' ? 'bg-letdowns text-white' :
                                 tab.color === 'destructive' ? 'bg-destructive text-destructive-foreground' :
                                 tab.color === 'secondary' ? 'bg-secondary text-secondary-foreground' :
                                 'bg-accent text-accent-foreground';
                
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs fast-transition whitespace-nowrap ${
                      isActive
                        ? `${colorClass} shadow-sm z-depth-1`
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span>{tab.label}</span>
                    {!isActive && (
                      <Badge className={`ml-1 text-xs ${
                        tab.color === 'green-600' ? 'bg-green-500/20 text-green-400' :
                        tab.color === 'letdowns' ? 'bg-letdowns/20 text-letdowns' :
                        tab.color === 'destructive' ? 'bg-destructive/20 text-destructive' :
                        tab.color === 'secondary' ? 'bg-secondary/20 text-secondary' :
                        'bg-accent/20 text-accent'
                      }`}>
                        {tab.id === 'completed' ? tabCounts.completed : 
                         tab.id === 'duds' ? tabCounts.duds :
                         tab.id === 'favorite' && activeCategory === 'completed' ? tabCounts.completed :
                         tab.id === 'favorite' ? tabCounts.favorite :
                         tab.id === 'recent' ? tabCounts.recent :
                         tabCounts.wishlist}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Search */}
        <div className="px-4 pt-4 pb-4 border-b border-sidebar-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-input/50 border border-border/50 rounded-md text-sm readable-text focus:outline-none focus:ring-1 focus:ring-primary/30 fast-transition"
            />
            {sidebarSearchQuery && (
              <button
                type="button"
                onClick={() => setSidebarSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded fast-transition"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Game List */}
        <div className="flex-1 px-4 pt-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-muted-foreground uppercase tracking-wide">
              {activeTab === 'recent' ? 'Recent' : 
               activeTab === 'favorite' ? 'Favorites' : 
               activeTab === 'wishlist' ? 'List' : 
               activeTab === 'duds' ? 'Duds' : 'Completed'}
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-muted rounded fast-transition"
              >
                {isCollapsed ? (
                  <Plus className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          
          {!isCollapsed && (
            <div className="space-y-2 pb-4">
              {getFilteredUiGames().map((game) => (
                <SidebarGameCard
                  key={game.id}
                  game={game}
                  onClick={() => handleGameClick(game)}
                  showFavoriteToggle={activeCategory === 'inprogress'}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
              {getFilteredUiGames().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>
                    No{' '}
                    {activeTab === 'wishlist'
                      ? 'list'
                      : activeTab}{' '}
                    games found
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* IGDB Credit */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground text-center">
            Powered by <span className="text-primary readable-accent">IGDB</span>
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Streamlined Header Layout - Removed Journey Card */}
        <div className="bg-card/20 border-b border-border z-depth-2 p-6">
          <div className="flex items-center justify-between">
            {/* Left Side - Dashboard info and enhanced stats row */}
            <div className="flex items-center gap-12">
              <div>
                <h2 className="text-2xl text-primary readable-accent mb-1">Gaming Dashboard</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              {/* Enhanced Quick Stats Row - Clarified weekly context */}
              <div className="flex items-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  <span className="text-muted-foreground">Active Streaks:</span>
                  <span className="text-secondary">{activeStreaks}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  <span className="text-muted-foreground">This Week:</span>
                  <span className="text-accent">{weeklyHours === '—' ? weeklyHours : `${weeklyHours}h`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Games This Week:</span>
                  <span className="text-primary">{gamesPlayedThisWeek}</span>
                </div>
              </div>
            </div>
            
            {/* Right Side - Daily Streak and Total Hours in upper right corner */}
            <div className="flex gap-4">
              <div className="journal-card z-depth-1 rounded-lg p-4 text-center min-w-[100px]">
                <Flame className="w-5 h-5 mx-auto mb-1 text-destructive" />
                <p className="text-xs text-muted-foreground">Daily Streak</p>
                <p className="text-destructive">—</p>
              </div>
              <div className="journal-card z-depth-1 rounded-lg p-4 text-center min-w-[100px]">
                <Star className="w-5 h-5 mx-auto mb-1 text-secondary" />
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="text-secondary">{totalHours}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {libraryLoading && (
              <p className="text-sm text-muted-foreground text-center">Loading your library…</p>
            )}
            {libraryError && (
              <p className="text-sm text-destructive text-center" role="alert">
                {libraryError}
              </p>
            )}
            {/* IGDB Game Browser - Scaled Down */}
            <div className="igdb-search-section rounded-lg p-5 z-depth-2">
              <div className="text-center mb-5">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-primary" />
                  <h3 className="text-xl igdb-search-label">IGDB Game Browser</h3>
                </div>
                <p className="text-sm text-muted-foreground">Search and discover games from the Internet Game Database</p>
              </div>
              
              <div className="max-w-xl mx-auto relative">
                <IgdbSearch
                  endpoint="/api/igdb/search"     // <<— this must match the server
                  payloadMode="json"              // <<— send {query:"..."} JSON
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelect={(g: IgdbGame) => openIgdbPreview(g)}
                />

              </div>


            </div>

            {/* SUBTLE HORIZONTAL BORDER SEPARATOR - Much more gentle */}
            <div className="w-full relative py-4">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent"></div>
              <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent"></div>
            </div>

            {/* Recent Games and Journal Entry - Now with more space for games */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              {/* Recent Games - More prominent now */}
              <div className="lg:col-span-3">
                <h3 className="text-2xl text-primary readable-accent mb-6">Recent Games</h3>
                <div className="space-y-6">
                  {getRecentGames().length === 0 && !libraryLoading && (
                    <p className="text-sm text-muted-foreground">
                      No games in <strong className="text-primary">Recent</strong> yet. Add a title from IGDB — it
                      lands here first. Use the sidebar to move games to your <strong className="text-accent">List</strong>{' '}
                      or <strong className="text-destructive">Favorites</strong> if you like.
                    </p>
                  )}
                  {getRecentGames().map((game, index) => (
                    <MainGameCard 
                      key={game.id} 
                      game={game} 
                      onClick={() => handleGameClick(game)}
                      isLargest={index === 0}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </div>

              {/* Latest Journal Entry */}
              <div className="lg:col-span-2 border-l-2 border-primary/30 pl-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl text-primary readable-accent">Latest Entry</h3>
                  <button
                    onClick={() => {
                      console.log('➕ Opening new entry modal from main page');
                      setShowJournalModal(true);
                    }}
                    className="px-3 py-1 bg-primary/20 text-primary border border-primary/50 rounded-lg hover:bg-primary/30 fast-transition interactive-hover"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    New
                  </button>
                </div>
                
                <div
                  className={`journal-card journal-card-dashboard z-depth-2 rounded-lg p-6 space-y-4 ${
                    latestEntry
                      ? 'cursor-pointer hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary/15 smooth-transition'
                      : ''
                  }`}
                  role={latestEntry ? 'button' : undefined}
                  tabIndex={latestEntry ? 0 : undefined}
                  aria-label={latestEntry ? `Open journal for ${latestEntry.title}` : undefined}
                  onClick={latestEntry ? handleReadFullEntry : undefined}
                  onKeyDown={
                    latestEntry
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleReadFullEntry();
                          }
                        }
                      : undefined
                  }
                >
                  {!latestEntry ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No journal entries yet. Use New after you have at least one game in your library.
                    </p>
                  ) : (
                    <>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-16 flex-shrink-0">
                      {latestEntry.screenshot ? (
                        <img
                          src={latestEntry.screenshot}
                          alt="Session screenshot"
                          className="w-full h-full object-cover rounded border border-primary/20 cursor-pointer hover:ring-2 hover:ring-primary/40 smooth-transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScreenshotClick(latestEntry.screenshot!);
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 rounded border border-primary/20 flex items-center justify-center ${latestEntry.screenshot ? 'hidden' : ''}`}>
                        <Edit3 className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-lg readable-accent text-primary mb-1">
                        {latestEntry.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Gamepad2 className="w-3 h-3" />
                        <span>{latestEntry.game}</span>
                        <span>•</span>
                        <span>{latestEntry.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {latestEntry.areaExplored && (
                      <div className="bg-muted/20 rounded-lg p-2 text-center">
                        <MapPin className="w-4 h-4 mx-auto mb-1 text-secondary" />
                        <p className="text-xs text-muted-foreground">Area</p>
                        <p className="text-xs text-secondary truncate">{latestEntry.areaExplored}</p>
                      </div>
                    )}
                    {latestEntry.bossDefeated && (
                      <div className="bg-muted/20 rounded-lg p-2 text-center">
                        <Sword className="w-4 h-4 mx-auto mb-1 text-destructive" />
                        <p className="text-xs text-muted-foreground">Boss</p>
                        <p className="text-xs text-destructive truncate">{latestEntry.bossDefeated}</p>
                      </div>
                    )}
                    {latestEntry.sessionLength && (
                      <div className="bg-muted/20 rounded-lg p-2 text-center">
                        <Clock className="w-4 h-4 mx-auto mb-1 text-accent" />
                        <p className="text-xs text-muted-foreground">Session</p>
                        <p className="text-xs text-accent">{latestEntry.sessionLength}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className={`journal-text text-sm leading-relaxed smooth-transition ${
                      entryExpanded ? 'expanded-content' : 'collapsed-content'
                    }`}>
                      <p>{latestEntry.content}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {latestEntry.tags.map((tag, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded-full text-xs ${
                            tag === 'Boss Fight' ? 'bg-destructive/20 text-destructive' :
                            tag === 'Story Beat' ? 'bg-primary/20 text-primary' :
                            'bg-accent/20 text-accent'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Mood:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getMoodColor(latestEntry.mood)}`}>
                        {latestEntry.mood}
                      </span>
                    </div>
                  </div>

                  <div
                    className="pt-3 border-t border-border/50 flex items-center justify-start"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      type="button"
                      onClick={() => setEntryExpanded(!entryExpanded)}
                      className="text-sm text-primary hover:text-primary/80 fast-transition flex items-center gap-1"
                    >
                      {entryExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Expand
                        </>
                      )}
                    </button>
                  </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CompletionSurveyModal
        open={completionSurveyOpen && completionDraft != null}
        gameTitle={completionDraft?.game.title ?? ''}
        onCancel={handleCompletionSurveyCancel}
        onConfirm={handleCompletionSurveyConfirm}
      />

      <IgdbGameDetailModal
        game={igdbPreview}
        inLibrary={igdbPreview != null && libraryGames.some((x) => x.igdbId === igdbPreview.id)}
        libraryListPrice={
          igdbPreview
            ? libraryGames.find((x) => x.igdbId === igdbPreview.id)?.listPrice ?? null
            : null
        }
        onClose={() => setIgdbPreview(null)}
        onAddToLibrary={addIgdbGameFromModal}
        onOpenJournal={openJournalFromIgdbPreview}
      />

      {/* Screenshot Modal */}
      {screenshotModal && (
        <div 
          className="screenshot-modal"
          onClick={() => setScreenshotModal(null)}
        >
          <button
            onClick={() => setScreenshotModal(null)}
            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 fast-transition z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={screenshotModal}
            alt="Screenshot"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Journal Entry Modal */}
      <JournalEntryModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        onSave={handleSaveJournalEntryFromDashboard}
        game={modalGame}
      />
    </div>
  );
}