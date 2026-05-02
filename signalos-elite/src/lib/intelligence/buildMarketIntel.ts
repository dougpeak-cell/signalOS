export type WatchlistItem =
  | string
  | {
      ticker?: string;
      symbol?: string;
      conviction?: number | null;
      score?: number | null;
      masterScore?: number | null;
      signal?: string | null;
      target?: number | null;
      currentPrice?: number | null;
      price?: number | null;
      changePercent?: number | null;
      theme?: string | null;
      sector?: string | null;
      name?: string | null;
    };

export type PortfolioItem = {
  ticker?: string;
  symbol?: string;
  stop?: number | null;
  target?: number | null;
  currentPrice?: number | null;
  price?: number | null;
  signal?: string | null;
  shares?: number | null;
  quantity?: number | null;
  avgCost?: number | null;
  averageCost?: number | null;
  entryPrice?: number | null;
  costBasis?: number | null;
  marketValue?: number | null;
};

export type QuoteSnapshot = {
  ticker: string;
  price?: number | null;
  currentPrice?: number | null;
  changePercent?: number | null;
  updatedAt?: number | null;
};

export type QuoteMap = Record<string, QuoteSnapshot>;

export type MarketIntelSnapshot = {
  regime: "Bullish" | "Neutral" | "Risk Off";
  regimeReason: string;
  bullishCount: number;
  bearishCount: number;

  topSignal: string;
  topSignalReason: string;
  topSignalScore: number | null;
  topSignalConviction: number | null;
  topSignalChangePercent: number | null;

  bestSetup: string;
  bestSetupReason: string;
  bestSetupScore: number | null;
  bestSetupConviction: number | null;
  bestSetupTargetDistancePct: number | null;

  mover: string;
  moverReason: string;
  moverChangePercent: number | null;
  moverConviction: number | null;

  riskName: string;
  riskNameReason: string;
  riskDistanceToStopPct: number | null;
  riskPlPct: number | null;

  updatedAt: number;
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

function getWatchlistTicker(item: WatchlistItem): string {
  if (typeof item === "string") return normalizeTicker(item);
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function getPortfolioTicker(item: PortfolioItem): string {
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function getQuoteValue(
  ticker: string,
  quotes: QuoteMap,
  field: "price" | "currentPrice" | "changePercent"
): number | null {
  const key = normalizeTicker(ticker);
  if (!key) return null;
  const row = quotes[key];
  if (!row) return null;
  return getNumber(row[field]);
}

function getWatchlistPrice(item: WatchlistItem, quotes: QuoteMap): number | null {
  if (typeof item === "string") {
    const ticker = normalizeTicker(item);
    return (
      getQuoteValue(ticker, quotes, "currentPrice") ??
      getQuoteValue(ticker, quotes, "price")
    );
  }

  const ticker = getWatchlistTicker(item);

  return (
    getQuoteValue(ticker, quotes, "currentPrice") ??
    getQuoteValue(ticker, quotes, "price") ??
    getNumber(item.currentPrice) ??
    getNumber(item.price)
  );
}

function getWatchlistChangePercent(
  item: WatchlistItem,
  quotes: QuoteMap
): number | null {
  if (typeof item === "string") {
    return getQuoteValue(normalizeTicker(item), quotes, "changePercent");
  }

  const ticker = getWatchlistTicker(item);

  return (
    getQuoteValue(ticker, quotes, "changePercent") ??
    getNumber(item.changePercent)
  );
}

function getWatchlistStoredScore(item: WatchlistItem): number | null {
  if (typeof item === "string") return null;
  return getNumber(item.masterScore) ?? getNumber(item.score);
}

function getPortfolioPrice(item: PortfolioItem, quotes: QuoteMap): number | null {
  const ticker = getPortfolioTicker(item);

  return (
    getQuoteValue(ticker, quotes, "currentPrice") ??
    getQuoteValue(ticker, quotes, "price") ??
    getNumber(item.currentPrice) ??
    getNumber(item.price)
  );
}

function getPortfolioAvgCost(item: PortfolioItem): number | null {
  return (
    getNumber(item.avgCost) ??
    getNumber(item.averageCost) ??
    getNumber(item.entryPrice) ??
    getNumber(item.costBasis)
  );
}

function getDistanceToTargetPct(
  price: number | null,
  target: number | null
): number | null {
  if (price == null || target == null || price <= 0 || target <= 0) return null;
  return ((target - price) / price) * 100;
}

function getDistanceToStopPct(
  price: number | null,
  stop: number | null
): number | null {
  if (price == null || stop == null || price <= 0 || stop <= 0) return null;
  return ((price - stop) / price) * 100;
}

function getPortfolioPLPct(item: PortfolioItem, quotes: QuoteMap): number | null {
  const price = getPortfolioPrice(item, quotes);
  const avg = getPortfolioAvgCost(item);
  if (price == null || avg == null || avg <= 0) return null;
  return ((price - avg) / avg) * 100;
}

function scoreWatchlistItem(item: WatchlistItem, quotes: QuoteMap): number {
  if (typeof item === "string") return 0;

  const conviction = getNumber(item.conviction) ?? 0;
  const score = getWatchlistStoredScore(item) ?? 0;
  const change = getWatchlistChangePercent(item, quotes) ?? 0;

  const signalBoost =
    item.signal === "Bullish"
      ? 15
      : item.signal === "Neutral"
      ? 5
      : item.signal === "Bearish"
      ? -10
      : 0;

  const targetDistance = getDistanceToTargetPct(
    getWatchlistPrice(item, quotes),
    getNumber(item.target)
  );

  const targetBoost =
    targetDistance != null && targetDistance >= 0 && targetDistance <= 10
      ? 10 - targetDistance
      : 0;

  return conviction * 10 + score + change + signalBoost + targetBoost;
}

function inferMarketRegime(
  watchlist: WatchlistItem[],
  portfolio: PortfolioItem[]
): "Bullish" | "Neutral" | "Risk Off" {
  const votes: number[] = [];

  for (const item of watchlist) {
    if (typeof item === "string") continue;
    votes.push(
      item.signal === "Bullish" ? 1 : item.signal === "Bearish" ? -1 : 0
    );
  }

  for (const item of portfolio) {
    votes.push(
      item.signal === "Bullish" ? 1 : item.signal === "Bearish" ? -1 : 0
    );
  }

  if (!votes.length) return "Neutral";

  const avg = votes.reduce((sum, v) => sum + v, 0) / votes.length;

  if (avg >= 0.35) return "Bullish";
  if (avg <= -0.35) return "Risk Off";
  return "Neutral";
}

function buildRegimeReason(
  regime: "Bullish" | "Neutral" | "Risk Off",
  watchlist: WatchlistItem[],
  portfolio: PortfolioItem[]
): string {
  const watchSignals = watchlist.filter(
    (item): item is Exclude<WatchlistItem, string> => typeof item !== "string"
  );

  const bullCount = watchSignals.filter((item) => item.signal === "Bullish").length;
  const bearCount = watchSignals.filter((item) => item.signal === "Bearish").length;

  if (regime === "Bullish") {
    return `Bullish signals are leading (${bullCount} bullish vs ${bearCount} bearish) across watchlist and portfolio context.`;
  }

  if (regime === "Risk Off") {
    return `Defensive tone is dominating (${bearCount} bearish vs ${bullCount} bullish), so risk is elevated.`;
  }

  return `Signals are mixed, so the market regime is balanced rather than clearly risk-on or risk-off.`;
}

function getRegimeCounts(watchlist: WatchlistItem[]) {
  const watchSignals = watchlist.filter(
    (item): item is Exclude<WatchlistItem, string> => typeof item !== "string"
  );

  return {
    bullishCount: watchSignals.filter((item) => item.signal === "Bullish").length,
    bearishCount: watchSignals.filter((item) => item.signal === "Bearish").length,
  };
}

function pickTopSignal(watchlist: WatchlistItem[], quotes: QuoteMap) {
  return [...watchlist]
    .filter((item): item is Exclude<WatchlistItem, string> => typeof item !== "string")
    .sort((a, b) => scoreWatchlistItem(b, quotes) - scoreWatchlistItem(a, quotes))[0];
}

function buildTopSignalReason(
  item: Exclude<WatchlistItem, string> | undefined,
  quotes: QuoteMap
): string {
  if (!item) return "No qualified signal is available yet.";

  const conviction = getNumber(item.conviction) ?? 0;
  const score = getWatchlistStoredScore(item) ?? 0;
  const change = getWatchlistChangePercent(item, quotes) ?? 0;

  return `Highest composite strength from conviction (${conviction}), score (${score}), and live move (${change.toFixed(2)}%).`;
}

function pickBestSetup(watchlist: WatchlistItem[], quotes: QuoteMap) {
  return [...watchlist]
    .filter((item): item is Exclude<WatchlistItem, string> => typeof item !== "string")
    .sort((a, b) => {
      const aDist = getDistanceToTargetPct(
        getWatchlistPrice(a, quotes),
        getNumber(a.target)
      );
      const bDist = getDistanceToTargetPct(
        getWatchlistPrice(b, quotes),
        getNumber(b.target)
      );

      const aSafe = aDist == null || aDist < 0 ? Number.POSITIVE_INFINITY : aDist;
      const bSafe = bDist == null || bDist < 0 ? Number.POSITIVE_INFINITY : bDist;

      if (aSafe !== bSafe) return aSafe - bSafe;
      return scoreWatchlistItem(b, quotes) - scoreWatchlistItem(a, quotes);
    })[0];
}

function buildBestSetupReason(
  item: Exclude<WatchlistItem, string> | undefined,
  quotes: QuoteMap
): string {
  if (!item) return "No setup is close enough to target yet.";

  const distance = getDistanceToTargetPct(
    getWatchlistPrice(item, quotes),
    getNumber(item.target)
  );

  if (distance == null) {
    return "This setup ranks well on strength, even though target distance is not available.";
  }

  return `Best balance of quality and target proximity, sitting ${distance.toFixed(2)}% from target.`;
}

function pickMover(watchlist: WatchlistItem[], quotes: QuoteMap) {
  return [...watchlist]
    .filter((item): item is Exclude<WatchlistItem, string> => typeof item !== "string")
    .sort(
      (a, b) =>
        Math.abs(getWatchlistChangePercent(b, quotes) ?? 0) -
        Math.abs(getWatchlistChangePercent(a, quotes) ?? 0)
    )[0];
}

function buildMoverReason(
  item: Exclude<WatchlistItem, string> | undefined,
  quotes: QuoteMap
): string {
  if (!item) return "No significant mover is available yet.";

  const change = getWatchlistChangePercent(item, quotes);

  if (change == null) {
    return "Selected as the most active watchlist name, but live percent change is unavailable.";
  }

  return `Largest meaningful live percentage move on the watchlist at ${change.toFixed(2)}%.`;
}

function pickRiskName(portfolio: PortfolioItem[], quotes: QuoteMap) {
  return [...portfolio].sort((a, b) => {
    const aDist = getDistanceToStopPct(
      getPortfolioPrice(a, quotes),
      getNumber(a.stop)
    );
    const bDist = getDistanceToStopPct(
      getPortfolioPrice(b, quotes),
      getNumber(b.stop)
    );

    const aSafe = aDist == null ? Number.POSITIVE_INFINITY : aDist;
    const bSafe = bDist == null ? Number.POSITIVE_INFINITY : bDist;

    return aSafe - bSafe;
  })[0];
}

function buildRiskNameReason(item: PortfolioItem | undefined, quotes: QuoteMap): string {
  if (!item) return "No held risk name is available yet.";

  const distance = getDistanceToStopPct(
    getPortfolioPrice(item, quotes),
    getNumber(item.stop)
  );

  const pl = getPortfolioPLPct(item, quotes);

  if (distance == null && pl == null) {
    return "This holding is the current risk focus based on available portfolio data.";
  }

  if (distance != null && pl != null) {
    return `Closest held name to stop at ${distance.toFixed(2)}% above stop, with live P/L at ${pl.toFixed(2)}%.`;
  }

  if (distance != null) {
    return `Closest held name to stop at ${distance.toFixed(2)}% above stop.`;
  }

  return `Current risk focus based on live P/L of ${pl?.toFixed(2)}%.`;
}

export function buildMarketIntel(args: {
  watchlist: WatchlistItem[];
  portfolio: PortfolioItem[];
  quotes: QuoteMap;
}): MarketIntelSnapshot {
  const watchlist = args.watchlist ?? [];
  const portfolio = args.portfolio ?? [];
  const quotes = args.quotes ?? {};

  const regime = inferMarketRegime(watchlist, portfolio);

  const topSignalItem = pickTopSignal(watchlist, quotes);
  const bestSetupItem = pickBestSetup(watchlist, quotes);
  const moverItem = pickMover(watchlist, quotes);
  const riskItem = pickRiskName(portfolio, quotes);

  const topSignal = topSignalItem ? getWatchlistTicker(topSignalItem) : "—";
  const bestSetup = bestSetupItem ? getWatchlistTicker(bestSetupItem) : "—";
  const mover = moverItem ? getWatchlistTicker(moverItem) : "—";
  const riskName = riskItem ? getPortfolioTicker(riskItem) : "—";
  const { bullishCount, bearishCount } = getRegimeCounts(watchlist);
  const bestSetupTargetDistancePct = bestSetupItem
    ? getDistanceToTargetPct(
        getWatchlistPrice(bestSetupItem, quotes),
        getNumber(bestSetupItem.target)
      )
    : null;
  const riskDistanceToStopPct = riskItem
    ? getDistanceToStopPct(
        getPortfolioPrice(riskItem, quotes),
        getNumber(riskItem.stop)
      )
    : null;
  const riskPlPct = riskItem ? getPortfolioPLPct(riskItem, quotes) : null;

  return {
    regime,
    regimeReason: buildRegimeReason(regime, watchlist, portfolio),
    bullishCount,
    bearishCount,

    topSignal,
    topSignalReason: buildTopSignalReason(topSignalItem, quotes),
    topSignalScore: topSignalItem ? getWatchlistStoredScore(topSignalItem) : null,
    topSignalConviction: topSignalItem ? getNumber(topSignalItem.conviction) : null,
    topSignalChangePercent: topSignalItem ? getWatchlistChangePercent(topSignalItem, quotes) : null,

    bestSetup,
    bestSetupReason: buildBestSetupReason(bestSetupItem, quotes),
    bestSetupScore: bestSetupItem ? getWatchlistStoredScore(bestSetupItem) : null,
    bestSetupConviction: bestSetupItem ? getNumber(bestSetupItem.conviction) : null,
    bestSetupTargetDistancePct,

    mover,
    moverReason: buildMoverReason(moverItem, quotes),
    moverChangePercent: moverItem ? getWatchlistChangePercent(moverItem, quotes) : null,
    moverConviction: moverItem ? getNumber(moverItem.conviction) : null,

    riskName,
    riskNameReason: buildRiskNameReason(riskItem, quotes),
    riskDistanceToStopPct,
    riskPlPct,

    updatedAt: Date.now(),
  };
}