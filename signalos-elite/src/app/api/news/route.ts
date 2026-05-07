import { NextResponse } from "next/server";
import {
  fetchTopMarketNews,
  fetchNewsForWatchlist,
  fetchUnifiedNews,
  type NewsItem,
} from "@/lib/news";
import {
  rankNewsHeaderItems,
  type HeaderDisplayNewsItem,
} from "@/lib/news/headerSelection";
import { fetchSignalByTicker } from "@/lib/queries/signals";
import type { HeroStoryStage } from "@/components/today/TodayHeroPanel";

const WATCHLIST = ["NVDA", "MSFT", "AAPL", "AMZN", "META", "TSLA"];
const FALLBACK_HEADLINE = "Markets steady as traders assess positioning";
const FALLBACK_WHY_IT_MATTERS =
  "This catalyst may affect market sentiment, sector leadership, and near-term price behavior.";
const TICKER_LOOKBACK_WINDOWS = [24, 72, 168] as const;

type HeroStoryPayload = {
  headline: string;
  summary: string;
  image: string | null;
  source: string;
  timestamp: string | null;
  ticker: string | null;
  whyItMatters: string;
  items: HeaderDisplayNewsItem[];
  stage: HeroStoryStage;
};

function buildMacroFallbackStory(items: HeaderDisplayNewsItem[], ticker: string): HeroStoryPayload {
  const lead = items[0] ?? null;

  return {
    headline: `${ticker} in focus as broader market reacts to macro catalysts`,
    summary:
      lead?.summary ??
      `${ticker} is trading inside a broader macro and market-leadership backdrop rather than a clean company-specific catalyst.`,
    image: lead?.imageUrl ?? null,
    source: lead?.source ?? "Benzinga",
    timestamp: lead?.publishedAt ?? null,
    ticker,
    whyItMatters:
      `No direct ${ticker} catalyst detected. Monitoring macro drivers influencing price behavior.`,
    items: lead ? [lead] : [],
    stage: "market-brief",
  };
}

function buildTickerStoryPayload(
  ticker: string,
  best: HeaderDisplayNewsItem,
  items: HeaderDisplayNewsItem[],
  stage: HeroStoryStage
): HeroStoryPayload {
  return {
    headline: best.headline,
    summary: best.summary,
    image: best.imageUrl ?? null,
    source: best.source || "Benzinga",
    timestamp: best.publishedAt,
    ticker,
    whyItMatters: best.whyItMatters || FALLBACK_WHY_IT_MATTERS,
    items,
    stage,
  };
}

function getSectorThemeKeywords(sector?: string | null) {
  const normalized = String(sector ?? "").trim().toLowerCase();
  const keywords = new Set<string>();

  if (!normalized) return [];

  keywords.add(normalized);

  if (normalized.includes("semi") || normalized.includes("chip")) {
    ["semiconductor", "semis", "chip", "chips", "gpu", "foundry", "datacenter", "ai"].forEach((keyword) => keywords.add(keyword));
  }

  if (
    normalized.includes("software") ||
    normalized.includes("internet") ||
    normalized.includes("cloud") ||
    normalized.includes("saas")
  ) {
    ["software", "cloud", "saas", "enterprise", "internet", "digital advertising", "e-commerce", "ai"].forEach((keyword) => keywords.add(keyword));
  }

  if (normalized.includes("energy") || normalized.includes("oil") || normalized.includes("gas")) {
    ["energy", "oil", "gas", "crude", "wti", "brent", "opec"].forEach((keyword) => keywords.add(keyword));
  }

  if (normalized.includes("financial") || normalized.includes("bank")) {
    ["financial", "banks", "banking", "credit", "rates", "yield", "treasury"].forEach((keyword) => keywords.add(keyword));
  }

  if (normalized.includes("health") || normalized.includes("biotech") || normalized.includes("pharma")) {
    ["healthcare", "biotech", "pharma", "drug", "fda"].forEach((keyword) => keywords.add(keyword));
  }

  return Array.from(keywords);
}

function scoreSectorThemeItem(item: NewsItem, keywords: string[]) {
  const text = `${item.headline ?? ""} ${item.summary ?? ""} ${item.whyItMatters ?? ""}`.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (!keyword) continue;
    if (text.includes(keyword)) {
      score += keyword.includes(" ") ? 4 : 2;
    }
  }

  if (item.category === "sector") score += 3;
  if (item.category === "semis" && keywords.some((keyword) => ["semiconductor", "semis", "chip", "chips", "gpu", "foundry"].includes(keyword))) score += 4;
  if (item.category === "energy" && keywords.some((keyword) => ["energy", "oil", "gas", "crude", "wti", "brent", "opec"].includes(keyword))) score += 4;
  if (item.category === "ai" && keywords.some((keyword) => ["ai", "gpu", "datacenter", "cloud", "software"].includes(keyword))) score += 2;
  if (item.category === "macro") score += 1;
  if (Number(item.importance ?? 0) >= 70) score += 1;

  return score;
}

function selectSectorThemeContext(items: NewsItem[], sector?: string | null) {
  const keywords = getSectorThemeKeywords(sector);
  if (!keywords.length) return [];

  return [...items]
    .map((item) => ({ item, score: scoreSectorThemeItem(item, keywords) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);
}

function buildSectorThemeContextStory(
  items: HeaderDisplayNewsItem[],
  ticker: string,
  sector?: string | null
): HeroStoryPayload {
  const lead = items[0] ?? null;
  const sectorLabel = String(sector ?? "").trim() || "sector";

  return {
    headline: `${ticker} in focus as ${sectorLabel.toLowerCase()} context develops`,
    summary:
      lead?.summary ??
      `${ticker} is tracking with broader ${sectorLabel.toLowerCase()} and theme leadership rather than a clean company-specific catalyst.`,
    image: lead?.imageUrl ?? null,
    source: lead?.source ?? "Benzinga",
    timestamp: lead?.publishedAt ?? null,
    ticker,
    whyItMatters:
      `No direct ${ticker} catalyst detected after scanning 24h, 72h, and 7d ticker news. Monitoring ${sectorLabel.toLowerCase()} and related themes for spillover context.`,
    items,
    stage: "sector-context",
  };
}

function getTickerStageLabel(lookbackHours: number): HeroStoryStage {
  if (lookbackHours <= 24) return "ticker-24h";
  if (lookbackHours <= 72) return "ticker-72h";
  return "ticker-7d";
}

async function resolveTickerStory(ticker: string) {
  for (const lookbackHours of TICKER_LOOKBACK_WINDOWS) {
    const items = await fetchNewsForWatchlist([ticker], {
      limit: 8,
      lookbackHours,
    });
    const ranked = rankNewsHeaderItems({
      items,
      mode: "context",
      focusedTicker: ticker,
    });

    if (ranked.primary) {
      return {
        best: ranked.primary,
        items: ranked.ranked,
        lookbackHours,
        stage: getTickerStageLabel(lookbackHours),
      };
    }
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker =
      searchParams.get("ticker")?.trim().toUpperCase() ??
      searchParams.get("symbol")?.trim().toUpperCase() ??
      "";

    if (ticker) {
      const tickerStory = await resolveTickerStory(ticker);

      if (tickerStory) {
        return NextResponse.json(
          buildTickerStoryPayload(
            ticker,
            tickerStory.best,
            tickerStory.items,
            tickerStory.stage
          )
        );
      }

      const signalRow = await fetchSignalByTicker(ticker);
      const marketContextPool = await fetchTopMarketNews({
        limit: 32,
        lookbackHours: 168,
      });
      const sectorThemeItems = selectSectorThemeContext(
        marketContextPool,
        signalRow?.sector ?? null
      ).slice(0, 8);

      if (sectorThemeItems.length > 0) {
        const rankedSectorItems = rankNewsHeaderItems({
          items: sectorThemeItems,
          mode: "context",
          focusedTicker: ticker,
        });

        return NextResponse.json(
          buildSectorThemeContextStory(
            rankedSectorItems.ranked.length > 0 ? rankedSectorItems.ranked : [],
            ticker,
            signalRow?.sector
          )
        );
      }

      const latestMarketBrief = await fetchTopMarketNews({
        limit: 18,
        lookbackHours: 24,
      });

      const rankedBrief = rankNewsHeaderItems({
        items: latestMarketBrief,
        mode: "market",
        watchlistTickers: WATCHLIST,
      });

      return NextResponse.json(buildMacroFallbackStory(rankedBrief.ranked, ticker));
    }

    const mergedNews = await fetchUnifiedNews({
      watchlistTickers: WATCHLIST,
      limit: 30,
      marketLimit: 18,
      watchlistLimit: 12,
      lookbackHours: 24,
    });

    const rankedMarket = rankNewsHeaderItems({
      items: mergedNews,
      mode: "market",
      watchlistTickers: WATCHLIST,
    });
    const watchlistSet = new Set(WATCHLIST.map((ticker) => ticker.toUpperCase()));
    const rankedWatchlist = rankNewsHeaderItems({
      items: mergedNews.filter((item) =>
        Array.isArray(item.tickers)
          ? item.tickers.some((ticker) => watchlistSet.has(String(ticker).toUpperCase()))
          : false
      ),
      mode: "personal",
      watchlistTickers: WATCHLIST,
    });
    const leadStory =
      rankedMarket.ranked.find((item) => Boolean(item.imageUrl || item.image)) ??
      rankedMarket.primary ??
      null;
    const liveStream = rankedMarket.ranked.slice(0, 8);

    return NextResponse.json({
      headline: leadStory?.headline ?? FALLBACK_HEADLINE,
      summary:
        leadStory?.summary ??
        "Markets are digesting macro headlines, leadership rotation, and evolving trader positioning.",
      image: leadStory?.imageUrl ?? null,
      source: leadStory?.source ?? "Benzinga",
      timestamp: leadStory?.rawPublishedAt ?? null,
      ticker: leadStory?.tickers[0] ?? null,
      whyItMatters: leadStory?.whyItMatters || FALLBACK_WHY_IT_MATTERS,
      items: rankedMarket.ranked,
      stage: "market-live",
      watchlist: rankedWatchlist.ranked,
      leadStory,
      liveStream,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("News API error:", error);

    return NextResponse.json(
      {
        headline: FALLBACK_HEADLINE,
        summary:
          "Markets are digesting macro headlines, leadership rotation, and evolving trader positioning.",
        image: null,
        source: "Benzinga",
        timestamp: null,
        ticker: null,
        whyItMatters: FALLBACK_WHY_IT_MATTERS,
        items: [],
        stage: "market-brief",
        watchlist: [],
        leadStory: null,
        liveStream: [],
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown news error",
      },
      { status: 200 }
    );
  }
}
