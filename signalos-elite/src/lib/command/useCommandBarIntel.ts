"use client";

import { useEffect, useMemo, useState } from "react";

type WatchlistItem =
  | string
  | {
      ticker?: string;
      symbol?: string;
      conviction?: number | null;
      score?: number | null;
      signal?: string | null;
      target?: number | null;
      price?: number | null;
      currentPrice?: number | null;
      changePercent?: number | null;
    };

type PortfolioItem = {
  ticker?: string;
  symbol?: string;
  shares?: number | null;
  quantity?: number | null;
  avgCost?: number | null;
  averageCost?: number | null;
  costBasis?: number | null;
  entryPrice?: number | null;
  currentPrice?: number | null;
  price?: number | null;
  target?: number | null;
  stop?: number | null;
  thesis?: string | null;
  conviction?: number | null;
};

export type CommandBarIntel = {
  watchlistCount: number;
  portfolioCount: number;
  strongestSetup: string;
  atRiskCount: number;
  nearTargetCount: number;
};

const WATCHLIST_KEYS = [
  "signalos:watchlist",
  "signalos.watchlist",
  "signalos.watchlist.v1",
  "signalos.watchlist.rows.v1",
  "signalos.watchlist.quick-add.v1",
  "watchlist",
  "signalos_watchlist",
  "signal-os-watchlist",
];

const PORTFOLIO_KEYS = [
  "signalos.portfolio",
  "portfolio",
  "signalos_portfolio",
  "signal-os-portfolio",
];

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readFirstStorageValue<T>(keys: string[]): T | null {
  if (typeof window === "undefined") return null;

  for (const key of keys) {
    const parsed = safeJsonParse<T>(window.localStorage.getItem(key));
    if (parsed != null) return parsed;
  }

  return null;
}

function readAllStorageValues<T>(keys: string[]): T[] {
  if (typeof window === "undefined") return [];

  const values: T[] = [];

  for (const key of keys) {
    const parsed = safeJsonParse<T>(window.localStorage.getItem(key));
    if (parsed != null) values.push(parsed);
  }

  return values;
}

function normalizeTicker(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function getWatchlistTicker(item: WatchlistItem): string {
  if (typeof item === "string") return normalizeTicker(item);
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function getPortfolioTicker(item: PortfolioItem): string {
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function scoreWatchlistItem(item: WatchlistItem): number {
  if (typeof item === "string") return 0;

  const conviction = getNumber(item.conviction) ?? 0;
  const score = getNumber(item.score) ?? 0;
  const signalBoost =
    item.signal === "Bullish"
      ? 15
      : item.signal === "Neutral"
        ? 5
        : item.signal === "Bearish"
          ? -10
          : 0;

  const changeBoost = getNumber(item.changePercent) ?? 0;

  return conviction * 10 + score + signalBoost + changeBoost;
}

function isNearTarget(item: PortfolioItem): boolean {
  const price = getNumber(item.currentPrice) ?? getNumber(item.price);

  const target = getNumber(item.target);

  if (price == null || target == null || price <= 0 || target <= 0) return false;

  const distancePct = Math.abs(target - price) / price;
  return distancePct <= 0.03;
}

function isAtRisk(item: PortfolioItem): boolean {
  const price = getNumber(item.currentPrice) ?? getNumber(item.price);

  const stop = getNumber(item.stop);

  if (price == null || stop == null || price <= 0 || stop <= 0) return false;

  const distanceToStopPct = (price - stop) / price;
  return distanceToStopPct <= 0.03;
}

function dedupe<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const next: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }

  return next;
}

function readIntelFromStorage(): CommandBarIntel {
  const rawWatchlist = readAllStorageValues<WatchlistItem[]>(WATCHLIST_KEYS).flat();
  const rawPortfolio = readFirstStorageValue<PortfolioItem[]>(PORTFOLIO_KEYS) ?? [];

  const watchlist = dedupe(rawWatchlist, getWatchlistTicker).filter((item) =>
    Boolean(getWatchlistTicker(item))
  );

  const portfolio = dedupe(rawPortfolio, getPortfolioTicker).filter((item) =>
    Boolean(getPortfolioTicker(item))
  );

  let strongestSetup = "—";
  let strongestScore = -Infinity;

  for (const item of watchlist) {
    const ticker = getWatchlistTicker(item);
    if (!ticker) continue;

    const score = scoreWatchlistItem(item);
    if (score > strongestScore) {
      strongestScore = score;
      strongestSetup = ticker;
    }
  }

  if (strongestSetup === "—" && watchlist.length > 0) {
    strongestSetup = getWatchlistTicker(watchlist[0]) || "—";
  }

  const atRiskCount = portfolio.filter(isAtRisk).length;
  const nearTargetCount = portfolio.filter(isNearTarget).length;

  return {
    watchlistCount: watchlist.length,
    portfolioCount: portfolio.length,
    strongestSetup,
    atRiskCount,
    nearTargetCount,
  };
}

export function useCommandBarIntel(): CommandBarIntel {
  const [intel, setIntel] = useState<CommandBarIntel>({
    watchlistCount: 0,
    portfolioCount: 0,
    strongestSetup: "—",
    atRiskCount: 0,
    nearTargetCount: 0,
  });

  useEffect(() => {
    const sync = () => {
      setIntel(readIntelFromStorage());
    };

    sync();

    const onStorage = () => sync();
    const onFocus = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    const onCommandBarRefresh = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("signalos:watchlist-updated", onCommandBarRefresh);
    window.addEventListener("signalos:portfolio-updated", onCommandBarRefresh);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("signalos:watchlist-updated", onCommandBarRefresh);
      window.removeEventListener("signalos:portfolio-updated", onCommandBarRefresh);
    };
  }, []);

  return useMemo(() => intel, [intel]);
}