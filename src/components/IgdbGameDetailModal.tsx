import { useEffect, useState } from 'react';
import { X, BookOpen, Library } from 'lucide-react';
import type { IgdbGame } from './IgdbSearch';

type Props = {
  game: IgdbGame | null;
  inLibrary: boolean;
  onClose: () => void;
  /** Receives the richest game object we have (merged IGDB detail + search row) for POST /api/games */
  onAddToLibrary: (g: IgdbGame) => void | Promise<void>;
  onOpenJournal: () => void;
};

export default function IgdbGameDetailModal({
  game,
  inLibrary,
  onClose,
  onAddToLibrary,
  onOpenJournal,
}: Props) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [remote, setRemote] = useState<IgdbGame | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  useEffect(() => {
    setSummaryExpanded(false);
    setAdding(false);
    setRemote(null);
    setDetailErr(null);
  }, [game?.id]);

  useEffect(() => {
    if (!game) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailErr(null);
    fetch('/api/igdb/game-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: game.id, name: game.name }),
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof payload?.error === 'string' ? payload.error : `HTTP ${res.status}`;
          throw new Error(msg);
        }
        return payload as { game?: IgdbGame };
      })
      .then((payload) => {
        if (!cancelled && payload.game) setRemote(payload.game);
      })
      .catch((e: unknown) => {
        if (!cancelled) setDetailErr(e instanceof Error ? e.message : 'Could not load details');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game?.id]);

  if (!game) return null;

  const merged: IgdbGame = remote ? { ...game, ...remote } : game;

  const cover =
    merged.coverUrl ||
    (merged.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${merged.cover.image_id}.jpg`
      : 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=400&fit=crop');

  const year =
    merged.year ??
    (merged.first_release_date
      ? new Date(merged.first_release_date * 1000).getFullYear()
      : null);

  const genres = merged.genres ?? [];
  const platforms = merged.platforms ?? [];
  const shots = merged.screenshotUrls ?? [];
  const externalGames = merged.externalGames ?? [];
  const summary = merged.summary?.trim() ?? '';
  const summaryLong = summary.length > 280;
  const summaryShown =
    summaryExpanded || !summaryLong ? summary : `${summary.slice(0, 280)}…`;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto journal-card vhs-glow z-depth-4 rounded-xl border border-primary/30"
        role="dialog"
        aria-labelledby="igdb-detail-title"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border/50 bg-card/95 backdrop-blur-md p-4">
          <div className="flex gap-4 min-w-0">
            <img
              src={cover}
              alt=""
              className="w-20 h-[6.5rem] object-cover rounded-lg border border-primary/20 flex-shrink-0"
              onError={(e) => {
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=400&fit=crop';
              }}
            />
            <div className="min-w-0">
              <h2 id="igdb-detail-title" className="text-xl readable-accent text-primary truncate">
                {merged.name}
              </h2>
              {year != null && (
                <p className="text-sm text-muted-foreground mt-1">Release year: {year}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted/60 fast-transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {detailLoading && (
            <p className="text-xs text-muted-foreground">Loading genres, platforms, screenshots, and store links…</p>
          )}
          {detailErr && (
            <p className="text-xs text-amber-500/90" role="status">
              {detailErr} (showing search data only)
            </p>
          )}
          {shots.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Screenshots</p>
              <div className="flex gap-2 overflow-x-auto pb-2 neon-scrollbars">
                {shots.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${merged.name} screenshot ${i + 1}`}
                    className="h-28 w-auto max-w-[200px] object-cover rounded-md border border-border/50 flex-shrink-0"
                  />
                ))}
              </div>
            </div>
          )}

          {(genres.length > 0 || platforms.length > 0) && (
            <div className="space-y-3">
              {genres.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Genres</p>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-1 rounded-full text-xs bg-primary/15 text-primary border border-primary/30"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {platforms.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-1 rounded-full text-xs bg-secondary/15 text-secondary border border-secondary/25"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {externalGames.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Store links (IGDB)</p>
              <ul className="space-y-1.5 text-sm">
                {externalGames.map((eg, i) => (
                  <li key={`${eg.sourceName}-${eg.uid}-${i}`} className="flex flex-wrap gap-x-2 items-baseline">
                    <span className="text-muted-foreground shrink-0">{eg.sourceName || 'Store'}:</span>
                    {eg.url ? (
                      <a
                        href={eg.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {eg.name?.trim() || eg.url}
                      </a>
                    ) : (
                      <span className="readable-text tabular-nums">ID {eg.uid ?? '—'}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Summary</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {summaryShown}
              </p>
              {summaryLong && (
                <button
                  type="button"
                  onClick={() => setSummaryExpanded((v) => !v)}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  {summaryExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {!summary &&
            genres.length === 0 &&
            platforms.length === 0 &&
            shots.length === 0 &&
            externalGames.length === 0 && (
            <p className="text-sm text-muted-foreground">
              IGDB did not return extra details for this title. You can still add it to your library.
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2 border-t border-border/40">
            {inLibrary ? (
              <button
                type="button"
                onClick={() => {
                  onOpenJournal();
                  onClose();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 fast-transition"
              >
                <BookOpen className="w-4 h-4" />
                Open journal
              </button>
            ) : (
              <button
                type="button"
                disabled={adding}
                onClick={() => {
                  void (async () => {
                    setAdding(true);
                    try {
                      await onAddToLibrary(merged);
                      onClose();
                    } finally {
                      setAdding(false);
                    }
                  })();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 fast-transition disabled:opacity-50"
              >
                <Library className="w-4 h-4" />
                {adding ? 'Adding…' : 'Add to library (Recent)'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-border/60 text-muted-foreground hover:bg-muted/40 fast-transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
