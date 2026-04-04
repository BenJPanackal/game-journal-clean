import { useState } from 'react';
import { X, Trophy } from 'lucide-react';

type Props = {
  open: boolean;
  gameTitle: string;
  onCancel: () => void;
  onConfirm: (data: { userRating: number; completionMemory: string | null }) => void | Promise<void>;
};

export default function CompletionSurveyModal({ open, gameTitle, onCancel, onConfirm }: Props) {
  const [rating, setRating] = useState(8);
  const [memory, setMemory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const r = Math.round(Number(rating));
    if (!Number.isFinite(r) || r < 1 || r > 10) return;
    setSubmitting(true);
    try {
      await onConfirm({
        userRating: r,
        completionMemory: memory.trim() || null,
      });
      setMemory('');
      setRating(8);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-md journal-card border border-primary/40 rounded-xl p-6 z-depth-4"
        role="dialog"
        aria-labelledby="completion-survey-title"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="w-6 h-6" />
            <h2 id="completion-survey-title" className="text-lg readable-accent">
              You finished a game
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-muted/60"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          <span className="text-foreground font-medium">{gameTitle}</span> — save a quick wrap-up. This moves the
          title to your <strong className="text-primary">Completed</strong> shelf.
        </p>

        <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Overall rating (1–10)
        </label>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="range"
            min={1}
            max={10}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-8 text-center text-lg text-primary font-semibold tabular-nums">{rating}</span>
        </div>

        <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Memory / final thoughts (optional)
        </label>
        <textarea
          value={memory}
          onChange={(e) => setMemory(e.target.value)}
          rows={4}
          placeholder="What stuck with you? Favorite moment, characters, or how it landed?"
          className="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm readable-text resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <div className="flex flex-wrap gap-2 justify-end mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border/60 text-muted-foreground hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="px-4 py-2 rounded-lg bg-primary/25 text-primary border border-primary/50 hover:bg-primary/35 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save & mark complete'}
          </button>
        </div>
      </div>
    </div>
  );
}
