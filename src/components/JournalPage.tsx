import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, Star, Trophy, Heart, Bookmark, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import JournalEntryModal from './JournalEntryModal';

interface JournalPageProps {
  game: any;
  onBack: () => void;
}

const JournalPage: React.FC<JournalPageProps> = ({ game, onBack }) => {
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);
  
  const [journalEntries, setJournalEntries] = useState([
    {
      id: 1,
      date: "2024-01-15",
      title: "Epic Boss Fight in Cyberpunk 2077",
      content: "Just defeated Adam Smasher after what felt like hours of preparation. The build-up to this fight was incredible - all the choices I made throughout the game led to this moment. Used my netrunner build with legendary quickhacks and it was devastating. The visual effects during the final sequence were absolutely stunning. This game continues to surprise me with its depth and storytelling. The way the story culminated in this final confrontation was masterfully done. Every side quest, every character interaction, every upgrade choice led to this moment where I felt truly prepared and invested in the outcome.",
      sessionLength: "4h 30m",
      mood: "excited",
      areaExplored: "Arasaka Tower",
      bossDefeated: "Adam Smasher", 
      itemFound: "Legendary Quickhack",
      tags: ["Boss Fight", "Story Beat", "Epic Moment"],
      achievements: ["Mind Over Matter", "Legend of Night City"],
      screenshot: "https://images.unsplash.com/photo-1580234820958-493f3681d1e4?w=400&h=300&fit=crop"
    },
    {
      id: 2,
      date: "2024-01-14", 
      title: "The Heist Goes Wrong",
      content: "Holy shit. I was not prepared for that emotional gut punch. Jackie... man, I'm actually tearing up thinking about it. The writing in this game is phenomenal. Keanu Reeves as Johnny Silverhand is perfect casting - his presence is both menacing and magnetic. The glitching effects when he appears are so well done. I need to process what just happened before continuing.",
      sessionLength: "4h 12m",
      mood: "emotional",
      achievements: ["Point of No Return", "Silverhand's Shadow"]
    },
    {
      id: 3,
      date: "2024-01-13",
      title: "Side Quests and Character Building",
      content: "Taking a break from the main story to explore the world more. Did some side gigs with Regina Jones - the variety is impressive. Found some amazing gear and finally got my hands on a decent katana. The combat is starting to click, especially the quickhacks. Breach protocol mini-game is addictive. Night City feels more like home now.",
      sessionLength: "5h 20m", 
      mood: "satisfied",
      achievements: ["Hack the System", "Blade Master"]
    }
  ]);

  const progressGradient = game.progress > 0 ? 
    `linear-gradient(90deg, ${game.colors.primary}, ${game.colors.secondary})` : 
    'none';

  const handleSaveJournalEntry = (entry: any) => {
    console.log('💾 New journal entry saved to game page:', entry);
    setJournalEntries(prev => [entry, ...prev]);
  };

  const toggleEntryExpansion = (entryId: number) => {
    console.log('📖 Toggling expansion for entry:', entryId);
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
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

  console.log('🎮 Journal page loaded for:', game.title);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card/20 border-b border-border z-depth-2 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => {
                console.log('⬅️ Going back to main page');
                onBack();
              }}
              className="p-2 hover:bg-muted rounded-lg fast-transition"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-4">
              <img
                src={game.cover}
                alt={game.title}
                className="w-16 h-20 object-cover rounded-lg border border-primary/20 z-depth-1"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=400&fit=crop';
                }}
              />
              <div>
                <h1 className="text-3xl readable-accent mb-2" style={{ color: game.colors.primary }}>
                  {game.title} Journal
                </h1>
                <div className="flex items-center gap-6 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {game.hoursPlayed}h played
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Progress: {game.progress}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Last played: {game.lastPlayed}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {game.progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Story Progress</span>
                <span className="readable-text">{game.progress}%</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 rounded-full smooth-transition relative"
                  style={{
                    width: `${game.progress}%`,
                    background: progressGradient,
                    boxShadow: `0 0 6px ${game.colors.primary}30`
                  }}
                >
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${game.colors.secondary}20, transparent)`,
                      animation: 'shimmer 2s infinite'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Journal Entries */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl text-primary readable-accent">Journal Entries</h2>
            <button 
              onClick={() => {
                console.log('➕ Opening new entry modal from journal page');
                setShowJournalModal(true);
              }}
              className="px-4 py-2 bg-primary/20 border border-primary/50 rounded-lg text-primary hover:bg-primary/30 fast-transition interactive-hover"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              New Entry
            </button>
          </div>

          {journalEntries.map((entry, index) => {
            const isExpanded = expandedEntries.has(entry.id);
            const isLatest = index === 0;
            
            return (
              <div key={entry.id} className={`journal-card z-depth-1 rounded-lg p-6 ${isLatest ? 'ring-2 ring-primary/40 z-depth-3 vhs-glow' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl mb-2 readable-accent" style={{ color: game.colors.primary }}>
                      {entry.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {entry.sessionLength}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getMoodColor(entry.mood)}`}>
                        {entry.mood}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isLatest && (
                      <div className="flex items-center gap-1 text-xs text-primary bg-primary/20 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 fill-primary" />
                        Latest
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Entry Header with Screenshot or Placeholder */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-16 flex-shrink-0">
                    {entry.screenshot ? (
                      <img
                        src={entry.screenshot}
                        alt="Session screenshot"
                        className="w-full h-full object-cover rounded border border-primary/20 cursor-pointer hover:ring-2 hover:ring-primary/40 smooth-transition"
                        onClick={() => handleScreenshotClick(entry.screenshot!)}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 rounded border border-primary/20 flex items-center justify-center ${entry.screenshot ? 'hidden' : ''}`}>
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-lg readable-accent text-primary mb-1">
                      {entry.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>{entry.game || game.title}</span>
                      <span>•</span>
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced display for latest entry */}
                {isLatest && entry.areaExplored && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {entry.areaExplored && (
                      <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Area Explored</div>
                        <div className="text-sm text-secondary">{entry.areaExplored}</div>
                      </div>
                    )}
                    {entry.bossDefeated && (
                      <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Boss Defeated</div>
                        <div className="text-sm text-destructive">{entry.bossDefeated}</div>
                      </div>
                    )}
                    {entry.itemFound && (
                      <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Item Found</div>
                        <div className="text-sm text-accent">{entry.itemFound}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Enhanced tags display for latest entry */}
                {isLatest && entry.tags && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
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
                  </div>
                )}
                
                {/* Content with Inline Expansion */}
                <div className={`journal-text mb-4 smooth-transition ${
                  isExpanded ? 'expanded-content' : 'collapsed-content'
                }`}>
                  <p>{entry.content}</p>
                </div>

                {entry.achievements && entry.achievements.length > 0 && (
                  <div className="border-t border-border/50 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-muted-foreground">Achievements Unlocked</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {entry.achievements.map((achievement, i) => (
                        <span key={i} className="px-2 py-1 bg-destructive/20 text-destructive text-xs rounded-full">
                          {achievement}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline Expand/Collapse Button */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <button 
                    onClick={() => toggleEntryExpansion(entry.id)}
                    className="text-sm text-primary hover:text-primary/80 fast-transition flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Collapse Entry
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Expand Entry
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
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
          console.log('❌ Closing journal modal from journal page');
          setShowJournalModal(false);
        }}
        onSave={handleSaveJournalEntry}
        game={game}
      />
    </div>
  );
};

export default JournalPage;