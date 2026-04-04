// src/components/IgdbSearch.tsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";

/** Works with both simplified-proxy and raw IGDB minimal shapes */
export type IgdbGame = {
  id: number;
  name: string;

  // simplified-from-proxy
  year?: number;
  coverUrl?: string;
  summary?: string;
  genres?: string[];
  platforms?: string[];
  screenshotUrls?: string[];

  // raw-IGDB
  first_release_date?: number;
  cover?: { image_id: string };
};

type Props = {
  endpoint?: string;                    // default /api/igdb/search
  payloadMode?: "json" | "text" | "auto"; // default json
  value: string;
  onChange: (v: string) => void;
  onSelect: (g: IgdbGame) => void;
  limit?: number;
};

export default function IgdbSearch({
  endpoint = "/api/igdb/search",
  payloadMode = "json",
  value,
  onChange,
  onSelect,
  limit = 20,
}: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<IgdbGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);

  // portal positioning
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);  // wraps the input
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);   // portal root

  // click-outside (works with portal)
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(t) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // measure and pin dropdown to the input (using fixed coords)
  function positionDropdown() {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 8, left: r.left, width: r.width }); // +8px gap
  }

  useEffect(() => {
    if (!open) return;
    positionDropdown();
    const onScroll = () => positionDropdown();
    const onResize = () => positionDropdown();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(!!q);
      setLoading(false);
      setErr(null);
      return;
    }
    const t = setTimeout(() => doSearch(q), 420);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, endpoint, payloadMode, limit]);

  async function doSearch(q: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErr(null);

    const igdbQuery = `search "${q}";
fields id,name,first_release_date,summary,cover.image_id;
limit ${Math.min(Math.max(limit, 1), 20)};`;

    try {
      let data: IgdbGame[] | null = null;
      let lastErrText = "";

      const attempt = async (
        mode: "json" | "text"
      ): Promise<{ ok: boolean; data?: IgdbGame[]; errText?: string }> => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers:
            mode === "json"
              ? { "Content-Type": "application/json", Accept: "application/json" }
              : { "Content-Type": "text/plain", Accept: "application/json" },
          body: mode === "json" ? JSON.stringify({ query: q, limit }) : igdbQuery,
          signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") || "";
        const payload =
          contentType.includes("application/json")
            ? await res.json().catch(() => null)
            : await res.text().catch(() => "");

        if (res.ok) {
          const arr =
            payload && typeof payload === "object" && "results" in payload
              ? (payload.results as IgdbGame[])
              : Array.isArray(payload)
              ? (payload as IgdbGame[])
              : [];
          return { ok: true, data: arr };
        } else {
          return {
            ok: false,
            errText:
              typeof payload === "string"
                ? payload
                : JSON.stringify(payload || { error: `${res.status} ${res.statusText}` }),
          };
        }
      };

      if (payloadMode === "json" || payloadMode === "auto") {
        const r1 = await attempt("json");
        if (r1.ok) data = r1.data!;
        else lastErrText = r1.errText || lastErrText;
      }
      if (!data && (payloadMode === "text" || payloadMode === "auto")) {
        const r2 = await attempt("text");
        if (r2.ok) data = r2.data!;
        else lastErrText = r2.errText || lastErrText;
      }
      if (!data) throw new Error(lastErrText || "IGDB proxy returned an error");

      setResults(data);
      setOpen(true);
      setHighlight(0);
      positionDropdown();
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setErr(e?.message || "Search failed");
      setResults([]);
      setOpen(true);
      positionDropdown();
    } finally {
      setLoading(false);
    }
  }

  const ensureVisible = (idx: number) => {
    const list = dropdownRef.current?.querySelector('[data-role="list"]') as HTMLDivElement | null;
    const el = dropdownRef.current?.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null;
    if (!list || !el) return;
    const { top, bottom } = el.getBoundingClientRect();
    const { top: lt, bottom: lb } = list.getBoundingClientRect();
    if (top < lt) list.scrollTop -= lt - top;
    if (bottom > lb) list.scrollTop += bottom - lb;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => {
        const next = Math.min(h + 1, Math.max(0, results.length - 1));
        requestAnimationFrame(() => ensureVisible(next));
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => {
        const next = Math.max(h - 1, 0);
        requestAnimationFrame(() => ensureVisible(next));
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const g = results[highlight];
      if (g) {
        onSelect(g);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const getCover = (g: IgdbGame) =>
    g.coverUrl ||
    (g.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.cover.image_id}.jpg`
      : "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=80&h=106&fit=crop");

  const getYear = (g: IgdbGame) =>
    g.year ??
    (g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : undefined);

  return (
    <>
      {/* Input (stays inline) */}
      <div ref={containerRef} className="relative" data-layer="igdb-popover">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (value.trim()) {
                setOpen(true);
                positionDropdown();
              }
            }}
            onKeyDown={onKeyDown}
            placeholder="Search IGDB for games to add to your library..."
            className="w-full pl-10 pr-10 py-3 bg-input/60 border-2 border-primary/50 focus:border-primary/80 rounded-lg text-sm readable-text focus:outline-none focus:ring-2 focus:ring-primary/30 smooth-transition z-depth-1"
            style={{ boxShadow: "0 0 10px rgba(var(--primary), 0.15), 0 2px 6px rgba(0,0,0,0.2)" }}
          />
          {value && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onChange("");
                setResults([]);
                setOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded fast-transition"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown (in a portal, above everything) */}
      {open && coords &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            className="search-suggestions rounded-lg overflow-hidden z-depth-4"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9998,         // above your cards
              backdropFilter: "none"
            }}
          >
            <div data-role="list" className="max-h-[60vh] overflow-y-auto neon-scrollbars">
              {loading && <div className="p-3 text-sm text-muted-foreground">Searching…</div>}
              {!loading && err && (
                <div className="p-3 text-sm text-destructive break-words">Error: {err}</div>
              )}
              {!loading && !err && results.length === 0 && value.trim().length >= 2 && (
                <div className="p-3 text-sm text-muted-foreground">No results</div>
              )}

              {!loading &&
                !err &&
                results.map((g, idx) => {
                  const active = idx === highlight;
                  const cover = getCover(g);
                  const year = getYear(g);
                  return (
                    <div
                      key={g.id}
                      data-idx={idx}
                      onMouseEnter={() => setHighlight(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onSelect(g);
                        setOpen(false);
                      }}
                        className={`search-suggestion-item flex items-center gap-3 cursor-pointer ${
                        active ? "bg-secondary/20 ring-1 ring-secondary/40" : ""
                      }`}
                    >
                      <img
                        src={cover}
                        alt={g.name}
                        className="w-10 h-12 object-cover rounded border border-primary/20"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="readable-text truncate">{g.name}</div>
                        <div className="text-xs text-muted-foreground">{year ?? ""}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
