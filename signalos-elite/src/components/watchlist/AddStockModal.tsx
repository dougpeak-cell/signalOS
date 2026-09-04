"use client";

import { useEffect, useMemo, useState } from "react";
import {
  resolveStockTickerAlias,
  shouldSuppressSearchTicker,
} from "@/lib/stocks/symbolAliases";
import { useSyncedWatchlist } from "@/hooks/useSyncedWatchlist";

type StockOption = {
  ticker: string;
  company: string;
  sector?: string;
};

type SearchResponse = {
  results?: StockOption[];
};

type DisplayStockOption = StockOption & {
  fallbackHint?: string;
};

function normalizeTicker(value: string) {
  return resolveStockTickerAlias(value);
}

function buildLocalMatchScore(stock: StockOption, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 0;

  const ticker = stock.ticker.toLowerCase();
  const company = stock.company.toLowerCase();
  const sector = (stock.sector ?? "").toLowerCase();
  const treatAsTickerQuery = normalizeTicker(rawQuery).length > 0 && query.length <= 4;

  let score = 0;

  if (ticker === query) score += 100;
  else if (ticker.startsWith(query)) score += 70;
  else if (ticker.includes(query)) score += 35;

  if (company === query) score += 80;
  else if (company.startsWith(query)) score += 45;
  else if (company.includes(query)) score += 20;

  if (!treatAsTickerQuery) {
    if (sector === query) score += 25;
    else if (sector.includes(query)) score += 10;
  }

  return score;
}

function isTickerLikeQuery(value: string) {
  const normalizedValue = normalizeTicker(value);
  return normalizedValue.length >= 1 && normalizedValue.length <= 5;
}

export default function AddStockModal({
  open,
  onClose,
  stocks,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  stocks: StockOption[];
  onAdded?: (ticker: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [liveResults, setLiveResults] = useState<StockOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { addTicker, hasTicker } = useSyncedWatchlist();

  const normalizedQuery = normalizeTicker(query);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setLiveResults([]);
      setIsSearching(false);
    }
  }, [open]);

  const localFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return stocks.slice(0, 12);

    return stocks
      .map((stock) => ({ stock, score: buildLocalMatchScore(stock, query) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }

        return left.stock.ticker.localeCompare(right.stock.ticker);
      })
      .map((entry) => entry.stock)
      .slice(0, 20);
  }, [query, stocks]);

  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (q.length < 1) {
      setLiveResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setIsSearching(true);

        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(q)}&limit=12`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          if (!cancelled) setLiveResults([]);
          return;
        }

        const json = (await res.json()) as SearchResponse;
        const results = Array.isArray(json.results) ? json.results : [];

        if (!cancelled) {
          setLiveResults(results);
        }
      } catch {
        if (!cancelled) setLiveResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, open]);

  const filtered = useMemo(() => {
    const merged = [...localFiltered, ...liveResults];
    const seen = new Set<string>();

    return merged.filter((stock) => {
      const ticker = normalizeTicker(stock.ticker);
      if (
        !ticker ||
        seen.has(ticker) ||
        shouldSuppressSearchTicker(query, ticker, stock.company)
      ) {
        return false;
      }
      seen.add(ticker);
      return true;
    });
  }, [localFiltered, liveResults, query]);

  const exactTickerFallback = useMemo<DisplayStockOption | null>(() => {
    if (filtered.length > 0 || !isTickerLikeQuery(query) || !normalizedQuery) {
      return null;
    }

    return {
      ticker: normalizedQuery,
      company: "Add exact ticker to your watchlist",
      sector: "Exact match",
      fallbackHint: "No live match came back, but you can still track this ticker directly.",
    };
  }, [filtered, normalizedQuery, query]);

  const visibleResults = useMemo<DisplayStockOption[]>(() => {
    if (filtered.length > 0) {
      return filtered;
    }

    return exactTickerFallback ? [exactTickerFallback] : [];
  }, [exactTickerFallback, filtered]);

  function handleAdd(tickerInput: string) {
    const ticker = normalizeTicker(tickerInput);
    if (!ticker) return;

    addTicker(ticker);

    onAdded?.(ticker);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-4 sm:items-center">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 p-4 shadow-[0_0_60px_rgba(0,0,0,0.45)] sm:p-5">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/75">
              SigiOS
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Add Stock
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Search by ticker, company, or sector and add names to your watchlist.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-5">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticker or company..."
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/40 md:text-sm"
          />
        </div>

        <div className="mt-2 min-h-5 text-xs text-white/45">
          {isSearching ? "Searching live market data…" : null}
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
          {visibleResults.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-4 py-6 text-center text-sm text-white/55">
                No matching stocks found.
              </div>

              {normalizedQuery.length >= 1 ? (
                <button
                  type="button"
                  onClick={() => handleAdd(normalizedQuery)}
                  className="w-full rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/16 hover:text-cyan-100"
                >
                  Add &quot;{normalizedQuery}&quot; directly
                </button>
              ) : null}
            </div>
          ) : (
            visibleResults.map((stock) => {
              const ticker = normalizeTicker(stock.ticker);
              const alreadySaved = hasTicker(ticker);

              return (
                <div
                  key={ticker}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-white">
                        {ticker}
                      </div>
                      {stock.sector ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-300/75">
                          {stock.sector}
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-sm text-white/60">
                      {stock.company}
                    </div>
                    {stock.fallbackHint ? (
                      <div className="mt-1 text-xs text-cyan-200/70">
                        {stock.fallbackHint}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    disabled={alreadySaved}
                    onClick={() => handleAdd(ticker)}
                    className={
                      alreadySaved
                        ? "rounded-xl border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.22)]"
                        : "rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-400"
                    }
                  >
                    {alreadySaved ? "✓ Added" : "+ Add"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
