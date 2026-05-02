import type { NewsItem } from "@/lib/news";
import type { SignalNewsItem } from "@/lib/news/scoreNewsHeaderItems";

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function inferKind(item: NewsItem): SignalNewsItem["kind"] {
  const haystack = `${item.headline} ${item.summary ?? ""}`.toLowerCase();

  if (haystack.includes("why is it moving") || haystack.includes("why it's moving")) {
    return "wiim";
  }

  if (haystack.includes("press release")) {
    return "press_release";
  }

  return "news";
}

function inferBreaking(item: NewsItem): boolean {
  const haystack = `${item.headline} ${item.summary ?? ""}`.toLowerCase();
  return haystack.includes("breaking") || haystack.includes("just in") || haystack.includes("alert:");
}

function inferSentiment(item: NewsItem): SignalNewsItem["sentiment"] {
  if (item.tone === "bullish") return "positive";
  if (item.tone === "bearish") return "negative";
  return "neutral";
}

function inferTags(item: NewsItem): string[] {
  const tags: string[] = [item.category];

  if (item.impact) tags.push(item.impact);
  if (item.source) tags.push(item.source);

  return Array.from(new Set(tags.map((value) => value.trim()).filter(Boolean)));
}

function inferChannels(item: NewsItem): string[] {
  const channels = [item.source];

  if (item.category === "macro" || item.category === "fed") {
    channels.push("Markets");
  }

  return Array.from(new Set(channels.map((value) => value.trim()).filter(Boolean)));
}

export function toSignalNewsItem(item: NewsItem): SignalNewsItem {
  const tickers = Array.from(new Set((item.tickers ?? []).map(normalizeTicker).filter(Boolean)));

  return {
    id: item.id,
    headline: item.headline,
    summary: item.summary ?? null,
    url: item.url ?? null,
    source: item.source ?? null,
    author: null,
    publishedAt: item.rawPublishedAt ?? item.publishedAt,
    updatedAt: null,
    tickers,
    primaryTicker: tickers[0] ?? null,
    tags: inferTags(item),
    channels: inferChannels(item),
    sentiment: inferSentiment(item),
    relevance: null,
    kind: inferKind(item),
    importance: item.importance ?? null,
    isBreaking: inferBreaking(item),
  };
}

export function toSignalNewsItems(items: NewsItem[]): SignalNewsItem[] {
  return items.map(toSignalNewsItem);
}

export function dedupeSignalNewsItems(items: SignalNewsItem[]): SignalNewsItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.id || item.url || `${item.headline}-${item.publishedAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}