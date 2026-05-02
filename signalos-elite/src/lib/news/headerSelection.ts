import { type NewsItem, type NewsTone } from "@/lib/news";
import {
  scoreNewsHeaderItems,
  type NewsHeaderMode,
  type ScoredHeaderNewsItem,
  type SignalNewsItem,
} from "@/lib/news/scoreNewsHeaderItems";

export type HeaderDisplayNewsItem = NewsItem & {
  chip: string;
  ageLabel: string;
  headerScore: number;
};

type RankNewsHeaderItemsInput = {
  items: NewsItem[];
  mode: NewsHeaderMode;
  focusedTicker?: string;
  watchlistTickers?: string[];
  portfolioTickers?: string[];
  topSetupTickers?: string[];
  mostTradedTickers?: string[];
  now?: Date;
};

type RankNewsHeaderItemsResult = {
  primary: HeaderDisplayNewsItem | null;
  secondary: HeaderDisplayNewsItem[];
  queue: HeaderDisplayNewsItem[];
  ranked: HeaderDisplayNewsItem[];
};

function mapToneToSentiment(tone: NewsTone): SignalNewsItem["sentiment"] {
  if (tone === "bullish") return "positive";
  if (tone === "bearish") return "negative";
  return "neutral";
}

function mapSentimentToTone(tone: ScoredHeaderNewsItem["tone"]): NewsTone {
  if (tone === "positive") return "bullish";
  if (tone === "negative") return "bearish";
  return "neutral";
}

function detectKind(item: NewsItem): SignalNewsItem["kind"] {
  const haystack = `${item.headline} ${item.summary} ${item.whyItMatters ?? ""} ${item.source}`.toLowerCase();

  if (haystack.includes("wiim") || haystack.includes("why is it moving")) {
    return "wiim";
  }

  if (
    haystack.includes("press release") ||
    haystack.includes("globenewswire") ||
    haystack.includes("accesswire") ||
    haystack.includes("business wire") ||
    haystack.includes("pr newswire")
  ) {
    return "press_release";
  }

  return "news";
}

function buildTags(item: NewsItem): string[] {
  const tags = [item.category, item.impact];
  return Array.from(new Set(tags.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function buildChannels(item: NewsItem, kind: SignalNewsItem["kind"]): string[] {
  const channels = [String(item.category ?? "").trim().toUpperCase()];
  if (kind === "wiim") channels.push("WIIM");
  return Array.from(new Set(channels.filter(Boolean)));
}

function toSignalNewsItem(item: NewsItem): SignalNewsItem {
  const kind = detectKind(item);

  return {
    id: item.id,
    headline: item.headline,
    image: item.image ?? item.imageUrl ?? null,
    summary: item.summary,
    url: item.url,
    source: item.source,
    author: null,
    publishedAt: item.rawPublishedAt ?? item.publishedAt,
    updatedAt: null,
    tickers: item.tickers ?? [],
    primaryTicker: item.tickers?.[0] ?? null,
    tags: buildTags(item),
    channels: buildChannels(item, kind),
    sentiment: mapToneToSentiment(item.tone),
    relevance: null,
    kind,
    importance: item.importance,
    isBreaking: item.importance >= 90,
  };
}

function decorateItem(item: NewsItem, scored: ScoredHeaderNewsItem): HeaderDisplayNewsItem {
  return {
    ...item,
    publishedAt: scored.ageLabel,
    tone: mapSentimentToTone(scored.tone),
    whyItMatters: scored.whyMatters ?? item.whyItMatters,
    chip: scored.chip,
    ageLabel: scored.ageLabel,
    headerScore: scored.headerScore,
  };
}

export function rankNewsHeaderItems(
  input: RankNewsHeaderItemsInput
): RankNewsHeaderItemsResult {
  const itemsById = new Map(input.items.map((item) => [item.id, item]));
  const scored = scoreNewsHeaderItems({
    items: input.items.map(toSignalNewsItem),
    mode: input.mode,
    focusedTicker: input.focusedTicker,
    watchlistTickers: input.watchlistTickers,
    portfolioTickers: input.portfolioTickers,
    topSetupTickers: input.topSetupTickers,
    mostTradedTickers: input.mostTradedTickers,
    now: input.now,
  });

  const mapBack = (item: ScoredHeaderNewsItem): HeaderDisplayNewsItem => {
    const original = itemsById.get(item.id);
    if (!original) {
      throw new Error(`Missing source news item for scored header item ${item.id}`);
    }

    return decorateItem(original, item);
  };

  const primary = scored.primary ? mapBack(scored.primary) : null;
  const secondary = scored.secondary.map(mapBack);
  const queue = scored.queue.map(mapBack);
  const ranked = [primary, ...secondary, ...queue].filter(
    (item): item is HeaderDisplayNewsItem => item != null
  );

  return { primary, secondary, queue, ranked };
}