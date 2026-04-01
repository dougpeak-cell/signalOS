"use client";

import { useMemo, useState } from "react";
import {
  addToWatchlist,
  hasInWatchlist,
  readWatchlist,
} from "@/lib/watchlist/localWatchlist";

type StockOption = {
  ticker: string;
  company: string;
  sector?: string;
};

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
  const [justAddedTicker, setJustAddedTicker] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stocks.slice(0, 12);

    return stocks
      .filter((stock) => {
        return (
          stock.ticker.toLowerCase().includes(q) ||
          stock.company.toLowerCase().includes(q) ||
          (stock.sector ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [query, stocks]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-neutral-950 p-5 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/75">
              SignalOS
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
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/40"
          />
        </div>

        <div className="mt-5 max-h-105 space-y-3 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-4 py-6 text-center text-sm text-white/55">
              No matching stocks found.
            </div>
          ) : (
            filtered.map((stock) => {
              const alreadySaved = hasInWatchlist(stock.ticker);
              const justAdded = justAddedTicker === stock.ticker;

              return (
                <div
                  key={stock.ticker}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-white">
                        {stock.ticker}
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
                  </div>

                  <button
                    type="button"
                    disabled={alreadySaved}
                    onClick={() => {
                      const tickers = addToWatchlist(stock.ticker);
                      setJustAddedTicker(stock.ticker);

                      window.dispatchEvent(
                        new CustomEvent("signalos-watchlist-updated", {
                          detail: {
                            ticker: stock.ticker,
                            inWatchlist: true,
                            tickers,
                            count: tickers.length,
                          },
                        })
                      );

                      window.setTimeout(() => {
                        setJustAddedTicker((current) =>
                          current === stock.ticker ? null : current
                        );
                      }, 1200);

                      onAdded?.(stock.ticker);
                    }}
                    className={
                      alreadySaved || justAdded
                        ? "rounded-xl border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.22)]"
                        : "rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-400"
                    }
                  >
                    {alreadySaved || justAdded ? "✓ Added" : "+ Add"}
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
