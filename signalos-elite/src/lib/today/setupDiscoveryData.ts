import {
  fetchLatestSignalRows,
  fetchSignalsForTickers,
  type SignalDetailRow,
} from "@/lib/queries/signals";
import { getQuotePrice } from "@/lib/market/quotes";
import {
  getIndexFlags,
  isMajorIndexMember,
} from "@/lib/market/indexMembership";
import { getMarketSetupUniverse } from "@/lib/market/movers";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";
import {
  convictionToPct,
  signalSetupLabel,
  signalToneFromRow,
} from "@/lib/signalUtils";
import {
  discoverSetupBuckets,
  type RankedSetupItem,
  type SetupDiscoveryCandidate,
} from "@/lib/today/setupDiscovery";

type DiscoveryOptions = {
  signalLimit?: number;
  setupUniverseLimit?: number;
  signalSeedLimit?: number;
  fundamentalsTickerLimit?: number;
};

type SetupDiscoveryCacheEntry = {
  expiresAt: number;
  value: Promise<SetupDiscoveryData>;
};

const SETUP_DISCOVERY_CACHE_TTL_MS = 60_000;
const setupDiscoveryCache = new Map<string, SetupDiscoveryCacheEntry>();

export type SetupDiscoveryData = {
  top: RankedSetupItem[];
  emerging: RankedSetupItem[];
  candidates: SetupDiscoveryCandidate[];
};

async function time<T>(label: string, promise: Promise<T>): Promise<T> {
  const start = Date.now();

  try {
    return await promise;
  } finally {
    console.log(`[Today timing] ${label}: ${Date.now() - start}ms`);
  }
}

function normalizeTicker(value: string): string {
  return String(value ?? "").trim().toUpperCase();
}

function mergeCandidate(
  previous: SetupDiscoveryCandidate | undefined,
  next: SetupDiscoveryCandidate
): SetupDiscoveryCandidate {
  if (!previous) return next;

  return {
    ...previous,
    ...next,
    name: next.name ?? previous.name ?? null,
    sector: next.sector ?? previous.sector ?? null,
    price: next.price ?? previous.price ?? null,
    changePercent: next.changePercent ?? previous.changePercent ?? null,
    volume: next.volume ?? previous.volume ?? null,
    avgVolume: next.avgVolume ?? previous.avgVolume ?? null,
    rvol: next.rvol ?? previous.rvol ?? null,
    marketCap: next.marketCap ?? previous.marketCap ?? null,
    signal: next.signal ?? previous.signal ?? null,
    conviction: next.conviction ?? previous.conviction ?? null,
    score: next.score ?? previous.score ?? null,
    technicalScore: next.technicalScore ?? previous.technicalScore ?? null,
    hasNews: Boolean(previous.hasNews || next.hasNews),
    hasEarnings: Boolean(previous.hasEarnings || next.hasEarnings),
    hasAnalystAction: Boolean(previous.hasAnalystAction || next.hasAnalystAction),
    hasSectorTailwind: Boolean(previous.hasSectorTailwind || next.hasSectorTailwind),
    setupLabel: next.setupLabel ?? previous.setupLabel ?? null,
    reason: next.reason ?? previous.reason ?? null,
    summary: next.summary ?? previous.summary ?? null,
    isSP500: Boolean(previous.isSP500 || next.isSP500),
    isNasdaq100: Boolean(previous.isNasdaq100 || next.isNasdaq100),
    isDow30: Boolean(previous.isDow30 || next.isDow30),
    isRussell2000: Boolean(previous.isRussell2000 || next.isRussell2000),
    majorIndexMember: Boolean(
      previous.majorIndexMember ||
        next.majorIndexMember ||
        isMajorIndexMember(previous) ||
        isMajorIndexMember(next)
    ),
    hasValidQuote: Boolean(previous.hasValidQuote || next.hasValidQuote),
    hasRecentHistory: Boolean(previous.hasRecentHistory || next.hasRecentHistory),
  };
}

function hasKeyword(values: string[], keywords: string[]): boolean {
  return values.some((value) => {
    const normalized = value.toLowerCase();
    return keywords.some((keyword) => normalized.includes(keyword));
  });
}

function inferCatalystFlags(row: SignalDetailRow) {
  const catalysts = Array.isArray(row.catalysts) ? row.catalysts : [];
  const text = [row.thesis ?? "", ...catalysts].filter(Boolean);

  return {
    hasNews: text.length > 0,
    hasEarnings: hasKeyword(text, ["earnings", "guidance", "eps", "revenue beat"]),
    hasAnalystAction: hasKeyword(text, ["analyst", "upgrade", "downgrade", "price target"]),
    hasSectorTailwind: hasKeyword(text, ["tailwind", "ai", "cloud", "infrastructure", "sector"]),
  };
}

function inferRecentHistoryFromSignal(row: SignalDetailRow): boolean {
  if (!row.as_of_date) return false;

  const timestamp = Date.parse(row.as_of_date);
  if (!Number.isFinite(timestamp)) return false;

  const ageMs = Date.now() - timestamp;
  return ageMs <= 7 * 24 * 60 * 60 * 1000;
}

export async function getSetupDiscoveryData(
  options: DiscoveryOptions = {}
): Promise<SetupDiscoveryData> {
  const cacheKey = JSON.stringify({
    signalLimit: options.signalLimit ?? null,
    setupUniverseLimit: options.setupUniverseLimit ?? null,
    signalSeedLimit: options.signalSeedLimit ?? null,
    fundamentalsTickerLimit: options.fundamentalsTickerLimit ?? null,
  });
  const cached = setupDiscoveryCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const nextValue = (async (): Promise<SetupDiscoveryData> => {
    const signalLimit = options.signalLimit ?? 60;
    const setupUniverseLimit = options.setupUniverseLimit ?? 30;
    const signalSeedLimit = Math.max(
      signalLimit,
      options.signalSeedLimit ?? Math.max(signalLimit * 2, 160)
    );

    const [signalRows, marketSetupUniverse] = await Promise.all([
      time("setupDiscovery.supabaseFetch", fetchLatestSignalRows(signalSeedLimit)),
      time("setupDiscovery.setupUniverseBuild", getMarketSetupUniverse(setupUniverseLimit)),
    ]);

    const fundamentalsTickerLimit = Math.max(
      signalLimit,
      setupUniverseLimit * 2,
      options.fundamentalsTickerLimit ?? 80
    );
    const fundamentalsTickers = Array.from(
      new Set([
        ...marketSetupUniverse.map((row) => normalizeTicker(row.ticker)),
        ...signalRows.slice(0, fundamentalsTickerLimit).map((row) => normalizeTicker(row.ticker)),
      ])
    );

    const [marketSetupSignalRows, fundamentalsEntries] = await Promise.all([
      time(
        "setupDiscovery.marketSetupSignals",
        fetchSignalsForTickers(marketSetupUniverse.map((item) => item.ticker))
      ),
      time(
        "setupDiscovery.fundamentals",
        Promise.all(
          fundamentalsTickers.map(async (ticker) => [
            ticker,
            await getMassiveFundamentals(ticker, { profile: "discovery" }),
          ] as const)
        )
      ),
    ]);

    const marketSetupSignalMap = new Map(
      marketSetupSignalRows.map((row) => [normalizeTicker(row.ticker), row])
    );
    const fundamentalsMap = new Map(fundamentalsEntries);

    const mergedCandidates = await time(
      "setupDiscovery.candidateMerge",
      Promise.resolve().then(() => new Map<string, SetupDiscoveryCandidate>())
    );

    for (const row of signalRows) {
      const ticker = normalizeTicker(row.ticker);
      if (!ticker) continue;

      const indexFlags = getIndexFlags(ticker);
      const fundamentals = fundamentalsMap.get(ticker);
      const livePrice = getQuotePrice(ticker) ?? row.price ?? null;
      const tone = signalToneFromRow(row, livePrice);
      const signal = tone === "bullish" ? "Bullish" : tone === "bearish" ? "Bearish" : "Neutral";
      const catalystFlags = inferCatalystFlags(row);
      const volume = fundamentals?.volume ?? null;
      const avgVolume = fundamentals?.avgVolume ?? null;
      const rvol = volume != null && avgVolume != null && avgVolume > 0 ? volume / avgVolume : null;

      mergedCandidates.set(
        ticker,
        mergeCandidate(mergedCandidates.get(ticker), {
          ticker,
          name: row.company_name ?? fundamentals?.name ?? ticker,
          sector: row.sector ?? null,
          price: livePrice,
          changePercent: null,
          volume,
          avgVolume,
          rvol,
          marketCap: fundamentals?.marketCap ?? null,
          signal,
          conviction: convictionToPct(row.conviction),
          score: convictionToPct(row.conviction),
          technicalScore: convictionToPct(row.conviction),
          hasNews: catalystFlags.hasNews,
          hasEarnings: catalystFlags.hasEarnings,
          hasAnalystAction: catalystFlags.hasAnalystAction,
          hasSectorTailwind: catalystFlags.hasSectorTailwind,
          setupLabel: signalSetupLabel(row.thesis, row.sector, row.tier),
          reason: row.thesis ?? null,
          summary: row.thesis ?? null,
          ...indexFlags,
          majorIndexMember: isMajorIndexMember(indexFlags),
          hasValidQuote: livePrice != null && livePrice > 0,
          hasRecentHistory: inferRecentHistoryFromSignal(row),
        })
      );
    }

    for (const item of marketSetupUniverse) {
      const ticker = normalizeTicker(item.ticker);
      if (!ticker) continue;

      const indexFlags = getIndexFlags(ticker);
      const signalRow = marketSetupSignalMap.get(ticker);
      const fundamentals = fundamentalsMap.get(ticker);
      const livePrice = item.price ?? getQuotePrice(ticker) ?? signalRow?.price ?? null;
      const changePercent = item.changePct ?? null;
      const isPreMarketSession = item.session === "pre-market";
      const tone = signalRow
        ? signalToneFromRow(signalRow, livePrice)
        : changePercent != null && changePercent > 0
          ? "bullish"
          : changePercent != null && changePercent < 0
            ? "bearish"
            : "neutral";
      const signal = tone === "bullish" ? "Bullish" : tone === "bearish" ? "Bearish" : "Neutral";
      const catalystFlags = signalRow
        ? inferCatalystFlags(signalRow)
        : { hasNews: false, hasEarnings: false, hasAnalystAction: false, hasSectorTailwind: false };
      const volume = item.volume ?? fundamentals?.volume ?? null;
      const avgVolume = fundamentals?.avgVolume ?? null;
      const rvol =
        isPreMarketSession && volume != null && avgVolume != null && avgVolume > 0
          ? volume / avgVolume
          : item.rvol ?? (volume != null && avgVolume != null && avgVolume > 0 ? volume / avgVolume : null);

      mergedCandidates.set(
        ticker,
        mergeCandidate(mergedCandidates.get(ticker), {
          ticker,
          name: item.name ?? signalRow?.company_name ?? fundamentals?.name ?? ticker,
          sector: signalRow?.sector ?? item.sector ?? null,
          session: item.session ?? null,
          price: livePrice,
          changePercent,
          volume,
          avgVolume,
          rvol,
          marketCap: fundamentals?.marketCap ?? null,
          signal,
          conviction: signalRow ? convictionToPct(signalRow.conviction) : null,
          score:
            signalRow
              ? convictionToPct(signalRow.conviction)
              : Math.min(100, Math.max(35, Math.round(Math.abs(changePercent ?? 0) * 10))),
          technicalScore: signalRow ? convictionToPct(signalRow.conviction) : 50,
          hasNews: catalystFlags.hasNews,
          hasEarnings: catalystFlags.hasEarnings,
          hasAnalystAction: catalystFlags.hasAnalystAction,
          hasSectorTailwind: catalystFlags.hasSectorTailwind,
          setupLabel: signalRow ? signalSetupLabel(signalRow.thesis, signalRow.sector, signalRow.tier) : null,
          reason: signalRow?.thesis ?? null,
          summary: signalRow?.thesis ?? null,
          ...indexFlags,
          majorIndexMember: isMajorIndexMember(indexFlags),
          hasValidQuote: livePrice != null && livePrice > 0,
          hasRecentHistory: changePercent != null || isMajorIndexMember(indexFlags),
        })
      );
    }

    const candidates = await time(
      "setupDiscovery.candidateList",
      Promise.resolve().then(() => [...mergedCandidates.values()])
    );
    const buckets = await time(
      "setupDiscovery.ranking",
      Promise.resolve().then(() => discoverSetupBuckets(candidates))
    );

    return {
      top: buckets.top,
      emerging: buckets.emerging,
      candidates,
    };
  })();

  setupDiscoveryCache.set(cacheKey, {
    expiresAt: Date.now() + SETUP_DISCOVERY_CACHE_TTL_MS,
    value: nextValue,
  });

  try {
    return await nextValue;
  } catch (error) {
    const current = setupDiscoveryCache.get(cacheKey);
    if (current?.value === nextValue) {
      setupDiscoveryCache.delete(cacheKey);
    }
    throw error;
  }
}