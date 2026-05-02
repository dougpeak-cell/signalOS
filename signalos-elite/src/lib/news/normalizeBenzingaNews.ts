import type { SignalNewsItem } from "@/lib/news/scoreNewsHeaderItems";

export type BenzingaNewsImage = {
  size?: string;
  url?: string;
};

export type BenzingaNewsNameValue = {
  name?: string;
};

export type BenzingaNewsStock = {
  name?: string;
  exchange?: string;
  cusip?: string;
  isin?: string;
};

export type BenzingaNewsItem = {
  id: number | string;
  author?: string;
  created?: string;
  updated?: string;
  title?: string;
  teaser?: string;
  body?: string;
  url?: string;
  image?: BenzingaNewsImage[];
  channels?: BenzingaNewsNameValue[];
  stocks?: BenzingaNewsStock[];
  tags?: BenzingaNewsNameValue[];
};

export type MassiveBenzingaNewsResponse = {
  results?: BenzingaNewsItem[];
  news?: BenzingaNewsItem[];
  data?: BenzingaNewsItem[];
};

export type NormalizeBenzingaNewsOptions = {
  source?: string;
};

function safeTrim(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function upperTicker(value?: string | null): string | null {
  const trimmed = value?.trim().toUpperCase();
  return trimmed ? trimmed : null;
}

function uniq<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function buildBenzingaFallbackId(item: BenzingaNewsItem): string {
  const url = safeTrim(item.url);
  if (url) return url;

  const title = safeTrim(item.title) ?? "untitled-news-item";
  const publishedAt = item.created ?? item.updated ?? "unknown-time";

  return `${title}::${publishedAt}`;
}

export function parseBenzingaChannels(item: BenzingaNewsItem): string[] {
  return uniq(
    (item.channels ?? [])
      .map((channel) => safeTrim(channel.name))
      .filter((value): value is string => Boolean(value))
  );
}

export function parseBenzingaTags(item: BenzingaNewsItem): string[] {
  return uniq(
    (item.tags ?? [])
      .map((tag) => safeTrim(tag.name))
      .filter((value): value is string => Boolean(value))
  );
}

export function parseBenzingaTickers(item: BenzingaNewsItem): string[] {
  return uniq(
    (item.stocks ?? [])
      .map((stock) => upperTicker(stock.name))
      .filter((value): value is string => Boolean(value))
  );
}

export function inferBenzingaKind(
  item: BenzingaNewsItem
): SignalNewsItem["kind"] {
  const channels = parseBenzingaChannels(item).map((value) => value.toLowerCase());
  const tags = parseBenzingaTags(item).map((value) => value.toLowerCase());
  const title = `${item.title ?? ""} ${item.teaser ?? ""}`.toLowerCase();

  if (
    channels.includes("wiim") ||
    tags.includes("wiim") ||
    title.includes("why is it moving")
  ) {
    return "wiim";
  }

  if (
    channels.includes("press releases") ||
    channels.includes("press release") ||
    tags.includes("press release")
  ) {
    return "press_release";
  }

  return "news";
}

export function inferBenzingaPrimaryTicker(item: BenzingaNewsItem): string | null {
  return parseBenzingaTickers(item)[0] ?? null;
}

export function inferBenzingaBreaking(item: BenzingaNewsItem): boolean {
  const haystack = `${item.title ?? ""} ${item.teaser ?? ""}`.toLowerCase();

  return (
    haystack.includes("breaking") ||
    haystack.includes("just in") ||
    haystack.includes("alert:")
  );
}

export function inferBenzingaSentiment(
  item: BenzingaNewsItem
): SignalNewsItem["sentiment"] {
  const haystack = `${item.title ?? ""} ${item.teaser ?? ""}`.toLowerCase();

  const negativeTerms = [
    "offering",
    "dilution",
    "downgrade",
    "misses",
    "cuts guidance",
    "probe",
    "lawsuit",
    "investigation",
    "falls",
    "drops",
    "plunges",
    "slumps",
  ];

  const positiveTerms = [
    "upgrade",
    "beats",
    "raises guidance",
    "approval",
    "wins",
    "surges",
    "jumps",
    "soars",
    "partnership",
    "acquisition",
    "contract",
  ];

  if (negativeTerms.some((term) => haystack.includes(term))) return "negative";
  if (positiveTerms.some((term) => haystack.includes(term))) return "positive";
  return "neutral";
}

export function inferBenzingaImportance(item: BenzingaNewsItem): number | null {
  const channels = parseBenzingaChannels(item).map((value) => value.toLowerCase());
  const tags = parseBenzingaTags(item).map((value) => value.toLowerCase());
  const title = `${item.title ?? ""} ${item.teaser ?? ""}`.toLowerCase();

  let score = 0;

  if (inferBenzingaBreaking(item)) score += 10;
  if (channels.includes("wiim")) score += 8;
  if (channels.includes("markets")) score += 4;
  if (channels.includes("analyst ratings")) score += 5;
  if (channels.includes("press releases")) score += 2;

  if (title.includes("earnings")) score += 7;
  if (title.includes("guidance")) score += 7;
  if (title.includes("offering")) score += 6;
  if (title.includes("downgrade") || title.includes("upgrade")) score += 6;
  if (title.includes("fda")) score += 7;
  if (title.includes("merger") || title.includes("acquisition")) score += 7;

  if (tags.includes("press release")) score += 1;

  return score > 0 ? score : null;
}

export function normalizeBenzingaNewsItem(
  item: BenzingaNewsItem,
  options?: NormalizeBenzingaNewsOptions
): SignalNewsItem {
  const tickers = parseBenzingaTickers(item);
  const channels = parseBenzingaChannels(item);
  const tags = parseBenzingaTags(item);
  const normalizedId =
    item.id === null || item.id === undefined || String(item.id).trim() === ""
      ? buildBenzingaFallbackId(item)
      : String(item.id);

  return {
    id: normalizedId,
    headline: safeTrim(item.title) ?? "Untitled news item",
    summary: safeTrim(item.teaser),
    url: safeTrim(item.url),
    source: options?.source ?? "Benzinga",
    author: safeTrim(item.author),
    publishedAt: item.created ?? new Date().toISOString(),
    updatedAt: item.updated ?? null,
    tickers,
    primaryTicker: inferBenzingaPrimaryTicker(item),
    tags,
    channels,
    sentiment: inferBenzingaSentiment(item),
    relevance: null,
    kind: inferBenzingaKind(item),
    importance: inferBenzingaImportance(item),
    isBreaking: inferBenzingaBreaking(item),
  };
}

export function normalizeBenzingaNews(
  items: BenzingaNewsItem[],
  options?: NormalizeBenzingaNewsOptions
): SignalNewsItem[] {
  return items.map((item) => normalizeBenzingaNewsItem(item, options));
}

export function extractBenzingaNewsItems(
  payload: BenzingaNewsItem[] | MassiveBenzingaNewsResponse | null | undefined
): BenzingaNewsItem[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.news)) return payload.news;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export function buildNewsCatalystLabel(item: SignalNewsItem): string {
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
  if (haystack.includes("offering") || haystack.includes("dilution")) {
    return "Offering";
  }
  if (haystack.includes("fda")) return "FDA";
  if (haystack.includes("merger") || haystack.includes("acquisition")) {
    return "M&A";
  }
  if (
    haystack.includes("fed") ||
    haystack.includes("cpi") ||
    haystack.includes("inflation") ||
    haystack.includes("jobs report")
  ) {
    return "Macro";
  }
  if (item.kind === "press_release") return "Press Release";
  if (item.isBreaking) return "Breaking";
  return "News";
}

export function buildNewsCatalystSummary(
  item: SignalNewsItem,
  focusedTicker?: string
): string | null {
  const ticker = focusedTicker?.trim().toUpperCase();
  const label = buildNewsCatalystLabel(item);

  if (ticker && item.tickers.includes(ticker)) {
    switch (label) {
      case "Why moving":
        return `${ticker} has a fresh narrative catalyst tied directly to today’s move.`;
      case "Earnings":
        return `${ticker} has an earnings-related catalyst that can drive volatility and follow-through.`;
      case "Guidance":
        return `${ticker} has updated outlook-related news that can change market expectations quickly.`;
      case "Analyst":
        return `${ticker} has analyst-driven news that may influence short-term sentiment and flows.`;
      case "Offering":
        return `${ticker} has a dilution or financing-related headline that raises near-term risk.`;
      case "FDA":
        return `${ticker} has a regulatory or trial-related catalyst that can sharply alter momentum.`;
      case "M&A":
        return `${ticker} has deal-related news that can reset valuation expectations.`;
      case "Macro":
        return `${ticker} is being affected by a broader macro headline.`;
      default:
        return `${ticker} has a fresh headline worth factoring into the current setup.`;
    }
  }

  if (item.primaryTicker) {
    return `${item.primaryTicker} has a fresh ${label.toLowerCase()} catalyst that may matter to related names.`;
  }

  return null;
}

export function formatNewsAgeLabel(
  publishedAt: string,
  now: Date = new Date()
): string {
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return "now";

  const diffMs = now.getTime() - published.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}