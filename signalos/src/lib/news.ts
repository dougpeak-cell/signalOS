export type NewsTone = "bullish" | "bearish" | "neutral";

export type NewsCategory =
  | "macro"
  | "earnings"
  | "ai"
  | "fed"
  | "semis"
  | "energy"
  | "watchlist"
  | "company"
  | "sector";

export type NewsItem = {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
  summary: string;
  tone: NewsTone;
  category: NewsCategory;
  tickers: string[];
  importance: number;
  impact: string;
  whyItMatters?: string;
  imageUrl?: string;
};

type MassiveInsight = {
  ticker?: string;
  sentiment?: string;
  sentiment_reasoning?: string;
};

type MassivePublisher = {
  name?: string;
  homepage_url?: string;
  logo_url?: string;
  favicon_url?: string;
};

type MassiveNewsResult = {
  id?: string;
  title?: string;
  article_url?: string;
  amp_url?: string;
  author?: string;
  description?: string;
  image_url?: string;
  published_utc?: string;
  tickers?: string[];
  keywords?: string[];
  publisher?: MassivePublisher;
  insights?: MassiveInsight[];
};

type MassiveNewsResponse = {
  status?: string;
  request_id?: string;
  count?: number;
  next_url?: string;
  results?: MassiveNewsResult[];
};

const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY;
const MASSIVE_BASE_URL = "https://api.massive.com";

function requireApiKey() {
  if (!MASSIVE_API_KEY) {
    throw new Error("Missing MASSIVE_API_KEY in environment variables.");
  }
}

function inferTone(item: MassiveNewsResult): NewsTone {
  const sentiments = (item.insights ?? [])
    .map((x) => String(x.sentiment ?? "").toLowerCase())
    .filter(Boolean);

  const positiveCount = sentiments.filter((s) =>
    ["positive", "bullish", "up", "buy"].includes(s)
  ).length;

  const negativeCount = sentiments.filter((s) =>
    ["negative", "bearish", "down", "sell"].includes(s)
  ).length;

  if (positiveCount > negativeCount) return "bullish";
  if (negativeCount > positiveCount) return "bearish";
  return "neutral";
}

function inferCategory(item: MassiveNewsResult): NewsCategory {
  const haystack = [
    item.title ?? "",
    item.description ?? "",
    ...(item.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (
    /\b(fed|fomc|powell|rate cut|rate hike|treasury|yields?)\b/.test(haystack)
  ) {
    return "fed";
  }

  if (/\b(cpi|inflation|jobs|payrolls|pce|gdp|dxy|macro|economy)\b/.test(haystack)) {
    return "macro";
  }

  if (/\b(earnings|guidance|revenue|eps|quarter|q1|q2|q3|q4)\b/.test(haystack)) {
    return "earnings";
  }

  if (/\b(ai|artificial intelligence|llm|gpu|datacenter)\b/.test(haystack)) {
    return "ai";
  }

  if (/\b(semiconductor|semis|chip|chips|gpu|foundry)\b/.test(haystack)) {
    return "semis";
  }

  if (/\b(oil|wti|brent|energy|natural gas|opec)\b/.test(haystack)) {
    return "energy";
  }

  if ((item.tickers?.length ?? 0) <= 2) return "company";
  return "sector";
}

function inferImpact(importance: number): string {
  if (importance >= 85) return "High";
  if (importance >= 70) return "Medium";
  return "Low";
}

function computeImportance(item: MassiveNewsResult): number {
  let score = 55;

  const tickerCount = item.tickers?.length ?? 0;
  const insightCount = item.insights?.length ?? 0;
  const hasDescription = Boolean(item.description?.trim());
  const title = (item.title ?? "").toLowerCase();
  const desc = (item.description ?? "").toLowerCase();
  const text = `${title} ${desc}`;

  if (hasDescription) score += 8;
  if (tickerCount >= 1) score += 8;
  if (tickerCount >= 3) score += 4;
  if (insightCount >= 1) score += 8;
  if (insightCount >= 3) score += 4;

  if (/\b(breaking|surge|plunge|jumps|drops|raises|cuts|guidance|earnings)\b/.test(text)) {
    score += 7;
  }

  if (/\b(fed|cpi|jobs|treasury|yield|oil|geopolitical|opec)\b/.test(text)) {
    score += 8;
  }

  return Math.max(40, Math.min(97, score));
}

function buildWhyItMatters(item: MassiveNewsResult, tone: NewsTone): string {
  const reasoning = item.insights
    ?.map((x) => x.sentiment_reasoning?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  if (reasoning) return reasoning;

  if (tone === "bullish") {
    return "Positive headline flow can support momentum, reinforce relative strength, and improve trader confidence in the affected names.";
  }

  if (tone === "bearish") {
    return "Negative headline flow can pressure sentiment, compress risk appetite, and increase downside volatility in the affected names.";
  }

  return "This headline matters because it may shift trader positioning, alter near-term expectations, or change macro context without a clear directional edge yet.";
}

function normalizeMassiveNewsItem(item: MassiveNewsResult): NewsItem {
  const tone = inferTone(item);
  const category = inferCategory(item);
  const importance = computeImportance(item);

  return {
    id: item.id ?? crypto.randomUUID(),
    headline: item.title?.trim() || "Untitled article",
    source: item.publisher?.name?.trim() || "Unknown source",
    publishedAt: item.published_utc || new Date().toISOString(),
    url: item.article_url?.trim() || item.amp_url?.trim() || "#",
    summary: item.description?.trim() || "No summary available.",
    tone,
    category,
    tickers: item.tickers ?? [],
    importance,
    impact: inferImpact(importance),
    whyItMatters: buildWhyItMatters(item, tone),
    imageUrl: item.image_url?.trim(),
  };
}

export function formatRelativeTime(input: string): string {
  const published = new Date(input).getTime();
  const now = Date.now();

  if (Number.isNaN(published)) return "Unknown time";

  const diffMs = Math.max(0, now - published);
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function humanizeNewsItems(items: NewsItem[]): NewsItem[] {
  return items.map((item) => ({
    ...item,
    publishedAt: formatRelativeTime(item.publishedAt),
  }));
}

export async function fetchMassiveNews(params?: {
  tickers?: string[];
  limit?: number;
  publishedUtcGte?: string;
  order?: "asc" | "desc";
  sort?: "published_utc";
}): Promise<NewsItem[]> {
  requireApiKey();

  const search = new URLSearchParams();
  const limit = Math.min(params?.limit ?? 12, 100);
  const order = params?.order ?? "desc";
  const sort = params?.sort ?? "published_utc";

  search.set("limit", String(limit));
  search.set("sort", sort);
  search.set("order", order);
  search.set("apiKey", MASSIVE_API_KEY!);

  if (params?.publishedUtcGte) {
    search.set("published_utc.gte", params.publishedUtcGte);
  }

  if (params?.tickers?.length) {
    search.set("ticker", params.tickers[0]!);
  }

  const url = `${MASSIVE_BASE_URL}/v2/reference/news?${search.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    next: { revalidate: 60 },
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Massive news fetch failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as MassiveNewsResponse;
  const rawItems = data.results ?? [];

  let normalized = rawItems.map(normalizeMassiveNewsItem);

  if (params?.tickers?.length) {
    const wanted = new Set(params.tickers.map((t) => t.toUpperCase()));
    normalized = normalized.filter((item) =>
      item.tickers.some((ticker) => wanted.has(ticker.toUpperCase()))
    );
  }

  normalized.sort((a, b) => b.importance - a.importance);

  return normalized;
}

export async function fetchNewsForWatchlist(
  watchlist: string[],
  options?: { limit?: number; lookbackHours?: number }
): Promise<NewsItem[]> {
  const lookbackHours = options?.lookbackHours ?? 24;
  const publishedUtcGte = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  const items = await fetchMassiveNews({
    tickers: watchlist,
    limit: options?.limit ?? 25,
    publishedUtcGte,
    sort: "published_utc",
    order: "desc",
  });

  return humanizeNewsItems(items);
}

export async function fetchTopMarketNews(options?: {
  limit?: number;
  lookbackHours?: number;
}): Promise<NewsItem[]> {
  const lookbackHours = options?.lookbackHours ?? 24;
  const publishedUtcGte = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  const items = await fetchMassiveNews({
    limit: options?.limit ?? 12,
    publishedUtcGte,
    sort: "published_utc",
    order: "desc",
  });

  return humanizeNewsItems(items);
}
