import type { SignalNewsItem } from "@/lib/news/scoreNewsHeaderItems";

export type TickerNewsPulse = {
  ticker: string;
  freshCount: number;
  newestAgeLabel: string | null;
  topLabel: string | null;
  headline: string;
  tone: "positive" | "neutral" | "negative";
  hasBreaking: boolean;
  href?: string | null;
};

export type TickerNewsPulseOptions = {
  maxAgeHours?: number;
};

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

export const DEFAULT_TICKER_PULSE_MAX_AGE_HOURS = 24;

function buildNewsCatalystLabel(item: SignalNewsItem): string {
  const haystack = `${item.headline} ${item.summary ?? ""} ${item.tags.join(" ")} ${item.channels.join(" ")}`.toLowerCase();

  if (item.kind === "wiim") return "Why moving";
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
  if (haystack.includes("offering") || haystack.includes("dilution") || haystack.includes("secondary")) {
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
  if (item.kind === "press_release" || haystack.includes("press release")) {
    return "Press Release";
  }

  return "News";
}

function formatNewsAgeLabel(input: string): string {
  const published = new Date(input).getTime();
  const now = Date.now();

  if (Number.isNaN(published)) return "Unknown time";

  const diffMs = Math.max(0, now - published);
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function sortTickerNews(
  items: SignalNewsItem[],
  focusedTicker: string
): SignalNewsItem[] {
  const ticker = normalizeTicker(focusedTicker);

  return [...items].sort((a, b) => {
    const aPrimary = a.primaryTicker === ticker ? 1 : 0;
    const bPrimary = b.primaryTicker === ticker ? 1 : 0;
    if (bPrimary !== aPrimary) return bPrimary - aPrimary;

    const aTickerMatch = a.tickers.includes(ticker) ? 1 : 0;
    const bTickerMatch = b.tickers.includes(ticker) ? 1 : 0;
    if (bTickerMatch !== aTickerMatch) return bTickerMatch - aTickerMatch;

    const aImportance = a.importance ?? 0;
    const bImportance = b.importance ?? 0;
    if (bImportance !== aImportance) return bImportance - aImportance;

    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export function isFreshNewsItem(
  item: SignalNewsItem,
  maxAgeHours = DEFAULT_TICKER_PULSE_MAX_AGE_HOURS
): boolean {
  const publishedAt = new Date(item.publishedAt);
  if (Number.isNaN(publishedAt.getTime())) return false;

  return Date.now() - publishedAt.getTime() <= maxAgeHours * 60 * 60 * 1000;
}

export function filterFreshTickerNewsItems(
  items: SignalNewsItem[],
  maxAgeHours = DEFAULT_TICKER_PULSE_MAX_AGE_HOURS
): SignalNewsItem[] {
  return items.filter((item) => isFreshNewsItem(item, maxAgeHours));
}

export function buildTickerNewsPulse(
  items: SignalNewsItem[],
  ticker: string,
  options?: TickerNewsPulseOptions
): TickerNewsPulse | null {
  const normalizedTicker = normalizeTicker(ticker);
  const freshItems = filterFreshTickerNewsItems(
    items,
    options?.maxAgeHours ?? DEFAULT_TICKER_PULSE_MAX_AGE_HOURS
  );
  const sorted = sortTickerNews(freshItems, normalizedTicker);
  const lead = sorted[0];
  if (!lead) return null;

  return {
    ticker: normalizedTicker,
    freshCount: sorted.length,
    newestAgeLabel: formatNewsAgeLabel(lead.publishedAt),
    topLabel: buildNewsCatalystLabel(lead),
    headline: lead.headline,
    tone: lead.sentiment ?? "neutral",
    hasBreaking: sorted.some((item) => Boolean(item.isBreaking)),
    href: lead.url ?? null,
  };
}