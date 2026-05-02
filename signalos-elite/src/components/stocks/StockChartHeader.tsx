"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";
import { addToPortfolio, readPortfolio } from "@/lib/storage/portfolio";
import { addToWatchlist } from "@/lib/watchlist/localWatchlist";

const QUICK_TICKERS = ["NVDA", "AAPL", "TSLA", "SPY", "QQQ"];
const RECENT_SEARCHES_KEY = "signalos.stock-header.recent-searches.v1";
const LAST_VIEWED_TICKER_KEY = "signalos.stock-header.last-ticker.v1";

type SearchResult = {
  ticker: string;
  name: string | null;
};

function normalizeTicker(value: string) {
  return value.trim().toUpperCase();
}

function readRecentSearches(): SearchResult[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const ticker = normalizeTicker(String((item as { ticker?: unknown }).ticker ?? ""));
        if (!ticker) return null;

        return {
          ticker,
          name:
            typeof (item as { name?: unknown }).name === "string"
              ? (item as { name: string }).name
              : null,
        };
      })
      .filter((item): item is SearchResult => item != null)
      .slice(0, 5);
  } catch {
    return [];
  }
}

function writeRecentSearches(entries: SearchResult[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(entries.slice(0, 5)));
}

export default function StockChartHeader({
  ticker,
  companyName,
}: {
  ticker: string;
  companyName?: string | null;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const { watchlistTickerSet } = useStoredWatchlistTickers();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchRequestIdRef = useRef(0);

  const normalizedTicker = normalizeTicker(ticker);
  const resolvedCompanyName = companyName?.trim() || normalizedTicker;
  const isInWatchlist = watchlistTickerSet.has(normalizedTicker);
  const portfolioTickerSet = useMemo(
    () => new Set(portfolioTickers.map((item) => normalizeTicker(item))),
    [portfolioTickers]
  );
  const isInPortfolio = portfolioTickerSet.has(normalizedTicker);
  const trimmedInput = input.trim();

  const dropdownItems = useMemo(() => {
    if (trimmedInput.length >= 1) return searchResults;
    return recentSearches;
  }, [recentSearches, searchResults, trimmedInput.length]);

  useEffect(() => {
    const syncPortfolio = () => {
      setPortfolioTickers(
        readPortfolio()
          .map((row) => row.ticker)
          .filter(Boolean)
      );
    };

    syncPortfolio();

    window.addEventListener("storage", syncPortfolio);
    window.addEventListener(
      "signalos:portfolio-updated",
      syncPortfolio as EventListener
    );

    return () => {
      window.removeEventListener("storage", syncPortfolio);
      window.removeEventListener(
        "signalos:portfolio-updated",
        syncPortfolio as EventListener
      );
    };
  }, []);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_VIEWED_TICKER_KEY, normalizedTicker);
  }, [normalizedTicker]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable;

      if (event.key !== "/" || isEditable || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
      setShowDropdown(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!trimmedInput) {
      setSearchResults([]);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(trimmedInput)}&limit=6`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          if (requestId === searchRequestIdRef.current) {
            setSearchResults([]);
          }
          return;
        }

        const data = await res.json();
        if (requestId === searchRequestIdRef.current) {
          setSearchResults(Array.isArray(data?.results) ? data.results : []);
        }
      } catch {
        if (requestId === searchRequestIdRef.current) {
          setSearchResults([]);
        }
      }
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [trimmedInput]);

  const goToTicker = (value: string, name?: string | null) => {
    const t = normalizeTicker(value);
    if (!t) return;

    const nextRecentSearches = [
      { ticker: t, name: name?.trim() || null },
      ...recentSearches.filter((entry) => entry.ticker !== t),
    ].slice(0, 5);

    setRecentSearches(nextRecentSearches);
    writeRecentSearches(nextRecentSearches);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_VIEWED_TICKER_KEY, t);
    }

    router.push(`/stocks/${t}`);
    setInput("");
    setShowDropdown(false);
  };

  const handleAddToWatchlist = () => {
    addToWatchlist(normalizedTicker);
  };

  const handleAddToPortfolio = () => {
    addToPortfolio(normalizedTicker, resolvedCompanyName);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/3 p-4 backdrop-blur">
      {/* Top Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex min-w-60 flex-1 items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => {
              window.setTimeout(() => {
                setShowDropdown(false);
              }, 120);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const firstResult = dropdownItems[0] ?? null;
                if (firstResult) {
                  goToTicker(firstResult.ticker, firstResult.name);
                } else {
                  goToTicker(input);
                }
              }
            }}
            placeholder="Type a ticker or company..."
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-cyan-400/40"
          />

          <button
            onClick={() => {
              const firstResult = dropdownItems[0] ?? null;
              if (firstResult) {
                goToTicker(firstResult.ticker, firstResult.name);
              } else {
                goToTicker(input);
              }
            }}
            className="rounded-xl bg-cyan-400/20 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/30"
          >
            Go
          </button>

          {showDropdown && dropdownItems.length > 0 ? (
            <div className="absolute left-0 right-12 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#07111a]/98 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur">
              <div className="border-b border-white/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                {trimmedInput.length >= 1 ? "Matches" : "Recent Searches"}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {dropdownItems.map((result) => (
                  <button
                    key={`${result.ticker}-${result.name ?? ""}`}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      goToTicker(result.ticker, result.name);
                    }}
                    className="flex w-full items-center justify-between gap-3 border-b border-white/6 px-3 py-3 text-left transition hover:bg-white/6 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {result.ticker}
                      </div>
                      <div className="truncate text-xs text-white/50">
                        {result.name ?? "Company name unavailable"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddToWatchlist}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
          >
            {isInWatchlist ? "✓ Watchlist" : "+ Watchlist"}
          </button>

          <button
            onClick={handleAddToPortfolio}
            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20"
          >
            {isInPortfolio ? "✓ Portfolio" : "+ Portfolio"}
          </button>
        </div>
      </div>

      {/* Quick Tickers */}
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_TICKERS.map((t) => (
          <button
            key={t}
            onClick={() => goToTicker(t)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              t === ticker
                ? "bg-cyan-400/20 text-cyan-300"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}