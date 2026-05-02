"use client";

import { useEffect, useMemo, useState } from "react";

import { readWatchlistRows } from "@/lib/storage/watchlist";
import { readWatchlist } from "@/lib/watchlist/localWatchlist";

const WATCHLIST_QUICK_ADD_KEY = "signalos.watchlist.quick-add.v1";

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
}

function readQuickAddTickers(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WATCHLIST_QUICK_ADD_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.map((item) => normalizeTicker(String(item))).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function readStoredWatchlistTickers(): string[] {
  if (typeof window === "undefined") return [];

  const savedTickers = readWatchlist();
  const rowTickers = readWatchlistRows()
    .map((row) => normalizeTicker(String(row.ticker ?? "")))
    .filter(Boolean);
  const quickAdds = readQuickAddTickers();

  return Array.from(new Set([...savedTickers, ...rowTickers, ...quickAdds]));
}

export function useStoredWatchlistTickers() {
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>(() =>
    readStoredWatchlistTickers()
  );

  useEffect(() => {
    const sync = () => setWatchlistTickers(readStoredWatchlistTickers());

    sync();

    const onStorage = () => sync();
    const onFocus = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    const onWatchlistUpdated = () => sync();
    const onLegacyWatchlistUpdated = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("signalos:watchlist-updated", onWatchlistUpdated);
    window.addEventListener(
      "signalos-watchlist-updated",
      onLegacyWatchlistUpdated as EventListener
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("signalos:watchlist-updated", onWatchlistUpdated);
      window.removeEventListener(
        "signalos-watchlist-updated",
        onLegacyWatchlistUpdated as EventListener
      );
    };
  }, []);

  const watchlistTickerSet = useMemo(
    () => new Set(watchlistTickers.map((ticker) => normalizeTicker(ticker))),
    [watchlistTickers]
  );

  return {
    watchlistTickers,
    watchlistTickerSet,
  };
}