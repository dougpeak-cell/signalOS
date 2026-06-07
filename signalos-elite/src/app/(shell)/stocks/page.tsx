import StocksPageClient, {
  type StockIdea,
} from "@/components/stocks/StocksPageClient";
import { FinancialDisclaimer } from "@/components/FinancialDisclaimer";
import { fetchFreeTickerPulses } from "@/lib/news/fetchFreeTickerPulses";
import type { TickerNewsPulse } from "@/lib/news/tickerNewsPulse";
import { getSetupDiscoveryData } from "@/lib/today/setupDiscoveryData";
import type {
  SetupDiscoveryCandidate,
  RankedSetupItem,
} from "@/lib/today/setupDiscovery";
import { rankSetupCandidates } from "@/lib/today/setupDiscovery";

const STOCKS_SIGNAL_LIMIT = 36;
const STOCKS_SETUP_UNIVERSE_LIMIT = 18;
const STOCKS_SIGNAL_SEED_LIMIT = 72;
const STOCKS_FUNDAMENTALS_TICKER_LIMIT = 36;
const STOCKS_PUBLIC_CACHE_TTL_MS = 60_000;

type CachedAsyncValue<T> = {
  expiresAt: number;
  value: Promise<T>;
};

const stocksPulseCache = new Map<string, CachedAsyncValue<Record<string, TickerNewsPulse>>>();

async function withTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs = 1500
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

function getCachedAsyncValue<T>(
  cache: Map<string, CachedAsyncValue<T>>,
  key: string,
  load: () => Promise<T>,
  ttlMs = STOCKS_PUBLIC_CACHE_TTL_MS
): Promise<T> {
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const nextValue = load();
  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value: nextValue,
  });

  return nextValue.catch((error) => {
    const current = cache.get(key);
    if (current?.value === nextValue) {
      cache.delete(key);
    }
    throw error;
  });
}

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
  pulseMap: Record<string, TickerNewsPulse>
): StockIdea {
  const ticker = normalizeTicker(item.ticker);
  const score = Math.round(item.score);

  return {
    id: `${item.bucket}-${ticker}`,
    ticker,
    name: item.name || ticker,
    sector: item.sector?.trim() || "Market",
    price: item.price ?? null,
    changePercent: item.changePercent ?? null,
    conviction: score,
    thesis: item.whyThisSetup,
    bucket: item.bucket,
    badge: bucketBadge(item.bucket, score),
    pulse: createPulse(ticker, pulseMap),
  };
}

function toWatchIdea(
  item: RankedSetupItem,
  pulseMap: Record<string, TickerNewsPulse>
): StockIdea {
  const ticker = normalizeTicker(item.ticker);
  const conviction = Math.round(item.score);
  const thesis = item.whyThisSetup;

  return {
    id: `watch-${ticker}`,
    ticker,
    name: item.name?.trim() || ticker,
    sector: item.sector?.trim() || "Market",
    price: item.price ?? null,
    changePercent: item.changePercent ?? null,
    conviction,
    thesis,
    bucket: "watch",
    badge: bucketBadge("watch", conviction),
    pulse: createPulse(ticker, pulseMap),
  };
}

function toFallbackIdea(
  candidate: SetupDiscoveryCandidate,
  bucket: Extract<StockIdea["bucket"], "emerging" | "watch">,
  pulseMap: Record<string, TickerNewsPulse>
): StockIdea {
  const ticker = normalizeTicker(candidate.ticker);
  const conviction = Math.max(25, Math.min(79, Math.round(candidateActivityScore(candidate))));

  return {
    id: `fallback-${bucket}-${ticker}`,
    ticker,
    name: candidate.name?.trim() || ticker,
    sector: candidate.sector?.trim() || "Market",
    price: candidate.price ?? null,
    changePercent: candidate.changePercent ?? null,
    conviction,
    thesis: buildFallbackThesis(candidate, bucket),
    bucket,
    badge: bucketBadge(bucket, conviction),
    pulse: createPulse(ticker, pulseMap),
  };
}

function candidateActivityScore(candidate: SetupDiscoveryCandidate): number {
  const move = Math.abs(candidate.changePercent ?? 0);
  const rvol = candidate.rvol ?? 0;
  const volume = candidate.volume ?? 0;
  const hasCatalyst =
    Boolean(candidate.hasNews) ||
    Boolean(candidate.hasEarnings) ||
    Boolean(candidate.hasAnalystAction) ||
    Boolean(candidate.hasSectorTailwind);

  return move * 10 + rvol * 12 + volume / 1_000_000 + (hasCatalyst ? 8 : 0);
}

function buildFallbackThesis(
  candidate: SetupDiscoveryCandidate,
  bucket: Extract<StockIdea["bucket"], "emerging" | "watch">
): string {
  const catalyst =
    candidate.hasEarnings
      ? "Earnings catalyst"
      : candidate.hasNews || candidate.hasAnalystAction
        ? "News catalyst"
        : candidate.hasSectorTailwind
          ? "Sector tailwind"
          : null;
  const setup = candidate.setupLabel?.trim() || candidate.reason?.trim() || candidate.summary?.trim() || null;

  if (setup && catalyst) {
    return `${setup}. ${catalyst}.`;
  }

  if (setup) {
    return setup;
  }

  return bucket === "emerging"
    ? "Scanner activity is building, but the setup has not cleared the higher-conviction rank threshold yet."
    : "Keep this name on watch while price, volume, and catalyst conditions develop.";
}

function buildFallbackCandidateIdeas(
  candidates: SetupDiscoveryCandidate[],
  excludedTickers: Set<string>,
  bucket: Extract<StockIdea["bucket"], "emerging" | "watch">,
  pulseMap: Record<string, TickerNewsPulse>,
  limit: number
): StockIdea[] {
  return candidates
    .filter((candidate) => {
      const ticker = normalizeTicker(candidate.ticker);
      return Boolean(ticker) && !excludedTickers.has(ticker);
    })
    .sort((left, right) => candidateActivityScore(right) - candidateActivityScore(left))
    .slice(0, limit)
    .map((candidate) => toFallbackIdea(candidate, bucket, pulseMap));
}

export default async function StocksPage() {
  const discovery = await getSetupDiscoveryData({
    signalLimit: STOCKS_SIGNAL_LIMIT,
    setupUniverseLimit: STOCKS_SETUP_UNIVERSE_LIMIT,
    signalSeedLimit: STOCKS_SIGNAL_SEED_LIMIT,
    fundamentalsTickerLimit: STOCKS_FUNDAMENTALS_TICKER_LIMIT,
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

  const fallbackEmergingCandidates =
    discovery.emerging.length > 0
      ? []
      : buildFallbackCandidateIdeas(discovery.candidates, new Set(scannerTickers), "emerging", {}, 4);

  const watchExclusionTickers = new Set([
    ...scannerTickers,
    ...fallbackEmergingCandidates.map((idea) => normalizeTicker(idea.ticker)),
  ]);

  const fallbackWatchIdeas =
    watchCandidates.length > 0
      ? []
      : buildFallbackCandidateIdeas(discovery.candidates, watchExclusionTickers, "watch", {}, 4);

  const tickers = Array.from(
    new Set([
      ...discovery.top.map((item) => normalizeTicker(item.ticker)),
      ...discovery.emerging.map((item) => normalizeTicker(item.ticker)),
      ...watchCandidates.map((item) => normalizeTicker(item.ticker)),
      ...fallbackEmergingCandidates.map((idea) => normalizeTicker(idea.ticker)),
      ...fallbackWatchIdeas.map((idea) => normalizeTicker(idea.ticker)),
    ])
  );

  const pulseMap = await withTimeout(
    getCachedAsyncValue(
      stocksPulseCache,
      `stocks-pulses:${tickers.slice().sort().join(",")}`,
      () => fetchFreeTickerPulses(tickers, { maxAgeHours: 24 })
    ),
    {},
    700
  );

  const ideas: StockIdea[] = [
    ...discovery.top.slice(0, 3).map((item) => toRankedIdea(item, pulseMap)),
    ...(discovery.emerging.length > 0
      ? discovery.emerging
          .slice(0, 4)
          .map((item) => toRankedIdea(item, pulseMap))
      : fallbackEmergingCandidates.map((idea) => ({
          ...idea,
          pulse: createPulse(idea.ticker, pulseMap),
        }))),
    ...(watchCandidates.length > 0
      ? watchCandidates.slice(0, 4).map((item) => toWatchIdea(item, pulseMap))
      : fallbackWatchIdeas.map((idea) => ({
          ...idea,
          pulse: createPulse(idea.ticker, pulseMap),
        }))),
  ];

  return (
    <div className="space-y-6">
      <StocksPageClient ideas={ideas} />
      <FinancialDisclaimer />
    </div>
  );
}
