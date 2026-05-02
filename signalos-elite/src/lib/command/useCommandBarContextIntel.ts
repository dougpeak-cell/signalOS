"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type WatchlistItem =
  | string
  | {
      ticker?: string;
      symbol?: string;
      name?: string | null;
      conviction?: number | null;
      score?: number | null;
      signal?: "Bullish" | "Neutral" | "Bearish" | string | null;
      target?: number | null;
      price?: number | null;
      currentPrice?: number | null;
      changePercent?: number | null;
    };

type PortfolioItem = {
  ticker?: string;
  symbol?: string;
  name?: string | null;
  shares?: number | null;
  quantity?: number | null;
  avgCost?: number | null;
  averageCost?: number | null;
  costBasis?: number | null;
  entryPrice?: number | null;
  currentPrice?: number | null;
  price?: number | null;
  marketValue?: number | null;
  target?: number | null;
  stop?: number | null;
  conviction?: number | null;
  signal?: "Bullish" | "Neutral" | "Bearish" | string | null;
  changePercent?: number | null;
};

export type CommandIntelCard = {
  label: string;
  value: string;
  tone?: "default" | "accent" | "success" | "warn" | "danger";
};

export type CommandBarContextIntel = {
  pageKey: "today" | "watchlist" | "portfolio" | "stock" | "other";
  title: string;
  cards: CommandIntelCard[];
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

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getWatchlistTicker(item: WatchlistItem): string {
  if (typeof item === "string") return normalizeTicker(item);
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function getPortfolioTicker(item: PortfolioItem): string {
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
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

function getWatchlistPrice(item: WatchlistItem): number | null {
  if (typeof item === "string") return null;
  return getNumber(item.currentPrice) ?? getNumber(item.price);
}

function getPortfolioPrice(item: PortfolioItem): number | null {
  return getNumber(item.currentPrice) ?? getNumber(item.price);
}

function getPortfolioShares(item: PortfolioItem): number {
  return getNumber(item.shares) ?? getNumber(item.quantity) ?? 0;
}

function getPortfolioAvgCost(item: PortfolioItem): number | null {
  return (
    getNumber(item.avgCost) ??
    getNumber(item.averageCost) ??
    getNumber(item.entryPrice) ??
    getNumber(item.costBasis)
  );
}

function getPortfolioMarketValue(item: PortfolioItem): number {
  const explicit = getNumber(item.marketValue);
  if (explicit != null) return explicit;

  const shares = getPortfolioShares(item);
  const price = getPortfolioPrice(item);

  if (shares > 0 && price != null) {
    return shares * price;
  }

  return 0;
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatDollarCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";

  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }

  return `$${value.toFixed(2)}`;
}

function formatPLPct(item: PortfolioItem): number | null {
  const price = getPortfolioPrice(item);
  const avgCost = getPortfolioAvgCost(item);

  if (price == null || avgCost == null || avgCost <= 0) return null;
  return ((price - avgCost) / avgCost) * 100;
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

function breakoutDistancePct(item: WatchlistItem): number | null {
  if (typeof item === "string") return null;

  const price = getWatchlistPrice(item);
  const target = getNumber(item.target);

  if (price == null || target == null || price <= 0 || target <= 0) return null;
  return ((target - price) / price) * 100;
}

function riskDistancePct(item: PortfolioItem): number | null {
  const price = getPortfolioPrice(item);
  const stop = getNumber(item.stop);

  if (price == null || stop == null || price <= 0 || stop <= 0) return null;
  return ((price - stop) / price) * 100;
}

function inferMarketRegime(
  watchlist: WatchlistItem[],
  portfolio: PortfolioItem[]
): {
  value: string;
  tone: CommandIntelCard["tone"];
} {
  const items: Array<number> = [];

  for (const item of watchlist) {
    if (typeof item !== "string") {
      const signal =
        item.signal === "Bullish" ? 1 : item.signal === "Bearish" ? -1 : 0;
      items.push(signal);
    }
  }

  for (const item of portfolio) {
    const signal =
      item.signal === "Bullish" ? 1 : item.signal === "Bearish" ? -1 : 0;
    items.push(signal);
  }

  if (items.length === 0) {
    return { value: "Neutral", tone: "default" };
  }

  const score = items.reduce((sum, x) => sum + x, 0) / items.length;

  if (score >= 0.35) return { value: "Bullish", tone: "success" };
  if (score <= -0.35) return { value: "Risk Off", tone: "danger" };
  return { value: "Neutral", tone: "warn" };
}

function getPageKey(pathname: string): CommandBarContextIntel["pageKey"] {
  const path = pathname.toLowerCase();

  if (path === "/" || path.includes("/today")) return "today";
  if (path.includes("/watchlist")) return "watchlist";
  if (path.includes("/portfolio")) return "portfolio";
  if (path.includes("/stocks/")) return "stock";
  return "other";
}

function buildTodayCards(
  watchlist: WatchlistItem[],
  portfolio: PortfolioItem[]
): CommandIntelCard[] {
  let topSignalTicker = "—";
  let topSignalScore = -Infinity;

  for (const item of watchlist) {
    const ticker = getWatchlistTicker(item);
    if (!ticker) continue;

    const score = scoreWatchlistItem(item);
    if (score > topSignalScore) {
      topSignalScore = score;
      topSignalTicker = ticker;
    }
  }

  const regime = inferMarketRegime(watchlist, portfolio);

  let bestSetup = "—";
  let bestBreakoutDistance = Infinity;

  for (const item of watchlist) {
    const ticker = getWatchlistTicker(item);
    const distance = breakoutDistancePct(item);

    if (!ticker || distance == null) continue;
    if (distance >= 0 && distance < bestBreakoutDistance) {
      bestBreakoutDistance = distance;
      bestSetup = ticker;
    }
  }

  if (bestSetup === "—" && topSignalTicker !== "—") {
    bestSetup = topSignalTicker;
  }

  return [
    {
      label: "Top Signal",
      value: topSignalTicker,
      tone: "accent",
    },
    {
      label: "Market Regime",
      value: regime.value,
      tone: regime.tone,
    },
    {
      label: "Best Setup",
      value: bestSetup,
      tone: "success",
    },
  ];
}

function buildWatchlistCards(watchlist: WatchlistItem[]): CommandIntelCard[] {
  let biggestMoverTicker = "—";
  let biggestMoverPct: number | null = null;

  let strongestTicker = "—";
  let strongestScore = -Infinity;

  let breakoutTicker = "—";
  let smallestPositiveDistance = Infinity;

  for (const item of watchlist) {
    const ticker = getWatchlistTicker(item);
    if (!ticker) continue;

    if (typeof item !== "string") {
      const changePct = getNumber(item.changePercent);
      if (changePct != null) {
        if (biggestMoverPct == null || Math.abs(changePct) > Math.abs(biggestMoverPct)) {
          biggestMoverPct = changePct;
          biggestMoverTicker = ticker;
        }
      }

      const score = scoreWatchlistItem(item);
      if (score > strongestScore) {
        strongestScore = score;
        strongestTicker = ticker;
      }

      const distance = breakoutDistancePct(item);
      if (distance != null && distance >= 0 && distance < smallestPositiveDistance) {
        smallestPositiveDistance = distance;
        breakoutTicker = ticker;
      }
    }
  }

  return [
    {
      label: "Biggest Mover",
      value:
        biggestMoverTicker === "—"
          ? "—"
          : `${biggestMoverTicker} ${formatPct(biggestMoverPct)}`,
      tone:
        biggestMoverPct != null
          ? biggestMoverPct >= 0
            ? "success"
            : "danger"
          : "default",
    },
    {
      label: "Highest Conviction",
      value: strongestTicker,
      tone: "accent",
    },
    {
      label: "Breakout Candidate",
      value: breakoutTicker,
      tone: "success",
    },
  ];
}

function buildPortfolioCards(portfolio: PortfolioItem[]): CommandIntelCard[] {
  let biggestWinnerTicker = "—";
  let biggestWinnerPct = -Infinity;

  let riskTicker = "—";
  let smallestRiskDistance = Infinity;

  let largestPositionTicker = "—";
  let largestPositionValue = 0;

  for (const item of portfolio) {
    const ticker = getPortfolioTicker(item);
    if (!ticker) continue;

    const plPct = formatPLPct(item);
    if (plPct != null && plPct > biggestWinnerPct) {
      biggestWinnerPct = plPct;
      biggestWinnerTicker = ticker;
    }

    const riskDistance = riskDistancePct(item);
    if (riskDistance != null && riskDistance >= 0 && riskDistance < smallestRiskDistance) {
      smallestRiskDistance = riskDistance;
      riskTicker = ticker;
    }

    const marketValue = getPortfolioMarketValue(item);
    if (marketValue > largestPositionValue) {
      largestPositionValue = marketValue;
      largestPositionTicker = ticker;
    }
  }

  return [
    {
      label: "Biggest Winner",
      value:
        biggestWinnerTicker === "—"
          ? "—"
          : `${biggestWinnerTicker} ${formatPct(biggestWinnerPct)}`,
      tone: biggestWinnerTicker === "—" ? "default" : "success",
    },
    {
      label: "Risk Position",
      value: riskTicker,
      tone: riskTicker === "—" ? "default" : "danger",
    },
    {
      label: "Largest Position",
      value:
        largestPositionTicker === "—"
          ? "—"
          : `${largestPositionTicker} ${formatDollarCompact(largestPositionValue)}`,
      tone: "accent",
    },
  ];
}

function buildStockCards(
  pathname: string,
  watchlist: WatchlistItem[],
  portfolio: PortfolioItem[]
): CommandIntelCard[] {
  const parts = pathname.split("/");
  const tickerFromPath = normalizeTicker(parts[2] ?? "");

  const inWatchlist = watchlist.some(
    (item) => getWatchlistTicker(item) === tickerFromPath
  );

  const portfolioItem = portfolio.find(
    (item) => getPortfolioTicker(item) === tickerFromPath
  );

  const plPct = portfolioItem ? formatPLPct(portfolioItem) : null;
  const risk = portfolioItem ? riskDistancePct(portfolioItem) : null;

  return [
    {
      label: "Ticker",
      value: tickerFromPath || "—",
      tone: "accent",
    },
    {
      label: "Watchlist Status",
      value: inWatchlist ? "Tracked" : "Not Tracked",
      tone: inWatchlist ? "success" : "default",
    },
    {
      label: "Position Status",
      value:
        portfolioItem == null
          ? "No Position"
          : plPct == null
            ? "Held"
            : `Held ${formatPct(plPct)}`,
      tone:
        portfolioItem == null
          ? "default"
          : plPct != null && plPct < 0
            ? "danger"
            : "success",
    },
    {
      label: "Stop Distance",
      value: risk == null ? "—" : formatPct(risk),
      tone:
        risk == null
          ? "default"
          : risk <= 3
            ? "danger"
            : "warn",
    },
  ];
}

function readContextIntel(pathname: string): CommandBarContextIntel {
  const rawWatchlist = readAllStorageValues<WatchlistItem[]>(WATCHLIST_KEYS).flat();
  const rawPortfolio = readFirstStorageValue<PortfolioItem[]>(PORTFOLIO_KEYS) ?? [];

  const watchlist = dedupe(rawWatchlist, getWatchlistTicker).filter((item) =>
    Boolean(getWatchlistTicker(item))
  );

  const portfolio = dedupe(rawPortfolio, getPortfolioTicker).filter((item) =>
    Boolean(getPortfolioTicker(item))
  );

  const pageKey = getPageKey(pathname);

  if (pageKey === "today") {
    return {
      pageKey,
      title: "Today Intelligence",
      cards: buildTodayCards(watchlist, portfolio),
    };
  }

  if (pageKey === "watchlist") {
    return {
      pageKey,
      title: "Watchlist Intelligence",
      cards: buildWatchlistCards(watchlist),
    };
  }

  if (pageKey === "portfolio") {
    return {
      pageKey,
      title: "Portfolio Intelligence",
      cards: buildPortfolioCards(portfolio),
    };
  }

  if (pageKey === "stock") {
    return {
      pageKey,
      title: "Ticker Context",
      cards: buildStockCards(pathname, watchlist, portfolio),
    };
  }

  return {
    pageKey,
    title: "SignalOS Intelligence",
    cards: buildTodayCards(watchlist, portfolio),
  };
}

export function useCommandBarContextIntel(): CommandBarContextIntel {
  const pathname = usePathname();
  const [intel, setIntel] = useState<CommandBarContextIntel>(() =>
    readContextIntel(pathname || "/")
  );

  useEffect(() => {
    const sync = () => {
      setIntel(readContextIntel(pathname || "/"));
    };

    sync();

    const onStorage = () => sync();
    const onFocus = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    const onWatchlistUpdated = () => sync();
    const onPortfolioUpdated = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("signalos:watchlist-updated", onWatchlistUpdated);
    window.addEventListener("signalos:portfolio-updated", onPortfolioUpdated);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("signalos:watchlist-updated", onWatchlistUpdated);
      window.removeEventListener("signalos:portfolio-updated", onPortfolioUpdated);
    };
  }, [pathname]);

  return useMemo(() => intel, [intel]);
}