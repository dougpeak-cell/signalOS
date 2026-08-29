import { NextRequest, NextResponse } from "next/server";
import { getStoredMarketContext } from "@/lib/intelligence/contextStore";
import { calculateDNAAlignment } from "@/lib/vision/dnaAlignment";
import { calculateOpportunityScore } from "@/lib/vision/opportunityScore";
import { getCurrentMarketPhase } from "@/lib/today/marketPhase";
import { resolveStockTickerAlias } from "@/lib/stocks/symbolAliases";
import {
  getWorkspacePulseMeaning,
  normalizeWorkspaceDirection,
} from "@/lib/workspacePulse";
import type {
  WorkspacePriceStatus,
  WorkspacePulseRadar,
} from "@/types/workspace";

const MARKET_ITEMS = [
  { ticker: "^GSPC", symbol: "SPX", label: "S&P 500" },
  { ticker: "^IXIC", symbol: "IXIC", label: "Nasdaq" },
  { ticker: "^DJI", symbol: "DJI", label: "Dow" },
  { ticker: "^RUT", symbol: "RUT", label: "Russell" },
  { ticker: "^VIX", symbol: "VIX", label: "VIX" },
  { ticker: "^TNX", symbol: "TNX", label: "10Y" },
  { ticker: "X:BTCUSD", symbol: "BTC", label: "BTC" },
  { ticker: "GLD", symbol: "GLD", label: "Gold" },
] as const;

const WORKSPACE_UPSTREAM_TIMEOUT_MS = 10_000;

type WorkspaceLiveQuote = {
  ticker?: unknown;
  source?: unknown;
  price?: unknown;
  changePercent?: unknown;
  updatedMs?: unknown;
};

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function toIsoTimestamp(value: unknown): string | null {
  const timestamp = num(value);
  if (timestamp === null) return null;

  const normalized = timestamp < 10_000_000_000 ? timestamp * 1_000 : timestamp;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getPriceStatus(updatedMs: unknown, source: unknown): WorkspacePriceStatus {
  if (!text(source)) return "unavailable";

  const phase = getCurrentMarketPhase();
  if (phase === "postmarket") return "last-close";

  const timestamp = num(updatedMs);
  if (timestamp === null) return "delayed";

  const normalized = timestamp < 10_000_000_000 ? timestamp * 1_000 : timestamp;
  return Date.now() - normalized <= 5 * 60 * 1_000 ? "live" : "delayed";
}

async function safeJson(url: string) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(WORKSPACE_UPSTREAM_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const symbol = resolveStockTickerAlias(
    request.nextUrl.searchParams.get("symbol") || "NVDA"
  );

  const origin = request.nextUrl.origin;
  const storedMarketContextPromise = getStoredMarketContext();
  const liveContextPromise = storedMarketContextPromise.then(async (storedMarketContext) => {
    const watchSymbols = Array.from(
      new Set(
        storedMarketContext.watchlist
          .map((item) =>
            resolveStockTickerAlias(
              typeof item === "string" ? item : item.ticker ?? item.symbol
            )
          )
          .filter(Boolean)
      )
    );
    const quoteSymbols = Array.from(new Set([symbol, ...watchSymbols]));
    const [liveQuoteRaw, watchPulseRows] = await Promise.all([
      safeJson(
        `${origin}/api/massive/quotes?tickers=${encodeURIComponent(quoteSymbols.join(","))}`
      ),
      Promise.all(watchSymbols.map(async (watchSymbol) => {
        const raw = await safeJson(
          `${origin}/api/amsa/${encodeURIComponent(watchSymbol)}`
        );

        return { watchSymbol, raw, watchPulse: raw?.pulse };
      })),
    ]);

    return { liveQuoteRaw, watchPulseRows };
  });

  const [
    amsaRaw,
    futureResponse,
    marketRaw,
    cryptoRaw,
    radarRaw,
    liveContext,
  ] = await Promise.all([
    safeJson(`${origin}/api/amsa/${encodeURIComponent(symbol)}`),
    safeJson(`${origin}/api/amsa/future/${encodeURIComponent(symbol)}`),
    safeJson(
      `${origin}/api/quotes?tickers=${encodeURIComponent(
        MARKET_ITEMS.map((item) => item.ticker).join(",")
      )}`
    ),
    safeJson(`${origin}/api/crypto/snapshot?tickers=BTC`),
    safeJson(`${origin}/api/amsa/pulse-radar`),
    liveContextPromise,
  ]);

  if (!amsaRaw) {
    return NextResponse.json(
      {
        error: `No AMSA data found for ${symbol}.`,
      },
      {
        status: 404,
      }
    );
  }

  const pulseRaw = amsaRaw.pulse;
  const components = Array.isArray(pulseRaw?.components)
    ? Object.fromEntries(
        pulseRaw.components.map((component: { component?: string; score?: unknown }) => [
          component.component,
          component.score,
        ])
      )
    : pulseRaw?.components;

  const rawPulse = num(amsaRaw.rawPulse);
  const displayPulse = num(amsaRaw.displayPulse);
  const pulseComponents = Array.isArray(pulseRaw?.components)
    ? pulseRaw.components
    : [];
  const dna = calculateDNAAlignment(pulseComponents);

  const stock = {
    symbol,
    name: text(
      amsaRaw.name ?? amsaRaw.companyName ?? amsaRaw.company,
      symbol
    ),
    price: null as number | null,
    changePercent: null as number | null,
    priceAsOf: null as string | null,
    priceProvider: null as string | null,
    priceStatus: "unavailable" as WorkspacePriceStatus,
    pulse: displayPulse,
    pulseLabel: text(
      amsaRaw.label,
      getWorkspacePulseMeaning(displayPulse).label
    ),
    direction: normalizeWorkspaceDirection(
      amsaRaw.direction ?? amsaRaw.trendDirection ?? pulseRaw?.direction
    ),
    pulseAsOf: text(amsaRaw.asOf) || null,
    pulseSessionDate: text(amsaRaw.sessionDate) || null,
    pulseReadingType:
      amsaRaw.readingType === "live" || amsaRaw.readingType === "verified_daily"
        ? amsaRaw.readingType
        : null,
    confidence: num(
      amsaRaw.confidence ?? amsaRaw.amsaConfidence ?? pulseRaw?.confidence
    ),
    dna,
    opportunity: null as number | null,
    risk: num(amsaRaw.risk ?? amsaRaw.riskScore ?? components?.risk),
    trend: num(
      amsaRaw.trend ?? amsaRaw.dna?.trend ?? amsaRaw.components?.trend ?? components?.trend
    ),
    momentum: num(
      amsaRaw.momentum ??
        amsaRaw.dna?.momentum ??
        amsaRaw.components?.momentum ??
        components?.movingAverage
    ),
    marketStructure: num(
      amsaRaw.marketStructure ??
        amsaRaw.dna?.marketStructure ??
        amsaRaw.components?.marketStructure ??
        components?.range
    ),
    sectorAlignment: num(
      amsaRaw.sectorAlignment ??
        amsaRaw.dna?.sectorAlignment ??
        amsaRaw.components?.sectorAlignment ??
        components?.alignment
    ),
    riskControl: num(
      amsaRaw.riskControl ??
        amsaRaw.dna?.riskControl ??
        amsaRaw.components?.riskControl ??
        components?.risk
    ),
    updatedAt: text(amsaRaw.asOf) || null,
  };

  const futureRaw = futureResponse?.futureMap ?? futureResponse;
  const tradePlan = futureRaw?.tradePlan;
  const primaryScenario = futureRaw?.primaryScenario
    ? futureRaw[futureRaw.primaryScenario]
    : null;
  const primaryQuality = primaryScenario?.quality;
  const sectorAlignment = num(
    futureResponse?.alignment?.score ?? primaryQuality?.alignmentScore
  );
  const rewardRisk = num(
    primaryScenario?.riskReward?.rewardToRisk ?? tradePlan?.rewardToRisk
  );

  stock.sectorAlignment = sectorAlignment;
  stock.opportunity = futureRaw
    ? calculateOpportunityScore({
        stockPulse: rawPulse,
        alignment: sectorAlignment,
        bullProbability: num(futureRaw.bullProbability),
        confidence: num(futureRaw.confidence),
        riskControl: num(primaryQuality?.riskControlScore ?? components?.risk),
        rewardRisk,
      })
    : null;

  const futureMap = futureRaw
    ? {
        symbol,
        bullProbability: num(
          futureRaw.bullProbability ?? futureRaw.bull ?? futureRaw.scenarios?.bull
        ),
        baseProbability: num(
          futureRaw.baseProbability ?? futureRaw.base ?? futureRaw.scenarios?.base
        ),
        bearProbability: num(
          futureRaw.bearProbability ?? futureRaw.bear ?? futureRaw.scenarios?.bear
        ),
        referencePrice: num(futureRaw.currentPrice ?? futureRaw.price),
        scenarioAsOf: text(futureRaw.calculatedAt) || null,
        livePrice: null as number | null,
        livePriceAsOf: null as string | null,
        livePriceProvider: null as string | null,
        targetOne: num(
          futureRaw.targetOne ?? futureRaw.targets?.targetOne ?? tradePlan?.targetOne
        ),
        targetTwo: num(
          futureRaw.targetTwo ?? futureRaw.targets?.targetTwo ?? tradePlan?.targetTwo
        ),
        invalidation: num(
          futureRaw.invalidation ??
            futureRaw.invalidationPrice ??
            tradePlan?.invalidationPrice
        ),
        entryLow: num(
          futureRaw.entryLow ?? futureRaw.entryZone?.low ?? tradePlan?.entryZoneLow
        ),
        entryHigh: num(
          futureRaw.entryHigh ?? futureRaw.entryZone?.high ?? tradePlan?.entryZoneHigh
        ),
        expectedMove: num(
          futureRaw.expectedMove?.expectedMovePercent ??
            futureRaw.expectedMove ??
            tradePlan?.expectedMovePercent
        ),
        stopDistance: num(
          futureRaw.stopDistance ?? tradePlan?.stopDistancePercent
        ),
        rewardRisk:
          futureRaw.rewardRisk ??
          futureRaw.rewardToRisk ??
          tradePlan?.rewardToRisk ??
          null,
        scenarioQuality: num(
          futureRaw.scenarioQuality ??
            futureRaw.modelQuality ??
            futureRaw.qualityScore ??
            tradePlan?.qualityScore
        ),
        scenarioLabel: text(
          futureRaw.scenarioLabel ??
            futureRaw.qualityLabel ??
            tradePlan?.qualityLabel,
          "Unclassified"
        ),
        confidence: num(futureRaw.confidence ?? tradePlan?.confidence),
        expectedValue: num(
          futureRaw.expectedValue ?? tradePlan?.expectedValuePercent
        ),
        grade: futureRaw.grade ?? null,
        riskLabel:
          futureRaw.riskLabel ?? futureRaw.risk ?? futureRaw.riskLevel ?? null,
      }
    : null;

  const { liveQuoteRaw, watchPulseRows } = liveContext;

  const liveQuoteMap = new Map<string, WorkspaceLiveQuote>(
    (Array.isArray(liveQuoteRaw?.quotes) ? liveQuoteRaw.quotes : []).map(
      (quote: WorkspaceLiveQuote): [string, WorkspaceLiveQuote] => [
        text(quote.ticker).toUpperCase(),
        quote,
      ]
    )
  );
  const selectedQuote = liveQuoteMap.get(symbol);

  stock.price = num(selectedQuote?.price);
  stock.changePercent = num(selectedQuote?.changePercent);
  stock.priceAsOf = toIsoTimestamp(selectedQuote?.updatedMs);
  stock.priceProvider = selectedQuote
    ? `Massive (${text(selectedQuote.source, "stock")})`
    : null;
  stock.priceStatus = getPriceStatus(selectedQuote?.updatedMs, selectedQuote?.source);

  if (futureMap) {
    futureMap.livePrice = stock.price;
    futureMap.livePriceAsOf = stock.priceAsOf;
    futureMap.livePriceProvider = stock.priceProvider;
  }

  const watchlist = watchPulseRows.map(({ watchSymbol, raw, watchPulse }) => {
      const quote = liveQuoteMap.get(watchSymbol);

      return {
        symbol: watchSymbol,
        name: text(raw?.name ?? raw?.companyName, watchSymbol),
        price: num(quote?.price),
        changePercent: num(quote?.changePercent),
        priceAsOf: toIsoTimestamp(quote?.updatedMs),
        priceProvider: quote
          ? `Massive (${text(quote.source, "stock")})`
          : null,
        priceStatus: getPriceStatus(quote?.updatedMs, quote?.source),
        pulse: num(
          raw?.rawPulse ?? raw?.score ?? raw?.amsaScore ?? watchPulse?.score
        ),
        direction: normalizeWorkspaceDirection(
          raw?.direction ?? watchPulse?.direction
        ),
      };
    });

  const marketQuotes = Array.isArray(marketRaw?.quotes) ? marketRaw.quotes : [];
  const marketQuoteMap = new Map(
    marketQuotes.map((quote: { ticker?: unknown }) => [text(quote.ticker), quote])
  );
  const bitcoinQuote = Array.isArray(cryptoRaw?.rows)
    ? cryptoRaw.rows.find((row: { symbol?: unknown }) => text(row.symbol) === "BTC")
    : null;

  const market = MARKET_ITEMS.map((item) => {
    const quote = item.symbol === "BTC"
      ? bitcoinQuote ?? marketQuoteMap.get(item.ticker)
      : marketQuoteMap.get(item.ticker);

    return {
      symbol: item.symbol,
      label: item.label,
      price: num(quote?.price ?? quote?.currentPrice),
      changePercent: num(quote?.changePercent ?? quote?.changePct),
    };
  });

  const radar: WorkspacePulseRadar = {
    highest: Array.isArray(radarRaw?.highest) ? radarRaw.highest : [],
    improved: Array.isArray(radarRaw?.improved) ? radarRaw.improved : [],
    warnings: Array.isArray(radarRaw?.warnings) ? radarRaw.warnings : [],
    asOf: text(radarRaw?.asOf) || null,
  };

  return NextResponse.json({
    stock,
    futureMap,
    watchlist,
    market,
    radar,
  });
}