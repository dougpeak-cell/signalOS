"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type StockSearchResult = {
  ticker: string;
  name: string | null;
};

export default function TickerSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [results, setResults] = useState<StockSearchResult[]>([]);

  const matches = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [];

    return results
      .filter((stock) => {
        const ticker = stock.ticker.toUpperCase();
        const name = (stock.name ?? "").toUpperCase();
        return ticker.includes(q) || name.includes(q);
      })
      .sort((a, b) => {
        const aTicker = a.ticker.toUpperCase();
        const bTicker = b.ticker.toUpperCase();
        const aName = (a.name ?? "").toUpperCase();
        const bName = (b.name ?? "").toUpperCase();

        const aTickerStarts = aTicker.startsWith(q) ? 0 : 1;
        const bTickerStarts = bTicker.startsWith(q) ? 0 : 1;
        if (aTickerStarts !== bTickerStarts) return aTickerStarts - bTickerStarts;

        const aNameStarts = aName.startsWith(q) ? 0 : 1;
        const bNameStarts = bName.startsWith(q) ? 0 : 1;
        if (aNameStarts !== bNameStarts) return aNameStarts - bNameStarts;

        return aTicker.localeCompare(bTicker);
      })
      .slice(0, 6);
  }, [query, results]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(q)}&limit=12`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        const next = Array.isArray(data?.results) ? data.results : [];
        setResults(next);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setResults([]);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToTicker(ticker: string) {
    const normalized = ticker.trim().toUpperCase();
    if (!normalized) return;

    setQuery(normalized);
    setIsOpen(false);
    router.push(`/stocks/${encodeURIComponent(normalized)}/live`);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) return;

    if (matches[activeIndex]) {
      goToTicker(matches[activeIndex].ticker);
      return;
    }

    goToTicker(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!matches.length) {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) goToTicker(trimmed);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev + 1) % matches.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      goToTicker(matches[activeIndex]?.ticker ?? query);
    }
  }

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold tracking-[0.18em] text-cyan-300/80">
            ⌕
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search stock or ticker"
            className="w-64 rounded-2xl border border-cyan-400/25 bg-linear-to-b from-white/10 to-white/4 py-2.5 pl-9 pr-3 text-sm font-medium text-white placeholder:text-white/35 outline-none shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_8px_24px_rgba(0,0,0,0.35)] transition focus:border-cyan-300/50 focus:bg-white/8 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_24px_rgba(34,211,238,0.08)]"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </form>

      {isOpen && matches.length > 0 ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(5,10,20,0.96)] shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="border-b border-white/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/65">
            Symbols
          </div>

          <div className="p-2">
            {matches.map((item, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={item.ticker}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToTicker(item.ticker)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                    isActive
                      ? "bg-cyan-400/10 ring-1 ring-cyan-400/20"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tracking-tight text-white">
                      {item.ticker}
                    </div>
                    <div className="truncate text-xs text-white/45">
                      {item.name}
                    </div>
                  </div>

                  <div className="ml-3 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                    Live
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}