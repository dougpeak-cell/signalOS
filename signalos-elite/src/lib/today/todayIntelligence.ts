export type TodayLiveSignalItem = {
  ticker: string;
  name?: string | null;
  sector?: string | null;
  theme?: string | null;
  signal?: "Bullish" | "Neutral" | "Bearish" | string | null;
  conviction?: number | null;
  score?: number | null;
  target?: number | null;
  price?: number | null;
  currentPrice?: number | null;
  changePercent?: number | null;
};

export type TodayLivePortfolioItem = {
  ticker: string;
  name?: string | null;
  sector?: string | null;
  theme?: string | null;
  shares?: number | null;
  quantity?: number | null;
  avgCost?: number | null;
  averageCost?: number | null;
  entryPrice?: number | null;
  costBasis?: number | null;
  currentPrice?: number | null;
  price?: number | null;
  marketValue?: number | null;
  stop?: number | null;
  target?: number | null;
  signal?: "Bullish" | "Neutral" | "Bearish" | string | null;
  conviction?: number | null;
  changePercent?: number | null;
};

export type TodayLiveMarketStats = {
  bullishCount?: number | null;
  bearishCount?: number | null;
  neutralCount?: number | null;
  breadthLabel?: string | null;
  regime?: "Bullish" | "Neutral" | "Risk Off" | string | null;
};

export type TodayLiveIntelligenceInput = {
  signals?: TodayLiveSignalItem[];
  leadershipSignals?: TodayLiveSignalItem[];
  portfolio?: TodayLivePortfolioItem[];
  marketStats?: TodayLiveMarketStats | null;
};

export type TodayUnifiedWatchlistItem = {
  ticker: string;
  name?: string | null;
  sector?: string | null;
  theme?: string | null;
  signal?: "Bullish" | "Neutral" | "Bearish" | string | null;
  conviction?: number | null;
  score?: number | null;
  target?: number | null;
  currentPrice?: number | null;
  price?: number | null;
  changePercent?: number | null;
};

export type TodayUnifiedPortfolioItem = {
  ticker: string;
  name?: string | null;
  sector?: string | null;
  theme?: string | null;
  shares?: number | null;
  quantity?: number | null;
  avgCost?: number | null;
  averageCost?: number | null;
  entryPrice?: number | null;
  costBasis?: number | null;
  currentPrice?: number | null;
  price?: number | null;
  marketValue?: number | null;
  stop?: number | null;
  target?: number | null;
  signal?: "Bullish" | "Neutral" | "Bearish" | string | null;
  conviction?: number | null;
  changePercent?: number | null;
};

export type TodayMergedIntelligence = {
  watchlist: TodayUnifiedWatchlistItem[];
  portfolio: TodayUnifiedPortfolioItem[];
  marketStats: TodayLiveMarketStats | null;
};

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

function toUnifiedWatchlistItem(input: unknown): TodayUnifiedWatchlistItem | null {
  if (typeof input === "string") {
    const ticker = normalizeTicker(input);
    if (!ticker) return null;
    return { ticker };
  }

  if (!input || typeof input !== "object") return null;

  const item = input as Record<string, unknown>;
  const ticker = normalizeTicker(item.ticker ?? item.symbol ?? "");

  if (!ticker) return null;

  return {
    ticker,
    name: typeof item.name === "string" ? item.name : null,
    sector: typeof item.sector === "string" ? item.sector : null,
    theme: typeof item.theme === "string" ? item.theme : null,
    signal: typeof item.signal === "string" ? item.signal : null,
    conviction: getNumber(item.conviction),
    score: getNumber(item.score),
    target: getNumber(item.target),
    currentPrice: getNumber(item.currentPrice),
    price: getNumber(item.price),
    changePercent: getNumber(item.changePercent),
  };
}

function toUnifiedPortfolioItem(input: unknown): TodayUnifiedPortfolioItem | null {
  if (!input || typeof input !== "object") return null;

  const item = input as Record<string, unknown>;
  const ticker = normalizeTicker(item.ticker ?? item.symbol ?? "");

  if (!ticker) return null;

  return {
    ticker,
    name: typeof item.name === "string" ? item.name : null,
    sector: typeof item.sector === "string" ? item.sector : null,
    theme: typeof item.theme === "string" ? item.theme : null,
    shares: getNumber(item.shares),
    quantity: getNumber(item.quantity),
    avgCost: getNumber(item.avgCost),
    averageCost: getNumber(item.averageCost),
    entryPrice: getNumber(item.entryPrice),
    costBasis: getNumber(item.costBasis),
    currentPrice: getNumber(item.currentPrice),
    price: getNumber(item.price),
    marketValue: getNumber(item.marketValue),
    stop: getNumber(item.stop),
    target: getNumber(item.target),
    signal: typeof item.signal === "string" ? item.signal : null,
    conviction: getNumber(item.conviction),
    changePercent: getNumber(item.changePercent),
  };
}

function mergeDefined<T extends object>(base: T, incoming: Partial<T>): T {
  const next = { ...base };

  for (const [key, value] of Object.entries(incoming)) {
    if (value !== null && value !== undefined && value !== "") {
      (next as Record<string, unknown>)[key] = value;
    }
  }

  return next;
}

export function mergeLiveAndStoredIntelligence(args: {
  live?: TodayLiveIntelligenceInput | null;
  storedWatchlist?: unknown[];
  storedPortfolio?: unknown[];
}): TodayMergedIntelligence {
  const liveSignals = args.live?.signals ?? [];
  const livePortfolio = args.live?.portfolio ?? [];
  const marketStats = args.live?.marketStats ?? null;

  const storedWatchlist = (args.storedWatchlist ?? [])
    .map(toUnifiedWatchlistItem)
    .filter((item): item is TodayUnifiedWatchlistItem => Boolean(item));

  const storedPortfolio = (args.storedPortfolio ?? [])
    .map(toUnifiedPortfolioItem)
    .filter((item): item is TodayUnifiedPortfolioItem => Boolean(item));

  const watchlistMap = new Map<string, TodayUnifiedWatchlistItem>();
  const portfolioMap = new Map<string, TodayUnifiedPortfolioItem>();

  for (const item of storedWatchlist) {
    watchlistMap.set(item.ticker, item);
  }

  for (const item of storedPortfolio) {
    portfolioMap.set(item.ticker, item);
  }

  for (const item of liveSignals) {
    const unified = toUnifiedWatchlistItem(item);
    if (!unified) continue;

    const existing = watchlistMap.get(unified.ticker);
    watchlistMap.set(
      unified.ticker,
      existing ? mergeDefined(existing, unified) : unified
    );
  }

  for (const item of livePortfolio) {
    const unified = toUnifiedPortfolioItem(item);
    if (!unified) continue;

    const existing = portfolioMap.get(unified.ticker);
    portfolioMap.set(
      unified.ticker,
      existing ? mergeDefined(existing, unified) : unified
    );
  }

  return {
    watchlist: Array.from(watchlistMap.values()),
    portfolio: Array.from(portfolioMap.values()),
    marketStats,
  };
}