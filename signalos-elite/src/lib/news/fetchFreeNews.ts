import type { NewsCategory, NewsItem, NewsTone } from "@/lib/news";
import { toSignalNewsItem } from "@/lib/news/freeNewsSignalItems";
import { detectNewsImpact, scoreNewsItem } from "@/lib/news/scoreNewsHeaderItems";

type FreeNewsSource = string;

type FreeRssItem = {
  id: string;
  title: string;
  link: string;
  publishedAt: string;
  source: FreeNewsSource;
  summary?: string;
  imageUrl?: string;
  image?: string | null;
  thumbnail?: string | null;
  urlToImage?: string | null;
};

const COMMON_WORDS = new Set([
  "AI",
  "CEO",
  "CFO",
  "USA",
  "NYSE",
  "NASDAQ",
  "ETF",
  "EPS",
  "GDP",
  "CPI",
  "FED",
  "SEC",
]);

function cleanHtml(value: string = ""): string {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? cleanHtml(match[1] ?? "") : "";
}

function extractAttribute(block: string, tagPattern: string, attribute: string): string {
  const match = block.match(new RegExp(`<${tagPattern}[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function extractImageUrl(block: string): string | undefined {
  const mediaContent = extractAttribute(block, "media:content", "url");
  if (mediaContent) return mediaContent;

  const mediaThumbnail = extractAttribute(block, "media:thumbnail", "url");
  if (mediaThumbnail) return mediaThumbnail;

  const enclosure = extractAttribute(block, "enclosure", "url");
  if (enclosure) return enclosure;

  const imageMatch = block.match(/<img[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  return imageMatch?.[1]?.trim() || undefined;
}

function normalizeNewsImage(raw: {
  image?: string | null;
  imageUrl?: string | null;
  thumbnail?: string | null;
  urlToImage?: string | null;
}) {
  return raw.image || raw.imageUrl || raw.thumbnail || raw.urlToImage || null;
}

function toIsoOrNow(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : new Date().toISOString();
}

function extractRssItems(
  xml: string,
  source: FreeNewsSource,
  options?: { preferSourceTag?: boolean }
): FreeRssItem[] {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  return itemBlocks
    .map((block, index): FreeRssItem | null => {
      const title = extractTag(block, "title");
      const link = extractTag(block, "link");
      const pubDate = extractTag(block, "pubDate");
      const description = extractTag(block, "description");
      const sourceTag = extractTag(block, "source");
      const resolvedSource =
        options?.preferSourceTag && sourceTag.trim().length > 0 ? sourceTag.trim() : source;

      if (!title || !link) return null;

      return {
        id: `${resolvedSource}-${pubDate || index}-${title}-${link}-${index}`,
        title,
        link,
        publishedAt: toIsoOrNow(pubDate),
        source: resolvedSource,
        summary: description || undefined,
        imageUrl: extractImageUrl(block),
      };
    })
    .filter((item): item is FreeRssItem => item !== null);
}

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

export function extractTickersFromText(text: string, knownTickers: string[] = []): string[] {
  const known = new Set(knownTickers.map(normalizeTicker));

  const cashtagMatches =
    text.match(/\$[A-Za-z]{1,5}\b/g)?.map((value) => normalizeTicker(value.replace("$", ""))) ?? [];

  const uppercaseMatches =
    text
      .match(/\b[A-Z]{2,5}\b/g)
      ?.map(normalizeTicker)
      .filter((ticker) => {
        if (COMMON_WORDS.has(ticker)) return false;
        if (known.size > 0) return known.has(ticker);
        return true;
      }) ?? [];

  return Array.from(new Set([...cashtagMatches, ...uppercaseMatches]));
}

export function detectNewsTone(text: string): NewsTone {
  const lower = text.toLowerCase();

  const bearish = [
    "downgrade",
    "misses",
    "lawsuit",
    "probe",
    "investigation",
    "cuts guidance",
    "offering",
    "dilution",
    "falls",
    "drops",
    "slumps",
    "plunges",
  ];

  const bullish = [
    "upgrade",
    "beats",
    "raises guidance",
    "surges",
    "jumps",
    "wins",
    "approval",
    "contract",
    "partnership",
    "acquisition",
  ];

  if (bearish.some((word) => lower.includes(word))) return "bearish";
  if (bullish.some((word) => lower.includes(word))) return "bullish";
  return "neutral";
}

function inferCategory(text: string): NewsCategory {
  const lower = text.toLowerCase();

  if (lower.includes("fed") || lower.includes("fomc") || lower.includes("treasury")) {
    return "fed";
  }
  if (lower.includes("cpi") || lower.includes("inflation") || lower.includes("jobs")) {
    return "macro";
  }
  if (lower.includes("earnings") || lower.includes("guidance") || lower.includes("quarter")) {
    return "earnings";
  }
  if (lower.includes("ai") || lower.includes("artificial intelligence")) return "ai";
  if (lower.includes("semiconductor") || lower.includes("chip") || lower.includes("nvidia")) {
    return "semis";
  }
  if (lower.includes("oil") || lower.includes("energy") || lower.includes("opec")) {
    return "energy";
  }

  return "company";
}

function formatAgeLabel(publishedAt: string): string {
  const published = new Date(publishedAt);
  const minutes = Math.max(0, Math.floor((Date.now() - published.getTime()) / 60000));

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function mapFreeRssItemToNewsItem(item: FreeRssItem, knownTickers: string[] = []): NewsItem {
  const text = `${item.title} ${item.summary ?? ""}`;
  const tickers = extractTickersFromText(text, knownTickers);
  const tone = detectNewsTone(`${item.title} ${item.summary ?? ""}`);
  const category = inferCategory(text);
  const image = normalizeNewsImage(item);
  const baseImportance = tickers.length > 0 ? 70 : 55;

  const draftItem: NewsItem = {
    id: item.id,
    title: item.title,
    headline: item.title,
    source: item.source,
    publishedAt: formatAgeLabel(item.publishedAt),
    rawPublishedAt: item.publishedAt,
    url: item.link,
    summary: item.summary ?? "No summary available.",
    tone,
    category,
    tickers,
    importance: baseImportance,
    impact: "Low",
    image,
    imageUrl: image,
    whyItMatters:
      tickers.length > 0
        ? `${tickers[0]} is referenced in fresh market news.`
        : "This headline may affect market sentiment or sector leadership.",
  };

  const signalItem = toSignalNewsItem(draftItem);
  const score = scoreNewsItem(signalItem, {
    mode: "market",
    now: new Date(),
  });
  const impact = detectNewsImpact(signalItem, {
    mode: "market",
    now: new Date(),
  });

  return {
    ...draftItem,
    importance: Math.max(baseImportance, Math.min(100, Math.round(score))),
    impact,
    score: Math.max(0, Math.round(score)),
  };
}

async function fetchRss(url: string, source: FreeNewsSource): Promise<FreeRssItem[]> {
  return fetchRssWithOptions(url, source);
}

async function fetchRssWithOptions(
  url: string,
  source: FreeNewsSource,
  options?: { preferSourceTag?: boolean }
): Promise<FreeRssItem[]> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/rss+xml,text/xml,*/*",
      },
      next: { revalidate: 120 },
    });

    if (!response.ok) return [];

    const xml = await response.text();
    return extractRssItems(xml, source, options);
  } catch {
    return [];
  }
}

function googleNewsSearchUrl(query: string): string {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  return url.toString();
}

function yahooFinanceTickerUrl(ticker: string): string {
  return `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
    ticker
  )}&region=US&lang=en-US`;
}

function usNewsMoneySearchUrl(): string {
  return googleNewsSearchUrl(
    "site:money.usnews.com/investing/news (stocks OR market OR earnings OR analyst) when:1d"
  );
}

function isWithinLookbackHours(publishedAt: string, lookbackHours: number): boolean {
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= lookbackHours * 60 * 60 * 1000;
}

function sortByPublishedDesc(items: NewsItem[]): NewsItem[] {
  return items.sort((a, b) => {
    const left = new Date(a.rawPublishedAt ?? 0).getTime();
    const right = new Date(b.rawPublishedAt ?? 0).getTime();
    return right - left;
  });
}

function buildNewsItemKey(item: NewsItem): string {
  const headline = String(item.headline ?? item.title ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return item.url || `${headline}-${item.rawPublishedAt ?? item.publishedAt}`;
}

function dedupeNewsItems(items: NewsItem[]): NewsItem[] {
  const byKey = new Map<string, NewsItem>();

  for (const item of items) {
    byKey.set(buildNewsItemKey(item), item);
  }

  return Array.from(byKey.values());
}

export async function fetchTopFreeMarketNews(options?: {
  limit?: number;
  lookbackHours?: number;
}): Promise<NewsItem[]> {
  const limit = options?.limit ?? 18;
  const lookbackHours = options?.lookbackHours ?? 24;

  const feeds = await Promise.all([
    fetchRss(googleNewsSearchUrl("stock market OR S&P 500 OR Nasdaq when:1d"), "Google News"),
    fetchRss(
      googleNewsSearchUrl("earnings OR analyst upgrade OR market movers stocks when:1d"),
      "Google News"
    ),
    fetchRssWithOptions(usNewsMoneySearchUrl(), "Google News", {
      preferSourceTag: true,
    }),
  ]);

  return sortByPublishedDesc(
    feeds
      .flat()
      .filter((item) => isWithinLookbackHours(item.publishedAt, lookbackHours))
      .map((item) => mapFreeRssItemToNewsItem(item))
  ).slice(0, limit);
}

export async function fetchUnifiedFreeNews(options?: {
  watchlistTickers?: string[];
  limit?: number;
  lookbackHours?: number;
  marketLimit?: number;
  watchlistLimit?: number;
}): Promise<NewsItem[]> {
  const watchlistTickers = Array.from(
    new Set((options?.watchlistTickers ?? []).map(normalizeTicker).filter(Boolean))
  );
  const limit = options?.limit ?? 30;
  const lookbackHours = options?.lookbackHours ?? 24;
  const marketLimit = options?.marketLimit ?? Math.max(limit, 18);
  const watchlistLimit = options?.watchlistLimit ?? Math.max(12, watchlistTickers.length * 2);

  const [marketItems, watchlistItems] = await Promise.all([
    fetchTopFreeMarketNews({
      limit: marketLimit,
      lookbackHours,
    }),
    watchlistTickers.length > 0
      ? fetchFreeNewsForWatchlist(watchlistTickers, {
          limit: watchlistLimit,
          lookbackHours,
        })
      : Promise.resolve([]),
  ]);

  return sortByPublishedDesc(dedupeNewsItems([...marketItems, ...watchlistItems])).slice(
    0,
    limit
  );
}

export async function fetchFreeNewsForWatchlist(
  watchlist: string[],
  options?: { limit?: number; lookbackHours?: number }
): Promise<NewsItem[]> {
  const tickers = Array.from(new Set(watchlist.map(normalizeTicker).filter(Boolean)));
  const limit = options?.limit ?? 12;
  const lookbackHours = options?.lookbackHours ?? 24;

  if (!tickers.length) return [];

  const feeds = await Promise.all(
    tickers.map((ticker) => fetchRss(yahooFinanceTickerUrl(ticker), "Yahoo Finance"))
  );

  return sortByPublishedDesc(
    feeds
      .flat()
      .filter((item) => isWithinLookbackHours(item.publishedAt, lookbackHours))
      .map((item) => mapFreeRssItemToNewsItem(item, tickers))
  ).slice(0, limit);
}