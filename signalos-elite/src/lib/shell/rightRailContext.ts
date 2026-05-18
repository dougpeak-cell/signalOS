"use client";

import { CRYPTO_PAGE_ATTACHMENTS } from "@/lib/crypto/catalog";
import type { RouteContext } from "@/lib/routing/useRouteContext";

type WatchlistItem =
  | string
  | {
      ticker?: string;
      symbol?: string;
      name?: string | null;
      theme?: string | null;
      sector?: string | null;
      conviction?: number | null;
      score?: number | null;
      signal?: string | null;
      target?: number | null;
      currentPrice?: number | null;
      price?: number | null;
      changePercent?: number | null;
    };

type PortfolioItem = {
  ticker?: string;
  symbol?: string;
  name?: string | null;
  theme?: string | null;
  sector?: string | null;
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
  signal?: string | null;
  conviction?: number | null;
  changePercent?: number | null;
};

export type RightRailStatusTone =
  | "default"
  | "accent"
  | "success"
  | "warn"
  | "danger";

export type RightRailItem = {
  label: string;
  value: string;
  detail?: string;
  meta?: string;
  tone?: RightRailStatusTone;
  href?: string;
  statusDot?: RightRailStatusTone;
  sparkline?: number[];
  ticker?: string;
};

export type RightRailSection = {
  title: string;
  items: RightRailItem[];
};

export type RightRailContextModel = {
  eyebrow: string;
  title: string;
  sections: RightRailSection[];
};

function buildShellItems(labels: string[]): RightRailItem[] {
  return labels.map((label) => ({
    label,
    value: "Loading…",
    tone: "default",
    statusDot: "default",
  }));
}

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
  "signalos.portfolio.holdings.v1",
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

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
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

function getWatchlistPrice(item: WatchlistItem): number | null {
  if (typeof item === "string") return null;
  return getNumber(item.currentPrice) ?? getNumber(item.price);
}

function getPortfolioPrice(item: PortfolioItem): number | null {
  return getNumber(item.currentPrice) ?? getNumber(item.price);
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

  const qty = getNumber(item.shares) ?? getNumber(item.quantity) ?? 0;
  const price = getPortfolioPrice(item);

  if (qty > 0 && price != null) return qty * price;
  return 0;
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

function getPLPct(item: PortfolioItem): number | null {
  const price = getPortfolioPrice(item);
  const avg = getPortfolioAvgCost(item);
  if (price == null || avg == null || avg <= 0) return null;
  return ((price - avg) / avg) * 100;
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatCompactDollar(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function scoreWatchlistItem(item: WatchlistItem): number {
  if (typeof item === "string") return 0;

  const conviction = getNumber(item.conviction) ?? 0;
  const score = getNumber(item.score) ?? 0;
  const change = getNumber(item.changePercent) ?? 0;

  const signalBoost =
    item.signal === "Bullish"
      ? 15
      : item.signal === "Neutral"
      ? 5
      : item.signal === "Bearish"
      ? -10
      : 0;

  return conviction * 10 + score + change + signalBoost;
}

function matchesContextLabel(
  itemValue: string | null | undefined,
  query: string
): boolean {
  const left = normalizeText(itemValue).toLowerCase();
  const right = normalizeText(query).toLowerCase();
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function readWatchlist(): WatchlistItem[] {
  const raw = readAllStorageValues<WatchlistItem[]>(WATCHLIST_KEYS).flat();
  return raw.filter((item) => Boolean(getWatchlistTicker(item)));
}

function readPortfolio(): PortfolioItem[] {
  const raw = readFirstStorageValue<PortfolioItem[]>(PORTFOLIO_KEYS) ?? [];
  return raw.filter((item) => Boolean(getPortfolioTicker(item)));
}

function buildPseudoSparkline(seed: string, bias: "up" | "flat" | "down" = "flat"): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }

  let value = 50;
  const points: number[] = [];

  for (let i = 0; i < 12; i += 1) {
    const drift = bias === "up" ? 1.2 : bias === "down" ? -1.2 : 0;
    const noise = ((hash % 9) - 4) * 0.6 + ((i % 3) - 1) * 0.8;
    value = Math.max(8, Math.min(92, value + drift + noise));
    points.push(Number(value.toFixed(2)));
    hash = (hash * 17 + 13) % 100000;
  }

  return points;
}

function toneFromSignal(signal: string | null | undefined): RightRailStatusTone {
  if (signal === "Bullish") return "success";
  if (signal === "Bearish") return "danger";
  if (signal === "Neutral") return "warn";
  return "default";
}

function buildTodayModel(
  route: Extract<RouteContext, { page: "today" }>
): RightRailContextModel {
  const watchlist = readWatchlist();
  const portfolio = readPortfolio();

  const sortedSignals = [...watchlist]
    .sort((a, b) => scoreWatchlistItem(b) - scoreWatchlistItem(a))
    .slice(0, 3);

  const riskItems = [...portfolio]
    .map((item) => ({
      ticker: getPortfolioTicker(item),
      dist: getDistanceToStopPct(getPortfolioPrice(item), getNumber(item.stop)),
    }))
    .filter((item) => Boolean(item.ticker))
    .sort((a, b) => (a.dist ?? Number.POSITIVE_INFINITY) - (b.dist ?? Number.POSITIVE_INFINITY))
    .slice(0, 3);

  const oppItems = [...watchlist]
    .map((item) => ({
      ticker: getWatchlistTicker(item),
      signal: typeof item === "string" ? null : item.signal,
      dist:
        typeof item === "string"
          ? null
          : getDistanceToTargetPct(getWatchlistPrice(item), getNumber(item.target)),
    }))
    .filter((item) => Boolean(item.ticker))
    .sort((a, b) => (a.dist ?? Number.POSITIVE_INFINITY) - (b.dist ?? Number.POSITIVE_INFINITY))
    .slice(0, 3);

  const regimeTitle =
    route.regime === "bullish"
      ? "Bullish Focus"
      : route.regime === "riskoff"
      ? "Risk-Off Focus"
      : route.regime === "neutral"
      ? "Neutral Focus"
      : "Today Context";

  return {
    eyebrow: "Right Rail",
    title: regimeTitle,
    sections: [
      {
        title: "Best Setups",
        items: sortedSignals.map((item) => ({
          label: getWatchlistTicker(item),
          ticker: getWatchlistTicker(item),
          value:
            typeof item === "string"
              ? "Tracked"
              : String(item.signal || "Tracked"),
          tone: "accent",
          statusDot:
            typeof item === "string" ? "default" : toneFromSignal(item.signal),
          sparkline: buildPseudoSparkline(
            getWatchlistTicker(item),
            typeof item !== "string" && item.signal === "Bullish"
              ? "up"
              : typeof item !== "string" && item.signal === "Bearish"
              ? "down"
              : "flat"
          ),
          href: `/stocks/${getWatchlistTicker(item)}?source=%2Ftoday`,
        })),
      },
      {
        title: "Risk Radar",
        items: riskItems.map((item) => ({
          label: item.ticker,
          ticker: item.ticker,
          value: `Stop ${formatPct(item.dist)}`,
          tone: item.dist != null && item.dist <= 3 ? "danger" : "warn",
          statusDot: item.dist != null && item.dist <= 3 ? "danger" : "warn",
          sparkline: buildPseudoSparkline(item.ticker, "down"),
          href: `/stocks/${item.ticker}?source=%2Ftoday&focus=portfolio&view=risk`,
        })),
      },
      {
        title: "Near Target",
        items: oppItems.map((item) => ({
          label: item.ticker,
          ticker: item.ticker,
          value: `Target ${formatPct(item.dist)}`,
          tone: "success",
          statusDot:
            item.dist != null && item.dist <= 5 ? "success" : toneFromSignal(item.signal),
          sparkline: buildPseudoSparkline(item.ticker, "up"),
          href: `/stocks/${item.ticker}?source=%2Ftoday`,
        })),
      },
    ],
  };
}

function buildWatchlistModel(
  route: Extract<RouteContext, { page: "watchlist" }>
): RightRailContextModel {
  const watchlist = readWatchlist();

  const opportunities = watchlist
    .map((item) => ({
      ticker: getWatchlistTicker(item),
      signal: typeof item === "string" ? null : item.signal,
      dist:
        typeof item === "string"
          ? null
          : getDistanceToTargetPct(getWatchlistPrice(item), getNumber(item.target)),
      score: scoreWatchlistItem(item),
    }))
    .filter((item) => Boolean(item.ticker))
    .sort((a, b) => {
      const distDiff =
        (a.dist ?? Number.POSITIVE_INFINITY) - (b.dist ?? Number.POSITIVE_INFINITY);
      if (distDiff !== 0) return distDiff;
      return b.score - a.score;
    })
    .slice(0, 5);

  const highestConviction = [...watchlist]
    .filter((item): item is Exclude<WatchlistItem, string> => typeof item !== "string")
    .sort(
      (a, b) =>
        (getNumber(b.conviction) ?? 0) - (getNumber(a.conviction) ?? 0)
    )
    .slice(0, 3);

  const breakoutCandidate = opportunities[0];

  return {
    eyebrow: "Watchlist Context",
    title: route.view === "opportunities" ? "Opportunities Mode" : "Watchlist Rail",
    sections: [
      {
        title: "Closest Targets",
        items: opportunities.map((item) => ({
          label: item.ticker,
          ticker: item.ticker,
          value: `Target ${formatPct(item.dist)}`,
          tone:
            item.dist != null && item.dist >= 0 && item.dist <= 5
              ? "success"
              : "default",
          statusDot:
            item.dist != null && item.dist <= 5 ? "success" : toneFromSignal(item.signal),
          sparkline: buildPseudoSparkline(item.ticker, "up"),
          href: `/stocks/${item.ticker}?source=%2Fwatchlist`,
        })),
      },
      {
        title: "Highest Conviction",
        items: highestConviction.map((item) => ({
          label: getWatchlistTicker(item),
          ticker: getWatchlistTicker(item),
          value: `Conv ${getNumber(item.conviction) ?? 0}`,
          tone: "accent",
          statusDot: toneFromSignal(item.signal),
          sparkline: buildPseudoSparkline(getWatchlistTicker(item), "up"),
          href: `/stocks/${getWatchlistTicker(item)}?source=%2Fwatchlist`,
        })),
      },
      {
        title: "Breakout Candidate",
        items: breakoutCandidate
          ? [
              {
                label: breakoutCandidate.ticker,
                ticker: breakoutCandidate.ticker,
                value: `Closest setup`,
                tone: "success" as const,
                statusDot: "success" as const,
                sparkline: buildPseudoSparkline(breakoutCandidate.ticker, "up"),
                href: `/stocks/${breakoutCandidate.ticker}?source=%2Fwatchlist`,
              },
            ]
          : [
              {
                label: "No candidate",
                value: "Add targets",
                tone: "default" as const,
                statusDot: "default" as const,
                href: "/watchlist",
              },
            ],
      },
    ],
  };
}

function buildPortfolioModel(
  route: Extract<RouteContext, { page: "portfolio" }>
): RightRailContextModel {
  const portfolio = readPortfolio();

  const riskNames = portfolio
    .map((item) => ({
      ticker: getPortfolioTicker(item),
      dist: getDistanceToStopPct(getPortfolioPrice(item), getNumber(item.stop)),
      pl: getPLPct(item),
      exposure: getPortfolioMarketValue(item),
    }))
    .filter((item) => Boolean(item.ticker))
    .sort((a, b) => {
      const riskDiff =
        (a.dist ?? Number.POSITIVE_INFINITY) - (b.dist ?? Number.POSITIVE_INFINITY);
      if (riskDiff !== 0) return riskDiff;
      return (a.pl ?? 0) - (b.pl ?? 0);
    })
    .slice(0, 5);

  const largestExposure = [...portfolio]
    .map((item) => ({
      ticker: getPortfolioTicker(item),
      exposure: getPortfolioMarketValue(item),
    }))
    .filter((item) => Boolean(item.ticker))
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 3);

  const biggestLosers = [...portfolio]
    .map((item) => ({
      ticker: getPortfolioTicker(item),
      pl: getPLPct(item),
    }))
    .filter((item) => Boolean(item.ticker))
    .sort((a, b) => (a.pl ?? Number.POSITIVE_INFINITY) - (b.pl ?? Number.POSITIVE_INFINITY))
    .slice(0, 3);

  return {
    eyebrow: "Portfolio Context",
    title: route.view === "risk" ? "Risk Mode" : "Portfolio Rail",
    sections: [
      {
        title: "Closest Stops",
        items: riskNames.map((item) => ({
          label: item.ticker,
          ticker: item.ticker,
          value: `${formatPct(item.dist)} · ${formatCompactDollar(item.exposure)}`,
          tone: item.dist != null && item.dist <= 3 ? "danger" : "warn",
          statusDot: item.dist != null && item.dist <= 3 ? "danger" : "warn",
          sparkline: buildPseudoSparkline(item.ticker, "down"),
          href: `/stocks/${item.ticker}?source=%2Fportfolio&focus=portfolio`,
        })),
      },
      {
        title: "Largest Exposure",
        items: largestExposure.map((item) => ({
          label: item.ticker,
          ticker: item.ticker,
          value: formatCompactDollar(item.exposure),
          tone: "accent",
          statusDot: "accent",
          sparkline: buildPseudoSparkline(item.ticker, "flat"),
          href: `/stocks/${item.ticker}?source=%2Fportfolio&focus=portfolio`,
        })),
      },
      {
        title: "Biggest Loser",
        items: biggestLosers.map((item) => ({
          label: item.ticker,
          ticker: item.ticker,
          value: formatPct(item.pl),
          tone:
            item.pl != null && item.pl < 0 ? "danger" : "default",
          statusDot:
            item.pl != null && item.pl < 0 ? "danger" : "default",
          sparkline: buildPseudoSparkline(item.ticker, item.pl != null && item.pl < 0 ? "down" : "flat"),
          href: `/stocks/${item.ticker}?source=%2Fportfolio&focus=portfolio`,
        })),
      },
    ],
  };
}

function buildScreenerModel(
  route: Extract<RouteContext, { page: "screener" }>
): RightRailContextModel {
  const watchlist = readWatchlist();

  const themed = watchlist
    .filter((item) =>
      typeof item !== "string" &&
      route.theme &&
      (matchesContextLabel(item.theme, route.theme) ||
        matchesContextLabel(item.sector, route.theme) ||
        matchesContextLabel(item.name, route.theme))
    )
    .sort((a, b) => scoreWatchlistItem(b) - scoreWatchlistItem(a))
    .slice(0, 5);

  const priority = themed.length
    ? themed
    : [...watchlist]
        .sort((a, b) => scoreWatchlistItem(b) - scoreWatchlistItem(a))
        .slice(0, 5);

  return {
    eyebrow: "Screener Context",
    title: route.theme ? `${route.theme} Leadership` : "Screener View",
    sections: [
      {
        title: "Priority Names",
        items: priority.map((item) => ({
          label: getWatchlistTicker(item),
          ticker: getWatchlistTicker(item),
          value:
            typeof item === "string"
              ? "Tracked"
              : String(item.signal || "Tracked"),
          tone: "accent",
          statusDot:
            typeof item === "string" ? "default" : toneFromSignal(item.signal),
          sparkline: buildPseudoSparkline(
            getWatchlistTicker(item),
            typeof item !== "string" && item.signal === "Bullish" ? "up" : "flat"
          ),
          href: `/stocks/${getWatchlistTicker(item)}?source=%2Fscreener`,
        })),
      },
      {
        title: "Quick Open",
        items: priority.slice(0, 3).map((item) => ({
          label: getWatchlistTicker(item),
          ticker: getWatchlistTicker(item),
          value: "Open chart",
          tone: "default",
          statusDot: "default",
          sparkline: buildPseudoSparkline(getWatchlistTicker(item), "flat"),
          href: `/stocks/${getWatchlistTicker(item)}?source=%2Fscreener`,
        })),
      },
    ],
  };
}

function buildExpertsModel(): RightRailContextModel {
  const watchlist = readWatchlist();

  const topIdeas = [...watchlist]
    .sort((a, b) => scoreWatchlistItem(b) - scoreWatchlistItem(a))
    .slice(0, 4);

  return {
    eyebrow: "Experts Context",
    title: "Analyst Flow",
    sections: [
      {
        title: "Top Conviction",
        items: topIdeas.map((item) => ({
          label: getWatchlistTicker(item),
          ticker: getWatchlistTicker(item),
          value:
            typeof item === "string"
              ? "Tracked"
              : String(item.signal || "Conviction"),
          tone: "accent",
          statusDot:
            typeof item === "string" ? "default" : toneFromSignal(item.signal),
          sparkline: buildPseudoSparkline(getWatchlistTicker(item), "up"),
          href: `/stocks/${getWatchlistTicker(item)}?source=%2Fexperts`,
        })),
      },
      {
        title: "Quick Access",
        items: [
          /* {
            label: "Experts",
            value: "Open rankings",
            tone: "default",
            statusDot: "default",
            href: "/experts",
          }, */
          {
            label: "Rankings",
            value: "View leaders",
            tone: "default",
            statusDot: "accent",
            href: "#sigi-analyst-leaders",
          },
        ],
      },
    ],
  };
}

function isActiveCryptoAttachment(
  route: Extract<RouteContext, { page: "crypto" }>,
  href: string
): boolean {
  if (href === "/crypto") return route.section === "front";
  return href.endsWith(`/${route.section}`);
}

function buildCryptoModel(
  route: Extract<RouteContext, { page: "crypto" }>
): RightRailContextModel {
  const boardActive = route.section === "front";
  const watchlistActive = route.section === "watchlist";
  const portfolioActive = route.section === "portfolio";

  return {
    eyebrow: "SigiOS",
    title: "Command Rail",
    sections: [
      {
        title: "Quick Access",
        items: [
          {
            label: "Crypto",
            value: "Main board",
            tone: boardActive ? "accent" : "default",
            statusDot: boardActive ? "accent" : "default",
            href: "/crypto",
          },
          {
            label: "Watchlist",
            value: "Tracked coins",
            tone: watchlistActive ? "accent" : "default",
            statusDot: watchlistActive ? "accent" : "default",
            href: "/crypto/watchlist",
          },
          {
            label: "Portfolio",
            value: "Holdings + P/L",
            tone: portfolioActive ? "accent" : "default",
            statusDot: portfolioActive ? "accent" : "default",
            href: "/crypto/portfolio",
          },
        ],
      },
      {
        title: "Page Attachments",
        items: CRYPTO_PAGE_ATTACHMENTS.map((item) => {
          const active = isActiveCryptoAttachment(route, item.href);

          return {
            label: item.label,
            value: item.value,
            tone: active ? "accent" : "default",
            statusDot: active ? "accent" : "default",
            href: item.href,
          };
        }),
      },
    ],
  };
}

function buildStockModel(
  route: Extract<RouteContext, { page: "stock" }>
): RightRailContextModel {
  const portfolio = readPortfolio();
  const watchlist = readWatchlist();

  const position = portfolio.find((item) => getPortfolioTicker(item) === route.ticker);
  const tracked = watchlist.some((item) => getWatchlistTicker(item) === route.ticker);

  const pl = position ? getPLPct(position) : null;
  const stopDist = position
    ? getDistanceToStopPct(getPortfolioPrice(position), getNumber(position.stop))
    : null;
  const targetDist = position
    ? getDistanceToTargetPct(getPortfolioPrice(position), getNumber(position.target))
    : null;

  return {
    eyebrow: "Ticker Context",
    title: route.focus === "portfolio" ? "Portfolio Position View" : route.ticker,
    sections: [
      {
        title: "Tracking",
        items: [
          {
            label: "Watchlist",
            value: tracked ? "Tracked" : "Not tracked",
            tone: tracked ? "success" : "default",
            statusDot: tracked ? "success" : "default",
            href: "/watchlist",
          },
          {
            label: "Position",
            value: position ? "Held" : "No position",
            tone: position ? "accent" : "default",
            statusDot: position ? "accent" : "default",
            href: "/portfolio",
          },
        ],
      },
      {
        title: "Risk / Target",
        items: [
          {
            label: "P/L",
            ticker: route.ticker,
            value: formatPct(pl),
            tone: pl != null && pl >= 0 ? "success" : pl != null ? "danger" : "default",
            statusDot: pl != null && pl >= 0 ? "success" : pl != null ? "danger" : "default",
            sparkline: buildPseudoSparkline(route.ticker, pl != null && pl < 0 ? "down" : "up"),
            href: `/stocks/${route.ticker}`,
          },
          {
            label: "Stop Dist",
            value: formatPct(stopDist),
            tone:
              stopDist != null && stopDist <= 3
                ? "danger"
                : stopDist != null
                ? "warn"
                : "default",
            statusDot:
              stopDist != null && stopDist <= 3
                ? "danger"
                : stopDist != null
                ? "warn"
                : "default",
            href: `/portfolio?view=risk&source=%2Fstocks`,
          },
          {
            label: "Target Dist",
            value: formatPct(targetDist),
            tone: "accent",
            statusDot: "accent",
            href: `/watchlist?view=opportunities&source=%2Fstocks`,
          },
        ],
      },
    ],
  };
}

export function buildRightRailShellModel(route: RouteContext): RightRailContextModel {
  if (route.page === "today") {
    return {
      eyebrow: "Right Rail",
      title: "Today Context",
      sections: [
        { title: "Best Setups", items: buildShellItems(["Signal", "Conviction", "Setup"]) },
        { title: "Risk Radar", items: buildShellItems(["Risk", "Stop", "Exposure"]) },
        { title: "Near Target", items: buildShellItems(["Target", "Momentum", "Trigger"]) },
      ],
    };
  }

  if (route.page === "watchlist") {
    return {
      eyebrow: "Watchlist Context",
      title: "Watchlist Rail",
      sections: [
        { title: "Closest Targets", items: buildShellItems(["Target", "Distance", "Priority"]) },
        { title: "Highest Conviction", items: buildShellItems(["Leader", "Conviction", "Bias"]) },
        { title: "Breakout Candidate", items: buildShellItems(["Candidate"]) },
      ],
    };
  }

  if (route.page === "portfolio") {
    return {
      eyebrow: "Portfolio Context",
      title: "Portfolio Rail",
      sections: [
        { title: "Closest Stops", items: buildShellItems(["Risk", "Stop", "Exposure"]) },
        { title: "Largest Exposure", items: buildShellItems(["Size", "Allocation", "Leader"]) },
        { title: "Biggest Loser", items: buildShellItems(["Drawdown", "P/L", "Pressure"]) },
      ],
    };
  }

  if (route.page === "screener") {
    return {
      eyebrow: "Screener Context",
      title: "Screener View",
      sections: [
        { title: "Priority Names", items: buildShellItems(["Leader", "Theme", "Bias"]) },
        { title: "Quick Open", items: buildShellItems(["Chart", "Flow", "Detail"]) },
      ],
    };
  }

  if (route.page === "stock") {
    return {
      eyebrow: "Ticker Context",
      title: route.ticker || "Ticker",
      sections: [
        { title: "Tracking", items: buildShellItems(["Watchlist", "Position"]) },
        { title: "Risk / Target", items: buildShellItems(["P/L", "Stop Dist", "Target Dist"]) },
      ],
    };
  }

  if (route.page === "experts") {
    return {
      eyebrow: "Experts Context",
      title: "Analyst Flow",
      sections: [
        { title: "Top Conviction", items: buildShellItems(["Idea", "Signal", "Follow-up"]) },
        { title: "Quick Access", items: buildShellItems(["Experts", "Rankings"]) },
      ],
    };
  }

  if (route.page === "crypto") {
    return {
      eyebrow: "SigiOS",
      title: "Command Rail",
      sections: [
        {
          title: "Quick Access",
          items: buildShellItems(["Crypto", "Watchlist", "Portfolio"]),
        },
        {
          title: "Page Attachments",
          items: buildShellItems(["Crypto", "News", "Meme", "DeFi", "RWA"]),
        },
      ],
    };
  }

  return {
    eyebrow: "SigiOS",
    title: "Command Rail",
    sections: [
      {
        title: "Quick Access",
        items: buildShellItems(["Today", "Watchlist", "Portfolio"]),
      },
    ],
  };
}

export function buildRightRailContextModel(route: RouteContext): RightRailContextModel {
  if (route.page === "today") return buildTodayModel(route);
  if (route.page === "watchlist") return buildWatchlistModel(route);
  if (route.page === "portfolio") return buildPortfolioModel(route);
  if (route.page === "screener") return buildScreenerModel(route);
  if (route.page === "stock") return buildStockModel(route);
  if (route.page === "experts") return buildExpertsModel();
  if (route.page === "crypto") return buildCryptoModel(route);

  return {
    eyebrow: "SigiOS",
    title: "Command Rail",
    sections: [
      {
        title: "Quick Access",
        items: [
          {
            label: "Today",
            value: "Front page",
            tone: "accent",
            statusDot: "accent",
            href: "/",
          },
          {
            label: "Watchlist",
            value: "Tracked names",
            tone: "default",
            statusDot: "default",
            href: "/watchlist",
          },
          {
            label: "Portfolio",
            value: "Risk + P/L",
            tone: "default",
            statusDot: "default",
            href: "/portfolio",
          },
        ],
      },
    ],
  };
}