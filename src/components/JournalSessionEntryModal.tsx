import React, { useEffect, useState } from 'react';
import { X, Save, Image, FileText, Clock, Gamepad2, TrendingDown, TrendingUp } from 'lucide-react';
import type { NewJournalEntryPayload } from '../lib/libraryUi';
import type { UiGame } from '../lib/libraryUi';

interface JournalSessionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: NewJournalEntryPayload) => void | Promise<void | 'deferred'>;
  game: UiGame | null;
}

const SESSION_TAGS = [
  'Carry',
  'Stomped',
  'Fun',
  'Ranked',
  'Casual',
  'Duo queue',
  'Solo queue',
  'Full stack',
  'Close loss',
  'Comeback',
  'Clutch win',
  'Rough session',
  'Toxic lobby',
  'Event night',
  'Learned something',
  'Tilted',
];

const moods = [
  { id: 'excited', label: 'Excited', color: 'bg-secondary/20 text-secondary' },
  { id: 'satisfied', label: 'Satisfied', color: 'bg-accent/20 text-accent' },
  { id: 'neutral', label: 'Neutral', color: 'bg-neutral/20 text-neutral' },
  { id: 'emotional', label: 'Emotional', color: 'bg-primary/20 text-primary' },
  { id: 'frustrated', label: 'Frustrated', color: 'bg-destructive/20 text-destructive' },
];

/**
 * Separate journal flow for games added as multiplayer / live (session log).
 * No story progress or completion survey — same API payload shape, different layout.
 */
const JournalSessionEntryModal: React.FC<JournalSessionEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  game,
}) => {
  const [entryData, setEntryData] = useState({
    title: '',
    rankBefore: '',
    rankAfter: '',
    screenshot: '',
    notes: '',
    mood: 'neutral',
    sessionLength: '',
    tags: [] as string[],
  });
  const [activeTag, setActiveTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !game) return;
    setEntryData((prev) => ({ ...prev }));
  }, [isOpen, game?.id]);

  const handleSave = async () => {
    if (!game) return;
    if (!entryData.title.trim()) return;

    const payload: NewJournalEntryPayload = {
      title: entryData.title.trim(),
      entryDate: new Date().toISOString(),
      areaExplored: null,
      bossDefeated: null,
      itemFound: null,
      rankBefore: entryData.rankBefore.trim() || null,
      rankAfter: entryData.rankAfter.trim() || null,
      screenshotUrl: entryData.screenshot.trim() || null,
      notes: entryData.notes.trim() || null,
      mood: entryData.mood,
      sessionLength: entryData.sessionLength.trim() || null,
      progressAtEntry: null,
      tags: entryData.tags,
    };

    setSaving(true);
    try {
      const result = await onSave(payload);
      if (result === 'deferred') {
        onClose();
        return;
      }
      setEntryData({
        title: '',
        rankBefore: '',
        rankAfter: '',
        screenshot: '',
        notes: '',
        mood: 'neutral',
        sessionLength: '',
        tags: [],
      });
      onClose();
    } catch (e) {
      console.error('Save session entry failed', e);
    } finally {
      setSaving(false);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !entryData.tags.includes(tag)) {
      setEntryData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setActiveTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setEntryData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tagToRemove) }));
  };

  if (!isOpen) return null;

  if (!game) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative m-4 journal-card rounded-lg p-6 max-w-md border border-accent/30">
          <p className="text-sm text-muted-foreground">Add a game from IGDB or your library first.</p>
          <button type="button" onClick={onClose} className="mt-4 text-accent text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4 journal-card vhs-glow z-depth-4 rounded-lg border-2 border-accent/35 shadow-[0_0_40px_-12px_rgba(245,158,11,0.35)]">
        <div className="sticky top-0 bg-card/90 backdrop-blur-lg border-b border-accent/25 p-6 scanlines">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-14 w-12 flex-shrink-0 items-center justify-center rounded border border-accent/40 bg-accent/10">
                <Gamepad2 className="h-7 w-7 text-accent" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">Session log</p>
                <h2 className="text-2xl readable-accent truncate text-foreground">Log today&apos;s play</h2>
                <p className="text-muted-foreground truncate">{game.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Built for multiplayer and live games — ranks, mood, tags, and notes. No story progress bar
                  here.
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-muted/50 rounded-lg fast-transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm readable-text">
              <FileText className="w-4 h-4 inline mr-2" />
              Session title *
            </label>
            <input
              type="text"
              value={entryData.title}
              onChange={(e) => setEntryData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ranked night, ARAM with friends, event queue…"
              className="w-full px-4 py-3 bg-input/50 border border-accent/20 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent/40 smooth-transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm readable-text">
                <Clock className="w-4 h-4 inline mr-2" />
                Session length
              </label>
              <input
                type="text"
                value={entryData.sessionLength}
                onChange={(e) => setEntryData((prev) => ({ ...prev, sessionLength: e.target.value }))}
                placeholder="2h 30m"
                className="w-full px-4 py-3 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm readable-text">Mood</label>
              <div className="flex flex-wrap gap-1">
                {moods.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => setEntryData((prev) => ({ ...prev, mood: mood.id }))}
                    className={`px-2 py-1 rounded-full text-xs fast-transition ${
                      entryData.mood === mood.id ? mood.color : 'bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    {mood.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-accent/90">Rank (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm readable-text">
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  Previous rank
                </label>
                <input
                  type="text"
                  value={entryData.rankBefore}
                  onChange={(e) => setEntryData((prev) => ({ ...prev, rankBefore: e.target.value }))}
                  placeholder="Gold II, Diamond 3…"
                  className="w-full px-3 py-2 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm readable-text">
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Current rank
                </label>
                <input
                  type="text"
                  value={entryData.rankAfter}
                  onChange={(e) => setEntryData((prev) => ({ ...prev, rankAfter: e.target.value }))}
                  placeholder="Plat IV, Immortal…"
                  className="w-full px-3 py-2 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm readable-text">
              <Image className="w-4 h-4 inline mr-2" />
              Screenshot URL (optional)
            </label>
            <input
              type="url"
              value={entryData.screenshot}
              onChange={(e) => setEntryData((prev) => ({ ...prev, screenshot: e.target.value }))}
              placeholder="https://…"
              className="w-full px-4 py-3 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm readable-text">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {entryData.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-accent/20 text-accent rounded-full text-xs flex items-center gap-1"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-accent/80">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {SESSION_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="px-2 py-1 bg-muted/20 text-muted-foreground rounded-full text-xs hover:bg-accent/15 hover:text-accent fast-transition"
                >
                  + {tag}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={activeTag}
              onChange={(e) => setActiveTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag(activeTag)}
              placeholder="Add custom tag…"
              className="w-full px-4 py-2 bg-input/50 border border-border/50 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm readable-text">
              <FileText className="w-4 h-4 inline mr-2" />
              Notes
            </label>
            <textarea
              value={entryData.notes}
              onChange={(e) => setEntryData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="What stood out? Tilted, fun with friends, what you’d do differently next time…"
              rows={5}
              className="w-full px-4 py-3 bg-input/50 border border-accent/15 rounded-lg readable-text focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground fast-transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !entryData.title.trim()}
              className="px-6 py-2.5 min-h-11 rounded-xl bg-accent/20 text-accent border border-accent/50 hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed fast-transition font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <Save className="w-4 h-4 inline mr-2" />
              {saving ? 'Saving…' : 'Save session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalSessionEntryModal;
