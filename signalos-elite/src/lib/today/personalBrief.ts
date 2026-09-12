export type PersonalBriefWatchlistItem = {
  ticker: string;
  name?: string | null;
  changePercent?: number | null;
  catalystLabel?: string | null;
};

export type PersonalBriefPortfolioItem = {
  ticker: string;
  name?: string | null;
  changePercent?: number | null;
  price?: number | null;
  stopPrice?: number | null;
};

export type PersonalBriefSetup = {
  ticker: string;
  score?: number | null;
  direction?: "bullish" | "bearish" | "neutral";
};

export type PersonalBriefPriority = {
  ticker: string;
  name: string;
  changePercent: number | null;
  source: "watchlist" | "portfolio" | "market";
  status: "confirmed" | "pressure" | "watch";
  evidence: string;
  nextCondition: string;
};

export type TodayPersonalBrief = {
  title: string;
  summary: string;
  priorities: PersonalBriefPriority[];
  hasWatchlist: boolean;
  hasPortfolio: boolean;
};

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function toFiniteNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatMove(value: number | null): string | null {
  if (value == null) return null;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}% today`;
}

function getStopDistancePercent(
  price: number | null | undefined,
  stopPrice: number | null | undefined
): number | null {
  const resolvedPrice = toFiniteNumber(price);
  const resolvedStopPrice = toFiniteNumber(stopPrice);

  if (resolvedPrice == null || resolvedStopPrice == null || resolvedPrice <= 0 || resolvedStopPrice <= 0) {
    return null;
  }

  return ((resolvedPrice - resolvedStopPrice) / resolvedPrice) * 100;
}

function formatStopDistance(value: number | null): string | null {
  if (value == null) return null;

  if (value < 0) {
    return `${Math.abs(value).toFixed(1)}% below your recorded stop`;
  }

  return `${value.toFixed(1)}% above your recorded stop`;
}

function getPriorityStatus(
  direction: PersonalBriefSetup["direction"],
  changePercent: number | null,
  stopDistancePercent: number | null
): PersonalBriefPriority["status"] {
  if (stopDistancePercent != null && stopDistancePercent <= 3) {
    return "pressure";
  }

  if (direction === "bearish" || (direction !== "bullish" && (changePercent ?? 0) <= -2)) {
    return "pressure";
  }

  if (direction === "bullish" || (changePercent ?? 0) >= 2) {
    return "confirmed";
  }

  return "watch";
}

function buildPriority(options: {
  ticker: string;
  name?: string | null;
  changePercent?: number | null;
  catalystLabel?: string | null;
  price?: number | null;
  stopPrice?: number | null;
  source: PersonalBriefPriority["source"];
  setup?: PersonalBriefSetup;
}): PersonalBriefPriority {
  const ticker = normalizeTicker(options.ticker);
  const changePercent = toFiniteNumber(options.changePercent);
  const stopDistancePercent = getStopDistancePercent(options.price, options.stopPrice);
  const status = getPriorityStatus(options.setup?.direction, changePercent, stopDistancePercent);
  const move = formatMove(changePercent);
  const stopDistance = formatStopDistance(stopDistancePercent);
  const setupScore = toFiniteNumber(options.setup?.score);
  const scoreEvidence = setupScore != null ? `qualified setup score ${Math.round(setupScore)}` : null;
  const catalyst = options.catalystLabel?.trim() || null;

  const evidence =
    status === "confirmed"
      ? [stopDistance, move, scoreEvidence, catalyst].filter(Boolean).join(" | ") || "Current session strength"
      : status === "pressure"
        ? [stopDistance, move, scoreEvidence, catalyst].filter(Boolean).join(" | ") || "Current session weakness"
        : [stopDistance, move, catalyst].filter(Boolean).join(" | ") || "No confirmed setup change";

  const nextCondition =
    options.source === "portfolio" && status === "pressure" && stopDistancePercent != null
      ? "Review this holding against its recorded stop and position plan."
      : status === "confirmed"
      ? "Keep it in focus while bullish confirmation holds."
      : status === "pressure"
        ? "Wait for bearish pressure to clear before adding risk."
        : "Wait for a qualified setup or fresh catalyst before acting.";

  return {
    ticker,
    name: options.name?.trim() || ticker,
    changePercent,
    source: options.source,
    status,
    evidence,
    nextCondition,
  };
}

function priorityRank(status: PersonalBriefPriority["status"]): number {
  if (status === "pressure") return 3;
  if (status === "confirmed") return 2;
  return 1;
}

export function buildTodayPersonalBrief(options: {
  watchlist: PersonalBriefWatchlistItem[];
  portfolio?: PersonalBriefPortfolioItem[];
  setups: PersonalBriefSetup[];
}): TodayPersonalBrief {
  const setupsByTicker = new Map(
    options.setups.map((setup) => [normalizeTicker(setup.ticker), setup])
  );
  const watchlistItemsByTicker = new Map<string, PersonalBriefWatchlistItem>();

  for (const item of options.watchlist) {
    const ticker = normalizeTicker(item.ticker);
    if (ticker) {
      watchlistItemsByTicker.set(ticker, { ...item, ticker });
    }
  }

  const watchlistByTicker = new Map<string, PersonalBriefPriority>();

  for (const [ticker, item] of watchlistItemsByTicker) {
    watchlistByTicker.set(
      ticker,
      buildPriority({
        ...item,
        ticker,
        source: "watchlist",
        setup: setupsByTicker.get(ticker),
      })
    );
  }
  const portfolioPriorities = Array.from(
    new Map(
      (options.portfolio ?? [])
        .map((item) => {
          const ticker = normalizeTicker(item.ticker);
          if (!ticker) return null;

          const watchlistItem = watchlistItemsByTicker.get(ticker);
          return [
            ticker,
            buildPriority({
              ...item,
              ticker,
              name: item.name ?? watchlistItem?.name,
              changePercent: item.changePercent ?? watchlistItem?.changePercent,
              catalystLabel: watchlistItem?.catalystLabel,
              source: "portfolio",
              setup: setupsByTicker.get(ticker),
            }),
          ] as const;
        })
        .filter((entry): entry is readonly [string, PersonalBriefPriority] => entry != null)
    ).values()
  );
  const watchedPriorities = Array.from(watchlistByTicker.values())
    .filter((priority) => !portfolioPriorities.some((item) => item.ticker === priority.ticker));
  const personalPriorities = [...portfolioPriorities, ...watchedPriorities];

  const priorities = (personalPriorities.length
    ? personalPriorities
    : options.setups.slice(0, 3).map((setup) =>
        buildPriority({
          ticker: setup.ticker,
          source: "market",
          setup,
        })
      ))
    .sort((left, right) => {
      const rankDifference = priorityRank(right.status) - priorityRank(left.status);
      if (rankDifference !== 0) return rankDifference;
      return Math.abs(right.changePercent ?? 0) - Math.abs(left.changePercent ?? 0);
    })
    .slice(0, 3);

  const pressureCount = priorities.filter((priority) => priority.status === "pressure").length;
  const confirmedCount = priorities.filter((priority) => priority.status === "confirmed").length;
  const portfolioPressureCount = priorities.filter(
    (priority) => priority.source === "portfolio" && priority.status === "pressure"
  ).length;
  const hasWatchlist = watchlistByTicker.size > 0;
  const hasPortfolio = portfolioPriorities.length > 0;

  if (!personalPriorities.length) {
    return {
      title: priorities.length ? "Build your personal tape" : "No personal tape yet",
      summary: priorities.length
        ? "These are the strongest current setups until you save names to your watchlist."
        : "Save names to your watchlist and SigiOS will connect market changes to the stocks you follow.",
      priorities,
      hasWatchlist: false,
      hasPortfolio: false,
    };
  }

  if (portfolioPressureCount > 0) {
    return {
      title: "Your portfolio needs attention",
      summary: `${portfolioPressureCount} holding${portfolioPressureCount === 1 ? " is" : "s are"} near a recorded risk condition or showing confirmed pressure.`,
      priorities,
      hasWatchlist,
      hasPortfolio,
    };
  }

  if (pressureCount > 0 && confirmedCount > 0) {
    return {
      title: "Your saved list is split",
      summary: `${confirmedCount} saved name${confirmedCount === 1 ? " is" : "s are"} participating while ${pressureCount} need${pressureCount === 1 ? "s" : ""} tighter risk attention.`,
      priorities,
      hasWatchlist,
      hasPortfolio,
    };
  }

  if (pressureCount > 0) {
    return {
      title: "Your saved names need attention",
      summary: `${pressureCount} saved name${pressureCount === 1 ? " is" : "s are"} showing confirmed pressure or meaningful downside movement.`,
      priorities,
      hasWatchlist,
      hasPortfolio,
    };
  }

  if (confirmedCount > 0) {
    return {
      title: "Your saved names are participating",
      summary: `${confirmedCount} saved name${confirmedCount === 1 ? " is" : "s are"} showing current strength worth monitoring for follow-through.`,
      priorities,
      hasWatchlist,
      hasPortfolio,
    };
  }

  return {
    title: "Your saved names are quiet",
    summary: "No saved name has a confirmed change in setup yet. Stay patient and wait for evidence.",
    priorities,
    hasWatchlist,
    hasPortfolio,
  };
}