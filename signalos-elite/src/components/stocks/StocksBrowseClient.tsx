"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useOptionalLiveMarket } from "@/components/market/LiveMarketProvider";
import { useOptionalSelectedTicker } from "@/components/sigi/SelectedTickerContext";
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

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
}

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

export default function StocksBrowseClient({
  stocks,
}: {
  stocks: BrowseStock[];
}) {
  const liveMarket = useOptionalLiveMarket();
  const selectedTicker = useOptionalSelectedTicker();
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeTicker(query);
  const canQuickAdd = normalizedQuery.length >= 1;

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
      price: (() => {
        const livePrice = liveMarket?.quoteMap[normalizeTicker(stock.ticker)]?.price;

        return typeof livePrice === "number" && livePrice > 0 ? livePrice : stock.price;
      })(),
    }));
  }, [liveMarket?.quoteMap, stocks, query]);

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
          <div className="space-y-3">
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-4 py-5 text-sm text-white/55">
              No matching stocks found.
            </div>

            {canQuickAdd ? (
              <button
                type="button"
                onClick={() => {
                  const raw = window.localStorage.getItem("signalos.watchlist.quick-add.v1");
                  const parsed = raw ? JSON.parse(raw) : [];
                  const next = Array.isArray(parsed) ? parsed : [];
                  const merged = Array.from(new Set([...next, normalizedQuery]));
                  window.localStorage.setItem(
                    "signalos.watchlist.quick-add.v1",
                    JSON.stringify(merged)
                  );
                  window.location.href = "/watchlist";
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/16 hover:text-cyan-100"
              >
                Add {normalizedQuery} to Watchlist
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-hidden">
          <div className="grid w-full min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredStocks.map((stock) => (
              <div
                key={stock.id}
                onClick={() => selectedTicker?.setActiveTicker(stock.ticker)}
                className="w-full min-w-0 rounded-3xl border border-white/10 bg-linear-to-b from-white/6 to-white/3 p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.07] hover:shadow-[0_0_40px_rgba(34,211,238,0.06)]"
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
                        metadata={{
                          name: stock.company,
                          sector: stock.sector,
                          conviction: stock.conviction,
                          signal: stock.signal,
                          price: stock.price,
                          currentPrice: stock.price,
                          thesis: stock.thesis,
                        }}
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
        </div>
      )}
    </div>
  );
}