export type NewsHeaderMode = "market" | "context" | "personal";

export type SignalNewsItem = {
  id: string;
  headline: string;
  image?: string | null;
  summary?: string | null;
  url?: string | null;
  source?: string | null;
  author?: string | null;
  publishedAt: string;
  updatedAt?: string | null;
  tickers: string[];
  primaryTicker?: string | null;
  tags: string[];
  channels: string[];
  sentiment?: "positive" | "neutral" | "negative" | null;
  relevance?: number | null;
  kind: "news" | "wiim" | "press_release";
  importance?: number | null;
  isBreaking?: boolean;
};

export type ScoredHeaderNewsItem = SignalNewsItem & {
  headerScore: number;
  chip: string;
  ageLabel: string;
  whyMatters?: string | null;
  tone: "positive" | "neutral" | "negative";
};

export type ScoreNewsHeaderItemsInput = {
  items: SignalNewsItem[];
  mode: NewsHeaderMode;
  focusedTicker?: string;
  watchlistTickers?: string[];
  portfolioTickers?: string[];
  topSetupTickers?: string[];
  mostTradedTickers?: string[];
  now?: Date;
};

export type ScoreNewsItemInput = Omit<ScoreNewsHeaderItemsInput, "items">;

export type ScoreNewsHeaderItemsResult = {
  primary: ScoredHeaderNewsItem | null;
  secondary: ScoredHeaderNewsItem[];
  queue: ScoredHeaderNewsItem[];
};

const CHIP_PRIORITY = [
  "Breaking",
  "WIIM",
  "Earnings",
  "Guidance",
  "Analyst",
  "FDA",
  "M&A",
  "Offering",
  "Macro",
  "Press Release",
] as const;

function uniqUpper(values: string[] | undefined): string[] {
  return Array.from(
    new Set((values ?? []).map((v) => v.trim().toUpperCase()).filter(Boolean))
  );
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function minutesSince(publishedAt: string, now: Date): number {
  const published = parseDate(publishedAt);
  if (!published) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now.getTime() - published.getTime()) / 60000));
}

function formatAgeLabel(publishedAt: string, now: Date): string {
  const mins = minutesSince(publishedAt, now);
  if (!Number.isFinite(mins)) return "now";
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function recencyScore(publishedAt: string, now: Date): number {
  const mins = minutesSince(publishedAt, now);
  if (mins <= 5) return 35;
  if (mins <= 15) return 28;
  if (mins <= 30) return 20;
  if (mins <= 60) return 12;
  if (mins <= 240) return 6;
  if (mins <= 1440) return 0;
  return -8;
}

function stalePenalty(publishedAt: string, now: Date): number {
  const mins = minutesSince(publishedAt, now);
  if (mins > 1440) return 20;
  if (mins > 240) return 10;
  return 0;
}

function dedupeHeadlineKey(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveChip(item: SignalNewsItem): string {
  const haystack = `${item.headline} ${item.summary ?? ""} ${item.tags.join(" ")} ${item.channels.join(" ")}`.toLowerCase();

  if (item.isBreaking || haystack.includes("breaking")) return "Breaking";
  if (item.kind === "wiim" || item.channels.some((c) => c.toUpperCase() === "WIIM")) return "WIIM";
  if (haystack.includes("earnings")) return "Earnings";
  if (haystack.includes("guidance")) return "Guidance";
  if (
    haystack.includes("analyst") ||
    haystack.includes("upgrade") ||
    haystack.includes("downgrade") ||
    haystack.includes("price target")
  ) {
    return "Analyst";
  }
  if (haystack.includes("fda") || haystack.includes("phase 1") || haystack.includes("phase 2") || haystack.includes("phase 3")) {
    return "FDA";
  }
  if (
    haystack.includes("acquire") ||
    haystack.includes("acquisition") ||
    haystack.includes("merger") ||
    haystack.includes("m&a")
  ) {
    return "M&A";
  }
  if (
    haystack.includes("offering") ||
    haystack.includes("dilution") ||
    haystack.includes("secondary")
  ) {
    return "Offering";
  }
  if (
    haystack.includes("fed") ||
    haystack.includes("cpi") ||
    haystack.includes("ppi") ||
    haystack.includes("jobs report") ||
    haystack.includes("treasury") ||
    haystack.includes("inflation")
  ) {
    return "Macro";
  }
  if (item.kind === "press_release" || haystack.includes("press release")) return "Press Release";

  return "Breaking";
}

function catalystScore(item: SignalNewsItem): number {
  switch (deriveChip(item)) {
    case "Breaking":
      return 16;
    case "WIIM":
      return 18;
    case "Earnings":
      return 18;
    case "Guidance":
      return 17;
    case "Analyst":
      return 14;
    case "FDA":
      return 18;
    case "M&A":
      return 18;
    case "Offering":
      return 16;
    case "Macro":
      return 16;
    case "Press Release":
      return 8;
    default:
      return 0;
  }
}

function relevanceScore(
  item: SignalNewsItem,
  mode: NewsHeaderMode,
  focusedTicker?: string,
  watchlistTickers: string[] = [],
  portfolioTickers: string[] = [],
  topSetupTickers: string[] = [],
  mostTradedTickers: string[] = []
): number {
  let score = 0;
  const tickers = uniqUpper(item.tickers);
  const primary = (item.primaryTicker ?? tickers[0] ?? "").toUpperCase();

  if (focusedTicker && tickers.includes(focusedTicker)) score += 30;
  if (watchlistTickers.some((t) => tickers.includes(t))) score += 16;
  if (portfolioTickers.some((t) => tickers.includes(t))) score += 20;
  if (topSetupTickers.some((t) => tickers.includes(t))) score += 18;
  if (mostTradedTickers.some((t) => tickers.includes(t))) score += 14;

  if (mode === "context" && focusedTicker && primary === focusedTicker) score += 10;
  if (mode === "personal" && portfolioTickers.some((t) => tickers.includes(t))) score += 8;
  if (mode === "market" && deriveChip(item) === "Macro") score += 12;

  return score;
}

function marketImpactScore(item: SignalNewsItem): number {
  let score = 0;
  if (item.isBreaking) score += 12;
  if ((item.importance ?? 0) > 0) score += Math.min(12, item.importance ?? 0);
  if ((item.relevance ?? 0) > 0) score += Math.min(10, Math.round(item.relevance ?? 0));
  if (uniqUpper(item.tickers).length >= 3) score += 6;
  return score;
}

function freshnessBoost(item: SignalNewsItem, items: SignalNewsItem[], now: Date): number {
  const mins = minutesSince(item.publishedAt, now);
  if (mins > 20) return 0;

  const tickers = uniqUpper(item.tickers);
  if (tickers.length === 0) return 0;

  const sameTickerRecentCount = items.filter((other) => {
    if (other.id === item.id) return false;
    const otherMins = minutesSince(other.publishedAt, now);
    if (otherMins > 20) return false;
    const otherTickers = uniqUpper(other.tickers);
    return tickers.some((t) => otherTickers.includes(t));
  }).length;

  if (sameTickerRecentCount >= 2) return 12;
  if (sameTickerRecentCount >= 1) return 8;
  return 0;
}

function inferTone(item: SignalNewsItem): "positive" | "neutral" | "negative" {
  if (item.sentiment) return item.sentiment;

  const haystack = `${item.headline} ${item.summary ?? ""}`.toLowerCase();

  const negativeTerms = [
    "offering",
    "dilution",
    "downgrade",
    "lawsuit",
    "investigation",
    "misses",
    "cuts guidance",
    "fall",
    "falls",
    "plunges",
    "drops",
  ];

  const positiveTerms = [
    "upgrade",
    "beats",
    "raises guidance",
    "surges",
    "wins",
    "partnership",
    "approval",
    "contract",
    "acquire",
    "acquisition",
  ];

  if (negativeTerms.some((term) => haystack.includes(term))) return "negative";
  if (positiveTerms.some((term) => haystack.includes(term))) return "positive";
  return "neutral";
}

function whyMatters(
  item: SignalNewsItem,
  mode: NewsHeaderMode,
  focusedTicker?: string,
  watchlistTickers: string[] = [],
  portfolioTickers: string[] = [],
  topSetupTickers: string[] = []
): string | null {
  const tickers = uniqUpper(item.tickers);
  const chip = deriveChip(item);

  if (focusedTicker && tickers.includes(focusedTicker)) {
    return `Directly affects ${focusedTicker} on this page.`;
  }
  if (portfolioTickers.some((t) => tickers.includes(t))) {
    return "Affects a portfolio holding right now.";
  }
  if (watchlistTickers.some((t) => tickers.includes(t))) {
    return "Affects a watched name right now.";
  }
  if (topSetupTickers.some((t) => tickers.includes(t))) {
    return "Supports an active setup on your dashboard.";
  }
  if (mode === "market" && chip === "Macro") {
    return "Could move the broader tape, not just one stock.";
  }
  if (chip === "Offering" || chip === "Analyst" || chip === "FDA") {
    return `Fresh ${chip.toLowerCase()} catalyst that can change short-term risk or momentum.`;
  }
  if (chip === "WIIM") {
    return "Adds direct context for why the move is happening.";
  }
  return null;
}

function normalizeScoreNewsItemInput(input?: ScoreNewsItemInput) {
  return {
    now: input?.now ?? new Date(),
    mode: input?.mode ?? "market",
    focusedTicker: input?.focusedTicker?.trim().toUpperCase(),
    watchlistTickers: uniqUpper(input?.watchlistTickers),
    portfolioTickers: uniqUpper(input?.portfolioTickers),
    topSetupTickers: uniqUpper(input?.topSetupTickers),
    mostTradedTickers: uniqUpper(input?.mostTradedTickers),
  };
}

export function scoreNewsItem(
  item: SignalNewsItem,
  input?: ScoreNewsItemInput
): number {
  const normalized = normalizeScoreNewsItemInput(input);

  return (
    recencyScore(item.publishedAt, normalized.now) +
    relevanceScore(
      item,
      normalized.mode,
      normalized.focusedTicker,
      normalized.watchlistTickers,
      normalized.portfolioTickers,
      normalized.topSetupTickers,
      normalized.mostTradedTickers
    ) +
    catalystScore(item) +
    marketImpactScore(item) -
    stalePenalty(item.publishedAt, normalized.now)
  );
}

export function detectNewsImpact(
  item: SignalNewsItem,
  input?: ScoreNewsItemInput
): string {
  const score = scoreNewsItem(item, input);

  if (score >= 85) return "High";
  if (score >= 65) return "Medium";
  return "Low";
}

export function scoreNewsHeaderItems(
  input: ScoreNewsHeaderItemsInput
): ScoreNewsHeaderItemsResult {
  const now = input.now ?? new Date();
  const focusedTicker = input.focusedTicker?.trim().toUpperCase();
  const watchlistTickers = uniqUpper(input.watchlistTickers);
  const portfolioTickers = uniqUpper(input.portfolioTickers);
  const topSetupTickers = uniqUpper(input.topSetupTickers);
  const mostTradedTickers = uniqUpper(input.mostTradedTickers);

  const seenHeadlineKeys = new Map<string, number>();

  const scored = input.items
    .map((item) => {
      const chip = deriveChip(item);
      const headlineKey = dedupeHeadlineKey(item.headline);
      const duplicatePenalty = seenHeadlineKeys.has(headlineKey) ? 25 : 0;
      seenHeadlineKeys.set(headlineKey, (seenHeadlineKeys.get(headlineKey) ?? 0) + 1);

      const headerScore =
        scoreNewsItem(item, {
          mode: input.mode,
          focusedTicker,
          watchlistTickers,
          portfolioTickers,
          topSetupTickers,
          mostTradedTickers,
          now,
        }) +
        freshnessBoost(item, input.items, now) -
        duplicatePenalty -
        0;

      const scoredItem: ScoredHeaderNewsItem = {
        ...item,
        chip,
        ageLabel: formatAgeLabel(item.publishedAt, now),
        tone: inferTone(item),
        whyMatters: whyMatters(
          item,
          input.mode,
          focusedTicker,
          watchlistTickers,
          portfolioTickers,
          topSetupTickers
        ),
        headerScore,
      };

      return scoredItem;
    })
    .filter((item) => item.headerScore > 0)
    .sort((a, b) => {
      if (b.headerScore !== a.headerScore) return b.headerScore - a.headerScore;

      const chipRankA = CHIP_PRIORITY.indexOf(a.chip as (typeof CHIP_PRIORITY)[number]);
      const chipRankB = CHIP_PRIORITY.indexOf(b.chip as (typeof CHIP_PRIORITY)[number]);
      return chipRankA - chipRankB;
    });

  const primary = scored[0] ?? null;
  const secondary = scored.slice(1, 5);
  const queue = scored.slice(5);

  return { primary, secondary, queue };
}