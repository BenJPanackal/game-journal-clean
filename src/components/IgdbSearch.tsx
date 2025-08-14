// src/components/IgdbSearch.tsx
import React from "react";
import { Search, X, Loader2 } from "lucide-react";
import type { IgdbGame as _IgdbGame } from "./IgdbSearch"; // self-ref for type reuse if needed

export type IgdbGame = {
  id: number;
  name: string;
  year?: number | null;
  coverUrl?: string | null;
  summary?: string | null;
};

export default function IgdbSearch({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (g: IgdbGame) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<IgdbGame[]>([]);
  const [open, setOpen] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    if (!value || value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:5174/api/igdb/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: value, limit: 8 }),
        });
        const json = await res.json();
        setResults(json.results || []);
        setOpen(true);
      } catch (e) {
        console.error("IGDB fetch failed:", e);
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search IGDB for games to add to your library..."
        className="w-full pl-10 pr-10 py-3 bg-input/60 border-2 border-primary/50 focus:border-primary/80 rounded-lg text-sm readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 smooth-transition z-depth-1"
        aria-label="Search IGDB"
      />
      {value && (
        <button
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded fast-transition"
          aria-label="Clear search"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 search-suggestions rounded-lg overflow-hidden z-depth-4">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching IGDB…
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No results</div>
          ) : (
            results.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  onSelect(g);
                  setOpen(false);
                }}
                className="w-full text-left search-suggestion-item cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {g.coverUrl ? (
                    <img
                      src={g.coverUrl}
                      alt={g.name}
                      className="w-10 h-12 object-cover rounded border border-primary/20"
                    />
                  ) : (
                    <div className="w-10 h-12 rounded border border-primary/20 bg-muted/30" />
                  )}
                  <div className="flex-1">
                    <h4 className="readable-text">{g.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {g.year ?? "—"}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

