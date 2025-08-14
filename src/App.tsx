import React, { useState, useEffect } from 'react';
import { Search, Heart, Clock, Bookmark, Star, Gamepad2, Zap, Trophy, Target, Plus, Minus, X, Edit3, Calendar, Image, MapPin, Sword, Flame, TrendingUp, Database, ThumbsDown, ChevronDown, ChevronUp } from 'lucide-react';
import JournalPage from './components/JournalPage';
import JournalEntryModal from './components/JournalEntryModal';
import IgdbSearch from "./components/IgdbSearch";
import type { IgdbGame } from "./components/IgdbSearch";



// Mock data with realistic game color schemes, streak information, and completed games
const mockGames = [
  {
    id: 1,
    title: "Cyberpunk 2077",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    cover: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=400&fit=crop",
    lastPlayed: "2 hours ago",
    progress: 78,
    hoursPlayed: 45,
    category: "recent",
    releaseYear: 2020,
    streak: 5,
    colors: {
      primary: "#00FFFF",
      secondary: "#FF0080",
      accent: "#FFFF00"
    }
  },
  {
    id: 2,
    title: "The Witcher 3",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=600&fit=crop",
    cover: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=400&fit=crop",
    lastPlayed: "Yesterday",
    progress: 92,
    hoursPlayed: 127,
    category: "favorite",
    releaseYear: 2015,
    streak: 3,
    colors: {
      primary: "#8B0000",
      secondary: "#CD853F",
      accent: "#2F4F4F"
    }
  },
  {
    id: 3,
    title: "Elden Ring",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=400&fit=crop",
    lastPlayed: "3 days ago",
    progress: 45,
    hoursPlayed: 67,
    category: "recent",
    releaseYear: 2022,
    streak: 0,
    colors: {
      primary: "#DAA520",
      secondary: "#8B4513",
      accent: "#696969"
    }
  },
  {
    id: 4,
    title: "Starfield",
    image: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400&h=600&fit=crop",
    cover: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=300&h=400&fit=crop",
    lastPlayed: "Never",
    progress: 0,
    hoursPlayed: 0,
    category: "wishlist",
    releaseYear: 2023,
    streak: 0,
    colors: {
      primary: "#4169E1",
      secondary: "#1E90FF",
      accent: "#87CEEB"
    }
  },
  {
    id: 5,
    title: "Baldur's Gate 3",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=400&fit=crop",
    lastPlayed: "1 week ago",
    progress: 67,
    hoursPlayed: 89,
    category: "favorite",
    releaseYear: 2023,
    streak: 2,
    colors: {
      primary: "#800080",
      secondary: "#9370DB",
      accent: "#DDA0DD"
    }
  }
];

// Mock completed games
const mockCompletedGames = [
  {
    id: 6,
    title: "God of War",
    image: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=400&h=600&fit=crop",
    cover: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=300&h=400&fit=crop",
    lastPlayed: "2 months ago",
    progress: 100,
    hoursPlayed: 85,
    category: "completed",
    releaseYear: 2018,
    completedDate: "2024-11-15",
    colors: {
      primary: "#C41E3A",
      secondary: "#8B0000",
      accent: "#FFD700"
    }
  },
  {
    id: 7,
    title: "Horizon Zero Dawn",
    image: "https://images.unsplash.com/photo-1580234820958-493f3681d1e4?w=400&h=600&fit=crop",
    cover: "https://images.unsplash.com/photo-1580234820958-493f3681d1e4?w=300&h=400&fit=crop",
    lastPlayed: "3 months ago",
    progress: 100,
    hoursPlayed: 72,
    category: "completed",
    releaseYear: 2017,
    completedDate: "2024-10-22",
    colors: {
      primary: "#FF4500",
      secondary: "#32CD32",
      accent: "#87CEEB"
    }
  },
  {
    id: 8,
    title: "Red Dead Redemption 2",
    image: "https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400&h=600&fit=crop",
    cover: "https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=300&h=400&fit=crop",
    lastPlayed: "6 months ago",
    progress: 100,
    hoursPlayed: 156,
    category: "completed",
    releaseYear: 2018,
    completedDate: "2024-07-08",
    colors: {
      primary: "#8B4513",
      secondary: "#DAA520",
      accent: "#CD853F"
    }
  }
];

const mockJournalEntry = {
  title: "Epic Boss Fight in Cyberpunk 2077",
  content: "Just defeated Adam Smasher after what felt like hours of preparation. The build-up to this fight was incredible - all the choices I made throughout the game led to this moment. Used my netrunner build with legendary quickhacks and it was devastating.",
  date: "2 hours ago",
  game: "Cyberpunk 2077",
  sessionLength: "4h 30m",
  areaExplored: "Arasaka Tower",
  bossDefeated: "Adam Smasher",
  itemFound: "Legendary Quickhack",
  mood: "excited",
  tags: ["Boss Fight", "Story Beat", "Epic Moment"],
  screenshot: "https://images.unsplash.com/photo-1580234820958-493f3681d1e4?w=400&h=300&fit=crop"
};

const SidebarGameCard = ({ game, onClick }: { game: any; onClick: () => void }) => (
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
          <div className="flex items-start justify-between mb-1">
            <h4 className="text-xs truncate readable-accent" style={{ color: game.colors.primary }}>
              {game.title}
            </h4>
            <div className="flex items-center gap-1">
              {game.category === 'favorite' && (
                <Heart className="w-3 h-3 text-destructive fill-destructive flex-shrink-0" />
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
        </div>
      </div>
    </div>
  </div>
);

const MainGameCard = ({ game, onClick, isLargest = false }: { game: any; onClick: () => void; isLargest?: boolean }) => {
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
      className={`journal-card hover:border-primary/50 smooth-transition interactive-hover ${zDepth} rounded-lg overflow-hidden ${cardSize} ${isLargest ? 'ring-1 ring-primary/30 vhs-glow' : ''}`}
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
              </div>
            </div>
            
            {game.category === 'favorite' && (
              <Heart className="w-6 h-6 text-destructive fill-destructive flex-shrink-0 ml-4" />
            )}
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
          
          {game.progress === 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Bookmark className="w-5 h-5 text-accent" />
              <span className="text-accent">On Wishlist</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SearchSuggestions = ({ query, games, onSelect }: { query: string; games: any[]; onSelect: (game: any) => void }) => {
  const allGames = [...games, ...mockCompletedGames];
  const filteredGames = allGames.filter(game => 
    game.title.toLowerCase().includes(query.toLowerCase()) ||
    game.releaseYear.toString().includes(query)
  ).slice(0, 5);

  if (!query || filteredGames.length === 0) return null;

  console.log('🔍 Search suggestions filtered:', filteredGames.length, 'results for:', query);

  return (
    <div className="absolute top-full left-0 right-0 mt-2 search-suggestions rounded-lg overflow-hidden z-depth-4">
      {filteredGames.map(game => (
        <div
          key={game.id}
          onClick={() => {
            console.log('🎯 Search suggestion selected:', game.title);
            onSelect(game);
          }}
          className="search-suggestion-item cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <img
              src={game.cover}
              alt={game.title}
              className="w-10 h-12 object-cover rounded border border-primary/20"
            />
            <div className="flex-1">
              <h4 className="readable-text">{game.title}</h4>
              <p className="text-xs text-muted-foreground">{game.releaseYear} • {game.category}</p>
            </div>
            {game.progress === 100 && (
              <Trophy className="w-4 h-4 text-green-400" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${className}`}>
    {children}
  </span>
);
function mapIgdbToCard(g: IgdbGame) {
  return {
    id: g.id,
    title: g.name,
    image: g.coverUrl || "",
    cover: g.coverUrl || "",
    lastPlayed: "Never",
    progress: 0,
    hoursPlayed: 0,
    category: "wishlist",       // you can change this default later
    releaseYear: g.year ?? undefined,
    streak: 0,
    colors: {
      primary: "#6366F1",
      secondary: "#10B981",
      accent: "#F59E0B",
    },
  };
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState<'inprogress' | 'completed'>('inprogress');
  const [activeTab, setActiveTab] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalEntries, setJournalEntries] = useState([mockJournalEntry]);
  const [entryExpanded, setEntryExpanded] = useState(false);
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);

  const getTabCounts = () => ({
    recent: mockGames.filter(g => g.category === 'recent').length,
    favorite: mockGames.filter(g => g.category === 'favorite').length,
    wishlist: mockGames.filter(g => g.category === 'wishlist').length,
    completed: mockCompletedGames.length,
    duds: 1 // Mock data - renamed from letdowns
  });

  const getFilteredGames = () => {
    if (activeCategory === 'completed') {
      if (activeTab === 'favorite') {
        const favCompletedGames = mockCompletedGames.filter(g => g.category === 'completed');
        return favCompletedGames.filter(game => 
          game.title.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
        );
      } else if (activeTab === 'completed') {
        return mockCompletedGames.filter(game => 
          game.title.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
        );
      } else if (activeTab === 'duds') {
        // Mock dud games
        return [mockCompletedGames[2]].filter(game => 
          game.title.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
        );
      }
    } else {
      const filtered = mockGames.filter(game => 
        game.category === activeTab && 
        game.title.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
      );
      return filtered;
    }
    return [];
  };

  const getAvailableTabs = () => {
    if (activeCategory === 'completed') {
      return [
        { id: 'completed', label: 'Done', icon: Trophy, color: 'green-600' },
        { id: 'favorite', label: 'Favs', icon: Heart, color: 'destructive' },
        { id: 'duds', label: 'Duds', icon: ThumbsDown, color: 'letdowns' }
      ];
    } else {
      return [
        { id: 'recent', label: 'Recent', icon: Clock, color: 'secondary' },
        { id: 'favorite', label: 'Favs', icon: Heart, color: 'destructive' },
        { id: 'wishlist', label: 'List', icon: Bookmark, color: 'accent' }
      ];
    }
  };

  const getRecentGames = () => {
    return mockGames.filter(g => g.category === 'recent').slice(0, 3);
  };

  const handleGameClick = (game: any) => {
    console.log('🎮 Game selected:', game.title);
    setSelectedGame(game);
  };

  const handleBackToMain = () => {
    console.log('⬅️ Returning to main page');
    setSelectedGame(null);
  };

  const handleSearchSelect = (game: any) => {
    console.log('🎯 Search result selected:', game.title);
    setSearchQuery(game.title);
    setShowSearchSuggestions(false);
    handleGameClick(game);
  };

  const handleSaveJournalEntry = (entry: any) => {
    console.log('💾 Journal entry saved to main app:', entry);
    setJournalEntries(prev => [entry, ...prev]);
  };

  const handleReadFullEntry = () => {
    console.log('📖 Read full entry clicked - navigating to game journal');
    const entry = journalEntries[0];
    const allGames = [...mockGames, ...mockCompletedGames];
    const game = allGames.find(g => g.title === entry.game);
    if (game) {
      handleGameClick(game);
    } else {
      console.warn('⚠️ Game not found for entry:', entry.game);
    }
  };

  const handleStatCardClick = (statType: string) => {
    console.log('📊 Stat card clicked:', statType);
    if (statType === 'completed') {
      setActiveCategory('completed');
      setActiveTab('completed');
    } else {
      setActiveCategory('inprogress');
      setActiveTab('recent');
    }
  };

  const handleScreenshotClick = (screenshot: string) => {
    console.log('🖼️ Opening screenshot modal:', screenshot);
    setScreenshotModal(screenshot);
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'excited': return 'bg-secondary/20 text-secondary';
      case 'satisfied': return 'bg-accent/20 text-accent';
      case 'neutral': return 'bg-neutral/20 text-neutral';
      case 'emotional': return 'bg-primary/20 text-primary';
      case 'frustrated': return 'bg-destructive/20 text-destructive';
      default: return 'bg-accent/20 text-accent';
    }
  };

  // Update active tab when category changes
  useEffect(() => {
    if (activeCategory === 'completed') {
      setActiveTab('completed');
    } else {
      setActiveTab('recent');
    }
  }, [activeCategory]);

  useEffect(() => {
    console.log('🔍 Search query changed:', searchQuery);
    const timer = setTimeout(() => {
      setShowSearchSuggestions(searchQuery.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    console.log('🏷️ Tab changed to:', activeTab, 'Category:', activeCategory);
  }, [activeTab, activeCategory]);

  if (selectedGame) {
    return <JournalPage game={selectedGame} onBack={handleBackToMain} />;
  }

  const tabCounts = getTabCounts();
  const totalHours = mockGames.reduce((sum, game) => sum + game.hoursPlayed, 0);
  const weeklyHours = 23; // Self-reported weekly hours
  const gamesPlayedThisWeek = 4; // Mock data - games played this week
  const latestEntry = journalEntries[0];
  const activeStreaks = mockGames.filter(g => g.streak > 0).length;
  const availableTabs = getAvailableTabs();

  console.log('🏠 Main app rendered, total games:', mockGames.length, 'total hours:', totalHours);

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
            <p className="text-secondary">8</p>
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
                onClick={() => {
                  console.log('❌ Clearing sidebar search');
                  setSidebarSearchQuery('');
                }}
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
               activeTab === 'wishlist' ? 'Wishlist' : 
               activeTab === 'duds' ? 'Duds' : 'Completed'}
            </h3>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  console.log('📋 Toggle collapsed state:', !isCollapsed);
                  setIsCollapsed(!isCollapsed);
                }}
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
              {getFilteredGames().map(game => (
                <SidebarGameCard key={game.id} game={game} onClick={() => handleGameClick(game)} />
              ))}
              {getFilteredGames().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No {activeTab} games found</p>
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
                  <span className="text-accent">{weeklyHours}h</span>
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
                <p className="text-destructive">🔥 7</p>
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
            {/* IGDB Game Browser - Scaled Down */}
            <div className="igdb-search-section rounded-lg p-5 z-depth-2">
              <div className="text-center mb-5">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-primary" />
                  <h3 className="text-xl igdb-search-label">IGDB Game Browser</h3>
                </div>
                <p className="text-sm text-muted-foreground">Search and discover games from the Internet Game Database</p>
              </div>
              
              <div className="max-w-xl mx-auto">
                <IgdbSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelect={(g) => {
                    // put selected game into your normal flow
                    setSearchQuery(g.name);
                    handleGameClick(mapIgdbToCard(g));
                  }}
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
                  {getRecentGames().map((game, index) => (
                    <MainGameCard 
                      key={game.id} 
                      game={game} 
                      onClick={() => handleGameClick(game)}
                      isLargest={index === 0}
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
                
                <div className="journal-card z-depth-3 vhs-glow rounded-lg p-6 space-y-4">
                  {/* Entry Header with Screenshot */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-16 flex-shrink-0">
                      {latestEntry.screenshot ? (
                        <img
                          src={latestEntry.screenshot}
                          alt="Session screenshot"
                          className="w-full h-full object-cover rounded border border-primary/20 cursor-pointer hover:ring-2 hover:ring-primary/40 smooth-transition"
                          onClick={() => handleScreenshotClick(latestEntry.screenshot!)}
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

                  {/* Quick Stats */}
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

                  {/* Content Preview with Inline Expansion */}
                  <div className="space-y-3">
                    <div className={`journal-text text-sm leading-relaxed smooth-transition ${
                      entryExpanded ? 'expanded-content' : 'collapsed-content'
                    }`}>
                      <p>{latestEntry.content}</p>
                    </div>

                    {/* Tags */}
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

                    {/* Mood */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Mood:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getMoodColor(latestEntry.mood)}`}>
                        {latestEntry.mood}
                      </span>
                    </div>
                  </div>

                  {/* Inline Expand/Navigate */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <button 
                      onClick={() => {
                        console.log('🔽 Toggling entry expansion');
                        setEntryExpanded(!entryExpanded);
                      }}
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
                    <button 
                      onClick={handleReadFullEntry}
                      className="text-sm text-primary hover:text-primary/80 fast-transition"
                    >
                      View in Journal →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
        onClose={() => {
          console.log('❌ Closing journal modal from main page');
          setShowJournalModal(false);
        }}
        onSave={handleSaveJournalEntry}
        game={getRecentGames()[0] || mockGames[0]}
      />
    </div>
  );
}