"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readWatchlist } from "@/lib/watchlist/localWatchlist";

type MostWatchedStock = {
  id: string;
  ticker: string;
  company: string;
  price: number;
  conviction: number;
  href: string;
};

export default function MostWatchedPanel({
  stocks,
}: {
  stocks: MostWatchedStock[];
}) {
  const [savedTickers, setSavedTickers] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSavedTickers(readWatchlist());
    };

    sync();
    setMounted(true);

    const onStorage = () => sync();
    const onCustomUpdate = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "signalos-watchlist-updated",
      onCustomUpdate as EventListener
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "signalos-watchlist-updated",
        onCustomUpdate as EventListener
      );
    };
  }, []);

  const watchedStocks = useMemo(() => {
    const savedSet = new Set(savedTickers.map((t) => t.toUpperCase()));

    return stocks
      .filter((stock) => savedSet.has(stock.ticker.toUpperCase()))
      .sort((a, b) => b.conviction - a.conviction)
      .slice(0, 5);
  }, [stocks, savedTickers]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
        Most Watched
      </div>

      <div className="mt-4 space-y-3">
        {!mounted ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-sm text-white/50">
            Loading watchlist...
          </div>
        ) : watchedStocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-white/50">
            No saved stocks yet. Add names to your watchlist to see them here.
          </div>
        ) : (
          watchedStocks.map((stock) => (
            <Link
              key={stock.id}
              href={stock.href}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-3 transition hover:border-white/20 hover:bg-white/6"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">
                  {stock.ticker}
                </div>
                <div className="truncate text-xs text-white/50">
                  {stock.company}
                </div>
              </div>

              <div className="ml-3 shrink-0 text-right">
                <div className="text-sm font-semibold text-white">
                  {stock.price > 0 ? `$${stock.price.toFixed(2)}` : "—"}
                </div>
                <div className="text-xs text-cyan-300">
                  {stock.conviction}/100
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
