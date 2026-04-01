"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WatchlistToggleButton from "@/components/watchlist/WatchlistToggleButton";

type BrowseStock = {
  id: string;
  ticker: string;
  company: string;
  sector: string;
  price: number;
  conviction: number;
  signal: "Bullish" | "Neutral" | "Bearish";
  thesis: string;
  inWatchlist: boolean;
  href: string;
  liveHref: string;
};

type LiveQuote = {
  ticker?: string;
  symbol?: string;
  price?: number | null;
  lastPrice?: number | null;
  last?: number | null;
  value?: number | null;
};

type QuoteMap = Record<string, number>;

const POLL_MS = 15000;

const QUOTE_ENDPOINT_CANDIDATES = [
  (symbol: string) => `/api/massive/quote?ticker=${symbol}`,
  (symbol: string) => `/api/quote?symbol=${symbol}`,
  (symbol: string) => `/api/quotes?ticker=${symbol}`,
  (symbol: string) => `/api/quotes?symbol=${symbol}`,
  (symbol: string) => `/api/market/quote?ticker=${symbol}`,
  (symbol: string) => `/api/market/quote?symbol=${symbol}`,
];

function signalClasses(signal: BrowseStock["signal"]) {
  if (signal === "Bullish") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (signal === "Bearish") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }
  return "border-white/10 bg-white/5 text-white/70";
}

function convictionBarClasses(conviction: number) {
  if (conviction >= 85) return "bg-emerald-400";
  if (conviction >= 70) return "bg-cyan-400";
  return "bg-amber-400";
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchQuoteFromCandidates(symbol: string): Promise<number | null> {
  for (const buildUrl of QUOTE_ENDPOINT_CANDIDATES) {
    try {
      const response = await fetch(buildUrl(symbol), {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) continue;

      const json = (await response.json()) as LiveQuote;

      const price =
        toNumber(json.lastPrice) ??
        toNumber(json.price) ??
        toNumber(json.last) ??
        toNumber(json.value);

      if (price != null && price > 0) {
        return price;
      }
    } catch {
      // try next endpoint
    }
  }

  return null;
}

export default function StocksBrowseClient({
  stocks,
}: {
  stocks: BrowseStock[];
}) {
  const [query, setQuery] = useState("");
  const [liveQuotes, setLiveQuotes] = useState<QuoteMap>({});

  useEffect(() => {
    let cancelled = false;

    async function loadQuotes() {
      const entries = await Promise.all(
        stocks.map(async (stock) => {
          const livePrice = await fetchQuoteFromCandidates(stock.ticker);
          return [stock.ticker, livePrice] as const;
        }),
      );

      if (cancelled) return;

      setLiveQuotes((prev) => {
        const next: QuoteMap = { ...prev };

        for (const [ticker, livePrice] of entries) {
          if (typeof livePrice === "number" && livePrice > 0) {
            next[ticker] = livePrice;
          }
        }

        return next;
      });
    }

    loadQuotes();
    const id = window.setInterval(loadQuotes, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = !q
      ? stocks
      : stocks.filter((stock) => {
          return (
            stock.ticker.toLowerCase().includes(q) ||
            stock.company.toLowerCase().includes(q) ||
            stock.sector.toLowerCase().includes(q)
          );
        });

    return base.map((stock) => ({
      ...stock,
      price:
        typeof liveQuotes[stock.ticker] === "number" && liveQuotes[stock.ticker] > 0
          ? liveQuotes[stock.ticker]
          : stock.price,
    }));
  }, [stocks, query, liveQuotes]);

  return (
    <div className="min-w-0 space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <label htmlFor="stock-search" className="sr-only">
              Search stocks
            </label>
            <input
              id="stock-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker, company, or sector..."
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/40"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10"
            >
              All Sectors
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10"
            >
              Strongest Signals
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10"
            >
              Price
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10"
            >
              Conviction
            </button>
          </div>
        </div>
      </div>

      {filteredStocks.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
          <div className="text-sm text-white/70">No matching stocks found.</div>
          <div className="mt-2 text-sm text-white/55">
            Try a ticker, company name, or sector.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {filteredStocks.map((stock) => (
            <div
              key={stock.id}
              className="min-w-0 rounded-3xl border border-white/10 bg-linear-to-b from-white/6 to-white/3 p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.07] hover:shadow-[0_0_40px_rgba(34,211,238,0.06)]"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/75">
                      {stock.sector}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-2xl font-semibold tracking-tight text-white">
                        {stock.ticker}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${signalClasses(
                          stock.signal
                        )}`}
                      >
                        {stock.signal}
                      </span>
                    </div>

                    <div className="mt-1 truncate text-sm text-white/65">
                      {stock.company}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <WatchlistToggleButton
                      ticker={stock.ticker}
                      defaultInWatchlist={stock.inWatchlist}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                      Price
                    </div>
                    <div className="mt-1 truncate text-2xl font-semibold text-white">
                      {stock.price > 0 ? `$${stock.price.toFixed(2)}` : "—"}
                    </div>
                  </div>

                  <div className="min-w-0 text-left sm:text-right">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                      Conviction
                    </div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {stock.conviction}/100
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-white/45">
                    <span>Signal Strength</span>
                    <span>{stock.conviction}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${convictionBarClasses(
                        stock.conviction
                      )}`}
                      style={{ width: `${stock.conviction}%` }}
                    />
                  </div>
                </div>

                <p className="line-clamp-3 text-sm leading-6 text-white/68">
                  {stock.thesis}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={stock.href}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    View Stock
                  </Link>

                  <Link
                    href={stock.liveHref}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/15"
                  >
                    Open Chart
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}