"use client";

import { useEffect, useMemo, useState } from "react";
import { readWatchlist } from "@/lib/watchlist/localWatchlist";

type MostWatchedStatStock = {
  ticker: string;
  conviction: number;
};

export default function MostWatchedStat({
  stocks,
}: {
  stocks: MostWatchedStatStock[];
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

  const mostWatchedTicker = useMemo(() => {
    const savedSet = new Set(savedTickers.map((t) => t.toUpperCase()));

    const savedStocks = stocks
      .filter((stock) => savedSet.has(stock.ticker.toUpperCase()))
      .sort((a, b) => b.conviction - a.conviction);

    return savedStocks[0]?.ticker ?? "—";
  }, [stocks, savedTickers]);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
      <div className="text-sm text-white/60">Most Watched</div>
      <div className="text-sm font-semibold text-white">
        {mounted ? mostWatchedTicker : "—"}
      </div>
    </div>
  );
}
