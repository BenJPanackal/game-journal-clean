import { useEffect } from 'react';
import { X, Calendar, Clock, Trophy } from 'lucide-react';
import type { JournalRowEntry } from '../lib/libraryUi';
import { journalFieldLabels } from '../lib/libraryUi';
import type { UiGame } from '../lib/libraryUi';

type Props = {
  open: boolean;
  entry: JournalRowEntry | null;
  game: UiGame;
  onClose: () => void;
  onScreenshotClick?: (url: string) => void;
};

function moodClass(mood: string) {
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
}

export default function JournalEntryViewModal({
  open,
  entry,
  game,
  onClose,
  onScreenshotClick,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !entry) return null;

  const fieldLabels = journalFieldLabels(game.journalMode);

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col bg-background/97 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="journal-entry-view-title"
    >
      <header className="flex-shrink-0 border-b border-border/60 bg-card/30 z-depth-2">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-start gap-4">
          <img
            src={game.cover}
            alt=""
            className="w-10 h-14 object-cover rounded border border-primary/20 flex-shrink-0 hidden sm:block"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate mb-1">{game.title}</p>
            <h2
              id="journal-entry-view-title"
              className="text-xl sm:text-2xl readable-accent font-semibold leading-snug"
              style={{ color: game.colors.primary }}
            >
              {entry.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(entry.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {entry.sessionLength ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {entry.sessionLength}
                </span>
              ) : null}
              <span className={`px-2 py-0.5 rounded-full text-xs ${moodClass(entry.mood)}`}>
                {entry.mood}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted/60 fast-transition flex-shrink-0"
            aria-label="Close entry"
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {entry.screenshot ? (
            <button
              type="button"
              onClick={() => onScreenshotClick?.(entry.screenshot!)}
              className="block w-full max-w-md mx-auto rounded-lg overflow-hidden border border-primary/25 hover:ring-2 hover:ring-primary/40 fast-transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <img
                src={entry.screenshot}
                alt="Session screenshot — click to enlarge"
                className="w-full h-auto object-cover"
              />
            </button>
          ) : null}

          {(entry.rankBefore || entry.rankAfter) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {entry.rankBefore ? (
                <div className="bg-muted/20 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                    Previous rank
                  </div>
                  <div className="text-sm text-secondary">{entry.rankBefore}</div>
                </div>
              ) : null}
              {entry.rankAfter ? (
                <div className="bg-muted/20 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                    Current rank
                  </div>
                  <div className="text-sm text-accent">{entry.rankAfter}</div>
                </div>
              ) : null}
            </div>
          )}

          {(entry.areaExplored || entry.bossDefeated || entry.itemFound) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {entry.areaExplored ? (
                <div className="bg-muted/20 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{fieldLabels.area}</div>
                  <div className="text-sm text-secondary">{entry.areaExplored}</div>
                </div>
              ) : null}
              {entry.bossDefeated ? (
                <div className="bg-muted/20 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{fieldLabels.boss}</div>
                  <div className="text-sm text-destructive">{entry.bossDefeated}</div>
                </div>
              ) : null}
              {entry.itemFound ? (
                <div className="bg-muted/20 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{fieldLabels.item}</div>
                  <div className="text-sm text-accent">{entry.itemFound}</div>
                </div>
              ) : null}
            </div>
          )}

          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded-full text-xs ${
                    tag === 'Boss Fight'
                      ? 'bg-destructive/20 text-destructive'
                      : tag === 'Story Beat'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-accent/20 text-accent'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {entry.content.trim() ? (
            <div className="journal-card rounded-xl p-5 sm:p-6 border border-border/50">
              <p className="text-sm uppercase tracking-wide text-muted-foreground mb-3">Notes</p>
              <div className="journal-text readable-text text-base leading-relaxed whitespace-pre-wrap">
                {entry.content}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No notes for this entry.</p>
          )}

          {entry.achievements.length > 0 && (
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Achievements unlocked</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {entry.achievements.map((achievement, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-destructive/20 text-destructive text-xs rounded-full"
                  >
                    {achievement}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
