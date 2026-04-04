import React, { useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Star, Trophy, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import JournalEntryModal from './JournalEntryModal';
import JournalSessionEntryModal from './JournalSessionEntryModal';
import type { NewJournalEntryPayload } from '../lib/libraryUi';
import { apiEntryToJournalRow, journalFieldLabels } from '../lib/libraryUi';
import type { JournalMode, LibraryEntry } from '../api/library';
import type { UiGame } from '../lib/libraryUi';
import { useCoverPalette } from '../hooks/useCoverPalette';

interface JournalPageProps {
  game: UiGame;
  onBack: () => void;
  entries: LibraryEntry[];
  onSaveEntry: (payload: NewJournalEntryPayload) => void | Promise<void | 'deferred'>;
  onJournalModeChange?: (mode: JournalMode) => void | Promise<void>;
}

const JournalPage: React.FC<JournalPageProps> = ({
  game,
  onBack,
  entries,
  onSaveEntry,
  onJournalModeChange,
}) => {
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);

  const journalRows = useMemo(
    () => [...entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate)).map(apiEntryToJournalRow),
    [entries]
  );

  const coverPalette = useCoverPalette(game.cover, game.colors.primary, game.colors.secondary);
  const titleShadow = '0 1px 3px rgba(0,0,0,0.92), 0 0 20px rgba(0,0,0,0.4)';
  const fieldLabels = journalFieldLabels(game.journalMode);
  const sessionGame = game.journalMode === 'session';

  const toggleEntryExpansion = (entryId: string) => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card/20 border-b border-border z-depth-2 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
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
                crossOrigin="anonymous"
                className="w-16 h-20 object-cover rounded-lg border border-primary/20 z-depth-1"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=400&fit=crop';
                }}
              />
              <div>
                <h1 className="text-3xl mb-2">
                  <span
                    className="font-semibold"
                    style={{ color: coverPalette.titleColor, textShadow: titleShadow }}
                  >
                    {game.title}
                  </span>
                  <span className="text-muted-foreground font-normal"> Journal</span>
                </h1>
                {onJournalModeChange && game.category !== 'dud' && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Journal</span>
                    <div className="inline-flex rounded-lg border border-border/60 p-0.5 bg-muted/20">
                      <button
                        type="button"
                        onClick={() => void onJournalModeChange('story')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium fast-transition ${
                          !sessionGame
                            ? 'bg-primary/25 text-primary border border-primary/40'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Story / SP
                      </button>
                      <button
                        type="button"
                        onClick={() => void onJournalModeChange('session')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium fast-transition ${
                          sessionGame
                            ? 'bg-accent/25 text-accent border border-accent/40'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Session / MP
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {game.hoursPlayed}h played
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Progress: {game.progress}%
                    {sessionGame && (
                      <span className="text-muted-foreground/80 font-normal"> (optional for logs)</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Last played: {game.lastPlayed}
                  </span>
                </div>
                {game.category === 'completed' && (game.userRating != null || (game.completionMemory && game.completionMemory.trim())) && (
                  <div className="mt-4 p-4 rounded-lg border border-primary/25 bg-primary/5 max-w-2xl">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Completion recap</p>
                    {game.userRating != null && (
                      <p className="text-sm readable-text">
                        Your rating:{' '}
                        <span className="text-primary font-semibold">{game.userRating}/10</span>
                      </p>
                    )}
                    {game.completionMemory?.trim() && (
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">
                        {game.completionMemory}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar — hidden for session-style games unless you already track a % */}
          {!sessionGame && game.progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Story Progress</span>
                <span className="readable-text">{game.progress}%</span>
              </div>
              <div className="w-full rounded-full h-2 overflow-hidden" style={coverPalette.trackStyle}>
                <div
                  className="h-2 rounded-full smooth-transition relative"
                  style={{
                    width: `${game.progress}%`,
                    background: coverPalette.progressGradient,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      animation: 'shimmer 2s infinite',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          {sessionGame && (
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Session log mode: new entries <span className="text-foreground">won’t update</span> story completion
              from the journal. Use title, mood, notes, and the three optional fields for how you played.
            </p>
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

          {journalRows.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border/60 rounded-lg">
              No entries yet — use New Entry to log a session.
            </p>
          )}

          {journalRows.map((entry, index) => {
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
                      <span>{game.title}</span>
                      <span>•</span>
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {(isLatest || isExpanded) && (entry.rankBefore || entry.rankAfter) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {entry.rankBefore ? (
                      <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Previous rank</div>
                        <div className="text-sm text-secondary">{entry.rankBefore}</div>
                      </div>
                    ) : null}
                    {entry.rankAfter ? (
                      <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Current rank</div>
                        <div className="text-sm text-accent">{entry.rankAfter}</div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Structured fields (labels follow current game journal mode) */}
                {(isLatest || isExpanded) &&
                  (entry.areaExplored || entry.bossDefeated || entry.itemFound) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    {entry.areaExplored && (
                      <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">{fieldLabels.area}</div>
                        <div className="text-sm text-secondary">{entry.areaExplored}</div>
                      </div>
                    )}
                    {entry.bossDefeated && (
                      <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">{fieldLabels.boss}</div>
                        <div className="text-sm text-destructive">{entry.bossDefeated}</div>
                      </div>
                    )}
                    {entry.itemFound && (
                      <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">{fieldLabels.item}</div>
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

      {game.journalMode === 'session' ? (
        <JournalSessionEntryModal
          isOpen={showJournalModal}
          onClose={() => {
            console.log('❌ Closing session journal modal from journal page');
            setShowJournalModal(false);
          }}
          onSave={onSaveEntry}
          game={game}
        />
      ) : (
        <JournalEntryModal
          isOpen={showJournalModal}
          onClose={() => {
            console.log('❌ Closing journal modal from journal page');
            setShowJournalModal(false);
          }}
          onSave={onSaveEntry}
          game={game}
        />
      )}
    </div>
  );
};

export default JournalPage;