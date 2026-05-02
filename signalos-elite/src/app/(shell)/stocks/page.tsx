import StocksPageClient, {
  type StockIdea,
} from "@/components/stocks/StocksPageClient";
import { fetchServerQuoteMap } from "@/lib/market/serverQuote";
import { fetchFreeTickerPulses } from "@/lib/news/fetchFreeTickerPulses";
import type { TickerNewsPulse } from "@/lib/news/tickerNewsPulse";
import { getSetupDiscoveryData } from "@/lib/today/setupDiscoveryData";
import type {
  RankedSetupItem,
} from "@/lib/today/setupDiscovery";
import { rankSetupCandidates } from "@/lib/today/setupDiscovery";

function normalizeTicker(value: string): string {
  return String(value ?? "").trim().toUpperCase();
}

function pulseToneFromNewsTone(
  tone: "positive" | "neutral" | "negative"
): NonNullable<StockIdea["pulse"]>["tone"] {
  if (tone === "positive") return "bullish";
  if (tone === "negative") return "bearish";
  return "neutral";
}

function createPulse(
  ticker: string,
  pulseMap: Record<string, TickerNewsPulse>
): StockIdea["pulse"] {
  const pulse = pulseMap[ticker];

  if (!pulse) return undefined;

  return {
    label: pulse.topLabel || "News",
    count: pulse.freshCount,
    age: pulse.newestAgeLabel || "recent",
    tone: pulseToneFromNewsTone(pulse.tone),
  };
}

function bucketBadge(bucket: StockIdea["bucket"], score: number): StockIdea["badge"] {
  if (bucket === "top") return score >= 85 ? "Priority" : "Scanner";
  if (bucket === "emerging") return "Emerging";
  return "Watch";
}

function toRankedIdea(
  item: RankedSetupItem,
  quoteMap: Awaited<ReturnType<typeof fetchServerQuoteMap>>,
  pulseMap: Record<string, TickerNewsPulse>
): StockIdea {
  const ticker = normalizeTicker(item.ticker);
  const quote = quoteMap[ticker];
  const score = Math.round(item.score);

  return {
    id: `${item.bucket}-${ticker}`,
    ticker,
    name: item.name || ticker,
    sector: item.sector?.trim() || "Market",
    price: quote?.price ?? item.price ?? null,
    changePercent: quote?.changePct ?? item.changePercent ?? null,
    conviction: score,
    thesis: item.whyThisSetup,
    bucket: item.bucket,
    badge: bucketBadge(item.bucket, score),
    pulse: createPulse(ticker, pulseMap),
  };
}

function toWatchIdea(
  item: RankedSetupItem,
  quoteMap: Awaited<ReturnType<typeof fetchServerQuoteMap>>,
  pulseMap: Record<string, TickerNewsPulse>
): StockIdea {
  const ticker = normalizeTicker(item.ticker);
  const quote = quoteMap[ticker];
  const conviction = Math.round(item.score);
  const thesis = item.whyThisSetup;

  return {
    id: `watch-${ticker}`,
    ticker,
    name: item.name?.trim() || ticker,
    sector: item.sector?.trim() || "Market",
    price: quote?.price ?? item.price ?? null,
    changePercent: quote?.changePct ?? item.changePercent ?? null,
    conviction,
    thesis,
    bucket: "watch",
    badge: bucketBadge("watch", conviction),
    pulse: createPulse(ticker, pulseMap),
  };
}

export default async function StocksPage() {
  const discovery = await getSetupDiscoveryData({
    signalLimit: 80,
    setupUniverseLimit: 40,
  });

  const scannerTickers = new Set([
    ...discovery.top.map((item) => normalizeTicker(item.ticker)),
    ...discovery.emerging.map((item) => normalizeTicker(item.ticker)),
  ]);

  const watchCandidates = rankSetupCandidates(
    discovery.candidates
    .filter((candidate) => {
      const ticker = normalizeTicker(candidate.ticker);

      return Boolean(ticker) && !scannerTickers.has(ticker);
    }),
    "watch"
  )
    .slice(0, 8);

  const tickers = Array.from(
    new Set([
      ...discovery.top.map((item) => normalizeTicker(item.ticker)),
      ...discovery.emerging.map((item) => normalizeTicker(item.ticker)),
      ...watchCandidates.map((item) => normalizeTicker(item.ticker)),
    ])
  );

  const [quoteMap, pulseMap] = await Promise.all([
    fetchServerQuoteMap(tickers),
    fetchFreeTickerPulses(tickers, { maxAgeHours: 24 }),
  ]);

  const ideas: StockIdea[] = [
    ...discovery.top.slice(0, 3).map((item) => toRankedIdea(item, quoteMap, pulseMap)),
    ...discovery.emerging
      .slice(0, 4)
      .map((item) => toRankedIdea(item, quoteMap, pulseMap)),
    ...watchCandidates.slice(0, 4).map((item) => toWatchIdea(item, quoteMap, pulseMap)),
  ];

  return <StocksPageClient ideas={ideas} />;
}
