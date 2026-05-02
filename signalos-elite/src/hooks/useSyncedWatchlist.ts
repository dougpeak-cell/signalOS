"use client";

import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";
import { addStoredWatchlistTicker } from "@/lib/watchlistStore";

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
}

export function useSyncedWatchlist() {
  const { watchlistTickers, watchlistTickerSet } = useStoredWatchlistTickers();

  function addTicker(ticker: string) {
    addStoredWatchlistTicker(ticker);
  }

  function hasTicker(ticker: string) {
    const normalizedTicker = normalizeTicker(ticker);
    return normalizedTicker ? watchlistTickerSet.has(normalizedTicker) : false;
  }

  return { tickers: watchlistTickers, addTicker, hasTicker };
}