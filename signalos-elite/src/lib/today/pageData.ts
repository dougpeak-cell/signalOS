import type { GlobalPulseTickerItem } from "@/components/today/GlobalPulseTicker";
import type { PortfolioItem, WatchlistItem } from "@/lib/intelligence/buildMarketIntel";
import { getStoredMarketContext } from "@/lib/intelligence/contextStore";
import { getMarketMovers, type MarketMoverRow } from "@/lib/market/movers";
import { fetchFreeTickerPulses } from "@/lib/news/fetchFreeTickerPulses";
import { fetchTopMarketNews, type NewsItem } from "@/lib/news";
import type { TickerNewsPulse } from "@/lib/news/tickerNewsPulse";
import { getCurrentMarketPhase, isPreMarketNow } from "@/lib/today/marketPhase";
import {
  rankSetupCandidates,
  type RankedSetupItem,
  type SetupDiscoveryCandidate,
} from "@/lib/today/setupDiscovery";
import { getSetupDiscoveryData, type SetupDiscoveryData } from "@/lib/today/setupDiscoveryData";

export type TodaySetupSession = "regular" | "pre";

export type TodayMostTradedRow = {
  ticker: string;
  name?: string;
  price?: number;
  changePercent?: number;
  volume?: number;
  rvol?: number;
  pulse?: TickerNewsPulse | null;
};

export type TodaySetupItem = RankedSetupItem & {
  pulse?: TickerNewsPulse | null;
};

export type TodayCommandCenterMoverRow = {
  ticker: string;
  name: string;
  price?: number | null;
  changePct?: number | null;
  changePercent?: number | null;
  rvol?: number | null;
  volume?: number | null;
};

export type TodayCommandCenterEarningsRow = {
  ticker: string;
  name: string;
  dateLabel: string;
  timing: string;
};

export type TodayCommandCenterNewsRow = {
  id: string;
  headline: string;
  source?: string;
  href?: string;
  tickers?: string[];
};

export type TodayWatchlistMoverRow = {
  ticker: string;
  name: string;
  price?: number | null;
  changePct?: number | null;
  pulse?: TickerNewsPulse | null;
};

export type TodaySectorHeatmapItem = {
  sector: string;
  averageChangePercent: number | null;
  averageScore: number;
  members: Array<{
    ticker: string;
    changePercent: number | null;
  }>;
};

export type TodayFeaturedMacroItem = {
  eyebrow: string;
  headline: string;
  summary: string;
  whyItMatters: string;
  tone: "bullish" | "neutral" | "bearish";
  affected: string[];
};

export type TodayOpportunityItem = {
  ticker: string;
  name: string;
  whyThisSetup: string;
  setupLabel: string | null;
  catalystLabel: string;
  changePercent: number | null;
  score: number;
};

export type TodayRiskItem = {
  ticker: string;
  name: string;
  riskLabel: string;
  whyThisSetup: string;
  changePercent: number | null;
  score: number;
};

export type TodayPageData = {
  defaultSetupSession: TodaySetupSession;
  topSetups: TodaySetupItem[];
  preMarketTopSetups: TodaySetupItem[];
  preMarketRawCandidateCount: number;
  emergingSetups: RankedSetupItem[];
  preMarketEmergingSetups: RankedSetupItem[];
  commandCenterGainers: TodayCommandCenterMoverRow[];
  commandCenterLosers: TodayCommandCenterMoverRow[];
  commandCenterEarnings: TodayCommandCenterEarningsRow[];
  commandCenterNews: TodayCommandCenterNewsRow[];
  trendingNews: TodayCommandCenterNewsRow[];
  watchlistMovers: TodayWatchlistMoverRow[];
  regularMostTradedRows: TodayMostTradedRow[];
  preMarketRows: TodayMostTradedRow[];
  sectorHeatmapItems: TodaySectorHeatmapItem[];
  globalPulseItems: GlobalPulseTickerItem[];
  featuredMacro: TodayFeaturedMacroItem;
  leadershipWatch: TodaySetupItem[];
  opportunities: TodayOpportunityItem[];
  risks: TodayRiskItem[];
};

async function withTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs = 1200
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function time<T>(label: string, promise: Promise<T>): Promise<T> {
  const start = Date.now();

  try {
    return await promise;
  } finally {
    console.log(`[Today timing] ${label}: ${Date.now() - start}ms`);
  }
}

const FALLBACK_GLOBAL_PULSE_ITEMS: GlobalPulseTickerItem[] = [
  {
    id: "fed-break",
    category: "Central Banks",
    headline: "Fed emergency meeting speculation lifts volatility expectations",
    tone: "bearish",
    breaking: true,
    tickers: ["SPY", "QQQ"],
    tags: ["Rates", "Volatility", "Macro"],
    href: "/news",
  },
  {
    id: "ai-1",
    category: "Tech Policy",
    headline: "AI infrastructure and export-policy headlines keep semiconductor leadership in focus",
    tone: "bullish",
    tickers: ["NVDA", "AMD", "AVGO"],
    tags: ["Semiconductors", "Cloud"],
    href: "/news",
  },
  {
    id: "dollar-1",
    category: "Macro",
    headline: "Dollar firmness keeps financial conditions tight as markets reassess risk appetite",
    tone: "neutral",
    tickers: ["AAPL", "META", "MSFT"],
    tags: ["Risk Assets", "FX"],
    href: "/news",
  },
];

const FALLBACK_FEATURED_MACRO: TodayFeaturedMacroItem = {
  eyebrow: "Global Market Pulse",
  headline: "World news is shaping today’s tape across rates, energy, AI policy, and growth expectations.",
  summary:
    "SigiOS translates macro and geopolitical developments into stock-specific context so your setups sit inside the broader market regime.",
  whyItMatters:
    "Rates, commodities, and policy headlines can change leadership quickly across semis, mega-cap tech, and cyclical risk assets.",
  tone: "neutral",
  affected: ["NVDA", "MSFT", "AMD", "AAPL", "META"],
};

const DEFAULT_EARNINGS_FOCUS_TICKERS = [
  "NVDA",
  "MSFT",
  "AAPL",
  "AMZN",
  "META",
  "GOOG",
  "TSLA",
  "AMD",
  "AVGO",
  "NFLX",
] as const;

type FmpEarningsCalendarRow = {
  symbol?: unknown;
  ticker?: unknown;
  company?: unknown;
  companyName?: unknown;
  name?: unknown;
  date?: unknown;
  publicationDate?: unknown;
  earningsDate?: unknown;
  reportedDate?: unknown;
  time?: unknown;
  when?: unknown;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeTicker(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getWatchlistTicker(item: WatchlistItem): string {
  if (typeof item === "string") return normalizeTicker(item);
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function getPortfolioTicker(item: PortfolioItem): string {
  if (typeof item === "string") return normalizeTicker(item);
  return normalizeTicker((item as { ticker?: unknown; symbol?: unknown }).ticker ?? (item as { symbol?: unknown }).symbol ?? "");
}

function getWatchlistName(item: WatchlistItem): string {
  if (typeof item === "string") return item.trim().toUpperCase();
  return String(item.name ?? item.ticker ?? item.symbol ?? "").trim() || getWatchlistTicker(item);
}

function getWatchlistPrice(item: WatchlistItem): number | null {
  if (typeof item === "string") return null;
  return toNumber(item.currentPrice) ?? toNumber(item.price);
}

function getWatchlistChangePercent(item: WatchlistItem): number | null {
  if (typeof item === "string") return null;
  return toNumber(item.changePercent);
}

function average(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function titleCaseCategory(category: NewsItem["category"]) {
  if (category === "ai") return "AI";
  if (category === "fed") return "Fed";
  if (category === "semis") return "Semiconductors";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function buildPulseItemsFromNews(items: NewsItem[]): GlobalPulseTickerItem[] {
  if (!items.length) return FALLBACK_GLOBAL_PULSE_ITEMS;

  return items.slice(0, 6).map((item) => ({
    id: item.id,
    category: titleCaseCategory(item.category),
    headline: item.headline,
    tone: item.tone,
    tickers: item.tickers.slice(0, 4),
    tags: [item.source, item.publishedAt, item.impact].filter(Boolean).slice(0, 3),
    href: item.url || "/news",
    breaking: item.importance >= 85,
  }));
}

function buildFeaturedMacroFromNews(items: NewsItem[]): TodayFeaturedMacroItem {
  const lead = items.find((item) => item.importance >= 70) ?? items[0];

  if (!lead) return FALLBACK_FEATURED_MACRO;

  const affected = Array.from(
    new Set(items.flatMap((item) => item.tickers.map((ticker) => ticker.toUpperCase())))
  ).slice(0, 5);

  return {
    eyebrow: "Global Market Pulse",
    headline: lead.headline,
    summary: lead.summary,
    whyItMatters: lead.whyItMatters || FALLBACK_FEATURED_MACRO.whyItMatters,
    tone: lead.tone,
    affected: affected.length ? affected : FALLBACK_FEATURED_MACRO.affected,
  };
}

function isUsefulTrendingNewsItem(item: NewsItem) {
  const combined = [item.headline, item.summary, item.whyItMatters]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const blockedSources = ["globenewswire", "accesswire", "pr newswire", "business wire"];
  const blockedPhrases = [
    "price target",
    "raises target",
    "lowers target",
    "initiates coverage",
    "maintains",
    "analyst",
  ];
  const allowPhrases = [
    "upgrade",
    "downgrade",
    "beat",
    "miss",
    "forecast",
    "revenue",
    "ceo",
    "leadership",
    "partnership",
    "launch",
  ];

  const source = String(item.source ?? "").toLowerCase();
  const hasBlockedPhrase = blockedPhrases.some((phrase) => combined.includes(phrase));
  const isBlockedSource = blockedSources.some((name) => source.includes(name));
  const hasAllowPhrase = allowPhrases.some((phrase) => combined.includes(phrase));

  if (hasBlockedPhrase) return false;
  if (isBlockedSource && !hasAllowPhrase) return false;

  return true;
}

function getNewsSourceScore(item: NewsItem) {
  const source = String(item.source ?? "").toLowerCase();

  if (source.includes("benzinga")) return 5;
  if (source.includes("reuters")) return 5;
  if (source.includes("associated press")) return 4;
  if (source.includes("marketwatch")) return 4;
  if (source.includes("motley fool")) return 3;
  if (source.includes("investing.com")) return 3;
  if (source.includes("globenewswire")) return 1;
  if (source.includes("accesswire")) return 1;
  return 2;
}

function toCommandCenterMoverRow(row: {
  ticker: string;
  name?: string | null;
  price?: number | null;
  changePct?: number | null;
  changePercent?: number | null;
  rvol?: number | null;
  volume?: number | null;
}): TodayCommandCenterMoverRow {
  return {
    ticker: row.ticker,
    name: String(row.name ?? row.ticker).trim() || row.ticker,
    price: row.price ?? null,
    changePct: row.changePct ?? row.changePercent ?? null,
    changePercent: row.changePercent ?? row.changePct ?? null,
    rvol: row.rvol ?? null,
    volume: row.volume ?? null,
  };
}

function toMostTradedRow(candidate: SetupDiscoveryCandidate): TodayMostTradedRow {
  return {
    ticker: candidate.ticker,
    name: candidate.name ?? candidate.ticker,
    price: toNumber(candidate.price) ?? undefined,
    changePercent: toNumber(candidate.changePercent) ?? undefined,
    volume: toNumber(candidate.volume) ?? undefined,
    rvol: toNumber(candidate.rvol) ?? undefined,
    pulse: null,
  };
}

function buildRegularMostTradedRows(candidates: SetupDiscoveryCandidate[]): TodayMostTradedRow[] {
  return [...candidates]
    .filter((candidate) => (toNumber(candidate.price) ?? 0) >= 2)
    .filter((candidate) => (toNumber(candidate.volume) ?? 0) >= 250_000)
    .sort((left, right) => {
      const volumeGap = (toNumber(right.volume) ?? 0) - (toNumber(left.volume) ?? 0);
      if (volumeGap !== 0) return volumeGap;

      const rvolGap = (toNumber(right.rvol) ?? 0) - (toNumber(left.rvol) ?? 0);
      if (rvolGap !== 0) return rvolGap;

      return Math.abs(toNumber(right.changePercent) ?? 0) - Math.abs(toNumber(left.changePercent) ?? 0);
    })
    .slice(0, 10)
    .map(toMostTradedRow);
}

function buildPreMarketRows(candidates: SetupDiscoveryCandidate[]): TodayMostTradedRow[] {
  return [...candidates]
    .filter((candidate) => (toNumber(candidate.price) ?? 0) >= 1)
    .filter(
      (candidate) =>
        (toNumber(candidate.volume) ?? 0) >= 25_000 &&
        Math.abs(toNumber(candidate.changePercent) ?? 0) >= 1
    )
    .sort((left, right) => {
      const rightScore =
        Math.abs(toNumber(right.changePercent) ?? 0) * 10 +
        (toNumber(right.rvol) ?? 0) * 8 +
        (toNumber(right.volume) ?? 0) / 1_000_000;
      const leftScore =
        Math.abs(toNumber(left.changePercent) ?? 0) * 10 +
        (toNumber(left.rvol) ?? 0) * 8 +
        (toNumber(left.volume) ?? 0) / 1_000_000;

      return rightScore - leftScore;
    })
    .slice(0, 10)
    .map(toMostTradedRow);
}

function buildCommandCenterGainers(
  marketMovers: { gainers: MarketMoverRow[] },
  setupDiscovery: SetupDiscoveryData
): TodayCommandCenterMoverRow[] {
  if (marketMovers.gainers.length) {
    return marketMovers.gainers.slice(0, 5).map((row) => toCommandCenterMoverRow(row));
  }

  return setupDiscovery.top.slice(0, 5).map((item) =>
    toCommandCenterMoverRow({
      ticker: item.ticker,
      name: item.name,
      price: item.price,
      changePercent: item.changePercent,
      rvol: item.rvol,
      volume: item.volume,
    })
  );
}

function buildCommandCenterLosers(
  marketMovers: { losers: MarketMoverRow[] },
  setupDiscovery: SetupDiscoveryData
): TodayCommandCenterMoverRow[] {
  if (marketMovers.losers.length) {
    return marketMovers.losers.slice(0, 5).map((row) => toCommandCenterMoverRow(row));
  }

  return setupDiscovery.candidates
    .filter((candidate) => (toNumber(candidate.changePercent) ?? 0) < 0)
    .sort(
      (left, right) =>
        Math.abs(toNumber(right.changePercent) ?? 0) -
        Math.abs(toNumber(left.changePercent) ?? 0)
    )
    .slice(0, 5)
    .map((candidate) =>
      toCommandCenterMoverRow({
        ticker: candidate.ticker,
        name: candidate.name,
        price: toNumber(candidate.price),
        changePercent: toNumber(candidate.changePercent),
        rvol: toNumber(candidate.rvol),
        volume: toNumber(candidate.volume),
      })
    );
}

function buildCommandCenterEarnings(): TodayCommandCenterEarningsRow[] {
  return [];
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function normalizeCalendarDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function formatCalendarDateLabel(value: string): string {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function normalizeEarningsTiming(value: unknown): string {
  if (typeof value !== "string") return "Earnings";

  const normalized = value.trim().toLowerCase();

  if (!normalized) return "Earnings";
  if (["amc", "after market close", "after close", "after-hours"].includes(normalized)) {
    return "AMC";
  }
  if (["bmo", "before market open", "before open", "pre-market"].includes(normalized)) {
    return "BMO";
  }

  return "Earnings";
}

function normalizeEarningsCalendarRow(
  candidate: unknown
): (TodayCommandCenterEarningsRow & { sortDate: string }) | null {
  if (!candidate || typeof candidate !== "object") return null;

  const row = candidate as FmpEarningsCalendarRow;
  const ticker = normalizeTicker(row.symbol ?? row.ticker ?? "");
  const sortDate = normalizeCalendarDate(
    row.date ?? row.publicationDate ?? row.earningsDate ?? row.reportedDate ?? null
  );

  if (!ticker || !sortDate) return null;

  const nameCandidate = [row.company, row.companyName, row.name].find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  return {
    ticker,
    name: typeof nameCandidate === "string" ? nameCandidate.trim() : ticker,
    dateLabel: formatCalendarDateLabel(sortDate),
    timing: normalizeEarningsTiming(row.time ?? row.when ?? null),
    sortDate,
  };
}

async function fetchUpcomingEarnings(
  candidateTickers: string[]
): Promise<TodayCommandCenterEarningsRow[]> {
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) return [];

  const today = new Date();
  const fromDate = formatIsoDate(today);
  const toDate = formatIsoDate(addDays(today, 21));
  const prioritizedTickers = new Set(
    [...candidateTickers, ...DEFAULT_EARNINGS_FOCUS_TICKERS]
      .map((ticker) => normalizeTicker(ticker))
      .filter(Boolean)
  );

  const urls = [
    `https://financialmodelingprep.com/stable/earnings-calendar?from=${fromDate}&to=${toDate}&apikey=${apiKey}`,
    `https://financialmodelingprep.com/api/v3/earning_calendar?from=${fromDate}&to=${toDate}&apikey=${apiKey}`,
  ];

  let calendarRows: unknown[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;

      const payload = await response.json();
      if (Array.isArray(payload) && payload.length > 0) {
        calendarRows = payload;
        break;
      }
    } catch {
      // Try the next known endpoint shape.
    }
  }

  if (!calendarRows.length) return [];

  const normalizedRows = Array.from(
    new Map(
      calendarRows
        .map((row) => normalizeEarningsCalendarRow(row))
        .filter((row): row is TodayCommandCenterEarningsRow & { sortDate: string } => row != null)
        .filter((row) => row.sortDate >= fromDate)
        .sort((left, right) => {
          if (left.sortDate !== right.sortDate) {
            return left.sortDate.localeCompare(right.sortDate);
          }
          return left.ticker.localeCompare(right.ticker);
        })
        .map((row) => [row.ticker, row])
    ).values()
  );

  const prioritizedRows = normalizedRows.filter((row) => prioritizedTickers.has(row.ticker));
  const selectedRows = (prioritizedRows.length > 0 ? prioritizedRows : normalizedRows)
    .slice(0, 4)
    .map(({ sortDate: _sortDate, ...row }) => row);

  return selectedRows;
}

function buildCommandCenterNews(items: NewsItem[]): TodayCommandCenterNewsRow[] {
  const filteredTrendingNews = items
    .filter(isUsefulTrendingNewsItem)
    .sort((left, right) => getNewsSourceScore(right) - getNewsSourceScore(left))
    .slice(0, 4);

  const visibleTrendingNews = filteredTrendingNews.length > 0 ? filteredTrendingNews : items.slice(0, 4);

  return visibleTrendingNews.map((item) => ({
    id: item.id,
    headline: item.headline,
    source: item.source,
    href: item.url || "/news",
    tickers: item.tickers,
  }));
}

function enrichSetupItemsWithPulse(
  items: RankedSetupItem[],
  pulseMap: Record<string, TickerNewsPulse>
): TodaySetupItem[] {
  return items.map((item) => ({
    ...item,
    pulse: pulseMap[item.ticker] ?? null,
  }));
}

function enrichMostTradedRowsWithPulse(
  rows: TodayMostTradedRow[],
  pulseMap: Record<string, TickerNewsPulse>
): TodayMostTradedRow[] {
  return rows.map((row) => ({
    ...row,
    pulse: pulseMap[row.ticker] ?? null,
  }));
}

function buildWatchlistMovers(
  watchlist: WatchlistItem[],
  pulseMap: Record<string, TickerNewsPulse>
): TodayWatchlistMoverRow[] {
  return watchlist
    .map((item) => {
      const ticker = getWatchlistTicker(item);

      return {
        ticker,
        name: getWatchlistName(item),
        price: getWatchlistPrice(item),
        changePct: getWatchlistChangePercent(item),
        pulse: pulseMap[ticker] ?? null,
      };
    })
    .filter((item) => Boolean(item.ticker))
    .sort((left, right) => Math.abs(right.changePct ?? 0) - Math.abs(left.changePct ?? 0))
    .slice(0, 4);
}

function buildSectorHeatmapItems(candidates: SetupDiscoveryCandidate[]): TodaySectorHeatmapItem[] {
  const grouped = new Map<string, SetupDiscoveryCandidate[]>();

  for (const candidate of candidates) {
    const sector = String(candidate.sector ?? "").trim();
    if (!sector) continue;
    const bucket = grouped.get(sector) ?? [];
    bucket.push(candidate);
    grouped.set(sector, bucket);
  }

  return [...grouped.entries()]
    .map(([sector, rows]) => ({
      sector,
      averageChangePercent: average(rows.map((row) => toNumber(row.changePercent))),
      averageScore: average(rows.map((row) => toNumber(row.score) ?? toNumber(row.technicalScore))) ?? 0,
      members: [...rows]
        .sort((left, right) => {
          const rightStrength =
            Math.abs(toNumber(right.changePercent) ?? 0) + (toNumber(right.score) ?? 0) / 50;
          const leftStrength =
            Math.abs(toNumber(left.changePercent) ?? 0) + (toNumber(left.score) ?? 0) / 50;
          return rightStrength - leftStrength;
        })
        .slice(0, 3)
        .map((row) => ({
          ticker: row.ticker,
          changePercent: toNumber(row.changePercent),
        })),
    }))
    .sort((left, right) => {
      const rightStrength = Math.abs(right.averageChangePercent ?? 0) + right.averageScore / 50;
      const leftStrength = Math.abs(left.averageChangePercent ?? 0) + left.averageScore / 50;
      return rightStrength - leftStrength;
    })
    .slice(0, 8);
}

function buildLeadershipWatch(
  setupDiscovery: SetupDiscoveryData,
  pulseMap: Record<string, TickerNewsPulse>
): TodaySetupItem[] {
  return [...setupDiscovery.top, ...setupDiscovery.emerging]
    .filter(
      (item, index, collection) =>
        collection.findIndex((candidate) => candidate.ticker === item.ticker) === index
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      pulse: pulseMap[item.ticker] ?? null,
    }));
}

function isPreMarketActiveCandidate(candidate: SetupDiscoveryCandidate): boolean {
  const price = toNumber(candidate.price) ?? 0;
  const volume = toNumber(candidate.volume) ?? 0;
  const move = Math.abs(toNumber(candidate.changePercent) ?? 0);

  return price >= 1 && volume >= 25_000 && move >= 1;
}

function isPreMarketEmergingCandidate(candidate: SetupDiscoveryCandidate): boolean {
  const price = toNumber(candidate.price) ?? 0;
  const volume = toNumber(candidate.volume) ?? 0;
  const avgVolume = toNumber(candidate.avgVolume) ?? 0;
  const move = Math.abs(toNumber(candidate.changePercent) ?? 0);
  const rvol = toNumber(candidate.rvol) ?? 0;
  const hasCatalyst = Boolean(
    candidate.hasNews || candidate.hasEarnings || candidate.hasAnalystAction || candidate.hasSectorTailwind
  );

  return (
    price >= 1 &&
    volume >= 100_000 &&
    avgVolume >= 50_000 &&
    (move >= 0.5 || rvol >= 1.25 || hasCatalyst)
  );
}

export function countPreMarketQualifiedCandidates(setupDiscovery: SetupDiscoveryData): number {
  return setupDiscovery.candidates.filter((candidate) => isPreMarketActiveCandidate(candidate)).length;
}

export function buildPreMarketTopSetups(setupDiscovery: SetupDiscoveryData): RankedSetupItem[] {
  return rankSetupCandidates(
    setupDiscovery.candidates.filter((candidate) => isPreMarketActiveCandidate(candidate)),
    "top"
  ).slice(0, 6);
}

export function buildPreMarketEmergingSetups(
  setupDiscovery: SetupDiscoveryData
): RankedSetupItem[] {
  const topTickers = new Set(buildPreMarketTopSetups(setupDiscovery).map((item) => item.ticker));

  return rankSetupCandidates(
    setupDiscovery.candidates.filter((candidate) => {
      return isPreMarketEmergingCandidate(candidate) && !topTickers.has(candidate.ticker);
    }),
    "emerging"
  ).slice(0, 6);
}

function buildOpportunities(setupDiscovery: SetupDiscoveryData): TodayOpportunityItem[] {
  return [...setupDiscovery.top, ...setupDiscovery.emerging]
    .filter((item) => item.bias !== "bearish")
    .filter(
      (item, index, collection) =>
        collection.findIndex((candidate) => candidate.ticker === item.ticker) === index
    )
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return Math.abs(toNumber(right.changePercent) ?? 0) - Math.abs(toNumber(left.changePercent) ?? 0);
    })
    .slice(0, 4)
    .map((item) => ({
      ticker: item.ticker,
      name: item.name,
      whyThisSetup: item.whyThisSetup,
      setupLabel: item.setupLabel,
      catalystLabel: item.catalystLabel,
      changePercent: toNumber(item.changePercent),
      score: item.score,
    }));
}

function buildRisks(setupDiscovery: SetupDiscoveryData): TodayRiskItem[] {
  const rankedBearish = [...setupDiscovery.top, ...setupDiscovery.emerging]
    .filter((item) => item.bias === "bearish")
    .filter(
      (item, index, collection) =>
        collection.findIndex((candidate) => candidate.ticker === item.ticker) === index
    );

  const fallbackBearish = setupDiscovery.candidates
    .filter((candidate) => String(candidate.signal ?? "").toLowerCase().includes("bear"))
    .sort((left, right) => {
      const rightStrength =
        Math.abs(toNumber(right.changePercent) ?? 0) + (toNumber(right.score) ?? 0) / 50;
      const leftStrength =
        Math.abs(toNumber(left.changePercent) ?? 0) + (toNumber(left.score) ?? 0) / 50;
      return rightStrength - leftStrength;
    })
    .map((candidate) => ({
      ticker: candidate.ticker,
      name: candidate.name ?? candidate.ticker,
      riskLabel: candidate.setupLabel ?? "Bearish pressure",
      whyThisSetup: candidate.reason ?? candidate.summary ?? "Relative weakness and downside pressure are building.",
      changePercent: toNumber(candidate.changePercent),
      score: Math.round(toNumber(candidate.score) ?? toNumber(candidate.technicalScore) ?? 50),
    }));

  const merged = [
    ...rankedBearish.map((item) => ({
      ticker: item.ticker,
      name: item.name,
      riskLabel: item.structureLabel || item.catalystLabel || "Bearish pressure",
      whyThisSetup: item.whyThisSetup,
      changePercent: toNumber(item.changePercent),
      score: item.score,
    })),
    ...fallbackBearish,
  ];

  return merged
    .filter(
      (item, index, collection) =>
        collection.findIndex((candidate) => candidate.ticker === item.ticker) === index
    )
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return Math.abs(right.changePercent ?? 0) - Math.abs(left.changePercent ?? 0);
    })
    .slice(0, 4);
}

export async function getTodayPageData(): Promise<TodayPageData> {
  const [setupDiscovery, marketNews, marketMovers, storedMarketContext] = await Promise.all([
    time(
      "setupDiscovery",
      getSetupDiscoveryData({
        signalLimit: 80,
        setupUniverseLimit: 40,
      })
    ),
    time(
      "marketNews",
      withTimeout(fetchTopMarketNews({ limit: 8, lookbackHours: 24 }), [])
    ),
    time("marketMovers", getMarketMovers()),
    time("storedMarketContext", getStoredMarketContext()),
  ]);

  const defaultSetupSession: TodaySetupSession = isPreMarketNow() ? "pre" : "regular";

  const [
    preMarketTopSetups,
    preMarketEmergingSetups,
    regularMostTradedRows,
    preMarketRows,
    trendingNews,
  ] = await Promise.all([
    time(
      "preMarketTopSetups",
      Promise.resolve().then(() => buildPreMarketTopSetups(setupDiscovery))
    ),
    time(
      "preMarketEmergingSetups",
      Promise.resolve().then(() => buildPreMarketEmergingSetups(setupDiscovery))
    ),
    time(
      "regularMostTradedRows",
      Promise.resolve().then(() => buildRegularMostTradedRows(setupDiscovery.candidates))
    ),
    time(
      "preMarketRows",
      Promise.resolve().then(() => buildPreMarketRows(setupDiscovery.candidates))
    ),
    time(
      "trendingNews",
      Promise.resolve().then(() => buildCommandCenterNews(marketNews))
    ),
  ]);

  const preMarketRawCandidateCount = countPreMarketQualifiedCandidates(setupDiscovery);

  const pulseTickers = Array.from(
    new Set([
      ...setupDiscovery.top.slice(0, 6).map((item) => item.ticker),
      ...preMarketTopSetups.slice(0, 6).map((item) => item.ticker),
      ...regularMostTradedRows.slice(0, 10).map((row) => row.ticker),
      ...preMarketRows.slice(0, 10).map((row) => row.ticker),
      ...setupDiscovery.emerging.slice(0, 5).map((item) => item.ticker),
      ...storedMarketContext.watchlist.slice(0, 8).map(getWatchlistTicker),
    ])
  );

  const [
    pulseMap,
    commandCenterGainers,
    commandCenterLosers,
    commandCenterEarnings,
    sectorHeatmapItems,
    globalPulseItems,
    featuredMacro,
    opportunities,
    risks,
  ] = await Promise.all([
    time(
      "tickerPulses",
      withTimeout(
        fetchFreeTickerPulses(pulseTickers, {
          maxAgeHours: 12,
        }),
        {}
      )
    ),
    time(
      "commandCenterGainers",
      Promise.resolve().then(() => buildCommandCenterGainers(marketMovers, setupDiscovery))
    ),
    time(
      "commandCenterLosers",
      Promise.resolve().then(() => buildCommandCenterLosers(marketMovers, setupDiscovery))
    ),
    time(
      "commandCenterEarnings",
      withTimeout(
        fetchUpcomingEarnings(
          Array.from(
            new Set([
              ...storedMarketContext.watchlist.slice(0, 8).map(getWatchlistTicker),
              ...storedMarketContext.portfolio.slice(0, 8).map(getPortfolioTicker),
              ...setupDiscovery.top.slice(0, 8).map((item) => item.ticker),
              ...setupDiscovery.emerging.slice(0, 6).map((item) => item.ticker),
              ...preMarketTopSetups.slice(0, 6).map((item) => item.ticker),
              ...regularMostTradedRows.slice(0, 6).map((row) => row.ticker),
              ...preMarketRows.slice(0, 6).map((row) => row.ticker),
            ])
          )
        ),
        []
      )
    ),
    time(
      "sectorHeatmapItems",
      Promise.resolve().then(() => buildSectorHeatmapItems(setupDiscovery.candidates))
    ),
    time(
      "globalPulseItems",
      Promise.resolve().then(() => buildPulseItemsFromNews(marketNews))
    ),
    time(
      "featuredMacro",
      Promise.resolve().then(() => buildFeaturedMacroFromNews(marketNews))
    ),
    time(
      "opportunities",
      Promise.resolve().then(() => buildOpportunities(setupDiscovery))
    ),
    time(
      "risks",
      Promise.resolve().then(() => buildRisks(setupDiscovery))
    ),
  ]);

  const [
    topSetups,
    enrichedPreMarketTopSetups,
    watchlistMovers,
    regularMostTradedRowsWithPulse,
    preMarketRowsWithPulse,
    leadershipWatch,
  ] = await Promise.all([
    time(
      "topSetups",
      Promise.resolve().then(() => enrichSetupItemsWithPulse(setupDiscovery.top, pulseMap))
    ),
    time(
      "preMarketTopSetupsWithPulse",
      Promise.resolve().then(() => enrichSetupItemsWithPulse(preMarketTopSetups, pulseMap))
    ),
    time(
      "watchlistMovers",
      Promise.resolve().then(() => buildWatchlistMovers(storedMarketContext.watchlist, pulseMap))
    ),
    time(
      "regularMostTradedRowsWithPulse",
      Promise.resolve().then(() => enrichMostTradedRowsWithPulse(regularMostTradedRows, pulseMap))
    ),
    time(
      "preMarketRowsWithPulse",
      Promise.resolve().then(() => enrichMostTradedRowsWithPulse(preMarketRows, pulseMap))
    ),
    time(
      "leadershipWatch",
      Promise.resolve().then(() => buildLeadershipWatch(setupDiscovery, pulseMap))
    ),
  ]);

  return {
    defaultSetupSession,
    topSetups,
    preMarketTopSetups: enrichedPreMarketTopSetups,
    preMarketRawCandidateCount,
    emergingSetups: setupDiscovery.emerging,
    preMarketEmergingSetups,
    commandCenterGainers,
    commandCenterLosers,
    commandCenterEarnings,
    commandCenterNews: trendingNews,
    trendingNews,
    watchlistMovers,
    regularMostTradedRows: regularMostTradedRowsWithPulse,
    preMarketRows: preMarketRowsWithPulse,
    sectorHeatmapItems,
    globalPulseItems,
    featuredMacro,
    leadershipWatch,
    opportunities,
    risks,
  };
}