import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Loader2, MessageCircleQuestion } from 'lucide-react';
import { askGameGuide, fetchGuideStatus, type GuideCitation } from '../api/guide';

type Props = {
  gameId: number;
  gameTitle: string;
};

function tierLabel(tier: GuideCitation['tier']) {
  switch (tier) {
    case 'official':
      return 'Official';
    case 'wiki':
      return 'Wiki';
    case 'community':
      return 'Community';
    default:
      return tier;
  }
}

function tierClass(tier: GuideCitation['tier']) {
  switch (tier) {
    case 'official':
      return 'bg-primary/20 text-primary border-primary/40';
    case 'wiki':
      return 'bg-accent/20 text-accent border-accent/40';
    case 'community':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export default function GameGuidePanel({ gameId, gameTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [useLlm, setUseLlm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<GuideCitation[]>([]);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [hasLlm, setHasLlm] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchGuideStatus()
      .then((s) => setHasLlm(s.hasLlmConfigured))
      .catch(() => setHasLlm(false));
  }, [open]);

  const onAsk = async () => {
    const q = question.trim();
    if (q.length < 3) {
      setErr('Enter a question (at least 3 characters).');
      return;
    }
    setBusy(true);
    setErr(null);
    setAnswer(null);
    setCitations([]);
    setDisclaimer(null);
    setPageUrl(null);
    try {
      const res = await askGameGuide({ gameId, question: q, useLlm: useLlm && hasLlm });
      setAnswer(res.answer);
      setCitations(res.citations ?? []);
      setDisclaimer(res.disclaimer);
      setPageUrl(res.pageUrl ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Guide request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/20 fast-transition"
      >
        <span className="flex items-center gap-2 text-primary readable-accent font-medium">
          <MessageCircleQuestion className="w-5 h-5" />
          Ask about this game
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40">
          <p className="text-sm text-muted-foreground pt-3 leading-relaxed">
            Wiki-first answers for <span className="text-foreground">{gameTitle}</span>. Facts come from
            fetched wiki pages — not from model memory.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) void onAsk();
              }}
              placeholder='e.g. "Where is Rivers of Blood?"'
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => void onAsk()}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 text-sm fast-transition disabled:opacity-50"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching wiki…
                </span>
              ) : (
                'Ask'
              )}
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={useLlm}
              onChange={(e) => setUseLlm(e.target.checked)}
              disabled={!hasLlm || busy}
              className="rounded border-border"
            />
            Rephrase with local AI (Ollama)
            {!hasLlm && (
              <span className="text-muted-foreground/80">— set provider to Ollama in Settings</span>
            )}
          </label>

          {err && (
            <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-3 py-2 bg-destructive/5">
              {err}
            </p>
          )}

          {answer && (
            <div className="space-y-3">
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Guide answer
                </p>
                <div className="text-sm readable-text whitespace-pre-wrap leading-relaxed">{answer}</div>
                {disclaimer && (
                  <p className="text-xs text-muted-foreground mt-3 border-t border-border/40 pt-2">
                    {disclaimer}
                  </p>
                )}
              </div>

              {pageUrl && (
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open wiki page
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {citations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Sources</p>
                  {citations.map((c, i) => (
                    <div
                      key={`${c.url}-${i}`}
                      className="rounded-lg border border-border/50 bg-muted/10 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${tierClass(c.tier)}`}
                        >
                          {tierLabel(c.tier)}
                        </span>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-foreground hover:text-primary fast-transition"
                        >
                          {c.title}
                        </a>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-4">
                        {c.excerpt}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
