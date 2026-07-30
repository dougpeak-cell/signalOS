import {
  calculateAlignment,
} from "../alignment/alignment";

import {
  calculatePulseEvolution,
} from "../evolution/evolution";

import {
  recordPulseSnapshot,
} from "../evolution/recordPulse";

import {
  stockPulseToSnapshot,
} from "../evolution/snapshot";

import {
  SupabaseAMSAPulseRepository,
} from "../evolution/supabaseRepository";

import {
  calculateStockPulse,
} from "../engine";

import {
  resolveCurrentStockPulse,
} from "../get-current-stock-pulse";

import {
  createFutureMapInput,
} from "../future/fromStockPulse";

import {
  calculateFutureMap,
} from "../future/futureMap";

import {
  calculateIndustryPulse,
} from "../industry/industryPulse";

import {
  calculateMarketPulse,
} from "../market/marketPulse";

import {
  calculateSectorPulse,
} from "../sector/sectorPulse";

import type {
  AMSAFutureMapHorizon,
  AMSAIndustryPulse,
  AMSALiveFutureMapResult,
  AMSAMarketPulseInput,
  AMSAPulseEvolution,
  AMSASectorPulse,
  HistoricalBar,
} from "../types";

import {
  resolveSymbolClassification,
} from "./classification";

import {
  loadDailyHistory,
} from "./history";

import {
  loadLiveQuote,
} from "./quote";

import {
  calculateLiveTechnicals,
} from "./technicals";

/* =========================================================
   LIVE FUTUREMAP ORCHESTRATOR
========================================================= */

const MARKET_INDICES = [
  {
    symbol: "SPY",
    name: "S&P 500",
    weight: 0.32,
  },
  {
    symbol: "QQQ",
    name: "Nasdaq 100",
    weight: 0.26,
  },
  {
    symbol: "DIA",
    name:
      "Dow Jones Industrial Average",
    weight: 0.2,
  },
  {
    symbol: "IWM",
    name: "Russell 2000",
    weight: 0.22,
  },
] as const;

export async function calculateLiveFutureMap({
  origin,
  symbol: rawSymbol,
  horizon = "swing",
  recordSnapshot = false,
}: {
  origin: string;
  symbol: string;

  horizon?:
    AMSAFutureMapHorizon;

  recordSnapshot?: boolean;
}): Promise<AMSALiveFutureMapResult> {
  const startedAt =
    performance.now();

  const symbol =
    normalizeSymbol(
      rawSymbol,
    );

  const warnings: string[] = [];
  const missingData: string[] = [];

  const timings:
    Record<string, number> = {};

  /*
   * Quote, classification, stock history, and market histories
   * are independent and can load concurrently.
   */
  const [
    quoteResult,
    classificationResult,
    stockHistoryResult,
    marketHistoryEntries,
  ] = await Promise.all([
    loadLiveQuote({
      origin,
      symbol,
    }),

    resolveSymbolClassification({
      origin,
      symbol,
    }),

    loadDailyHistory({
      origin,
      symbol,
      range: "2y",
    }),

    Promise.all(
      MARKET_INDICES.map(
        async (index) => {
          const result =
            await loadDailyHistory({
              origin,
              symbol:
                index.symbol,

              range: "1y",
            });

          return {
            ...index,
            ...result,
          };
        },
      ),
    ),
  ]);

  timings.quote =
    quoteResult.durationMs;

  timings.classification =
    classificationResult.durationMs;

  timings.stockHistory =
    stockHistoryResult.durationMs;

  timings.marketHistory =
    Math.max(
      0,
      ...marketHistoryEntries.map(
        (entry) =>
          entry.durationMs,
      ),
    );

  pushWarning(
    warnings,
    quoteResult.warning,
  );

  pushWarning(
    warnings,
    classificationResult.warning,
  );

  pushWarning(
    warnings,
    stockHistoryResult.warning,
  );

  for (
    const marketEntry of
      marketHistoryEntries
  ) {
    pushWarning(
      warnings,
      marketEntry.warning
        ? `${marketEntry.symbol}: ${marketEntry.warning}`
        : null,
    );
  }

  const stockBars =
    stockHistoryResult.bars;

  if (stockBars.length < 20) {
    missingData.push(
      "Sufficient stock history",
    );
  }

  if (!quoteResult.quote) {
    missingData.push(
      "Live quote",
    );
  }

  const marketInput:
    AMSAMarketPulseInput = {
      indices:
        marketHistoryEntries.map(
          (entry) => ({
            symbol:
              entry.symbol,

            name:
              entry.name,

            weight:
              entry.weight,

            bars:
              entry.bars,
          }),
        ),

      /*
       * Connect your existing breadth, VIX, yield, dollar,
       * and macro routes here when available.
       *
       * FutureMap safely accepts null rather than fabricated data.
       */
      breadth: null,
      volatility: null,
      macro: null,
    };

  const marketStart =
    performance.now();

  const market =
    calculateMarketPulse(
      marketInput,
    );

  timings.marketPulse =
    elapsed(
      marketStart,
    );

  const classification =
    classificationResult.classification;

  let sectorBars:
    HistoricalBar[] = [];

  let sector:
    AMSASectorPulse | null =
      null;

  if (
    classification.sector &&
    classification.sectorEtf
  ) {
    const sectorHistory =
      await loadDailyHistory({
        origin,

        symbol:
          classification
            .sectorEtf,

        range: "1y",
      });

    timings.sectorHistory =
      sectorHistory.durationMs;

    pushWarning(
      warnings,
      sectorHistory.warning,
    );

    sectorBars =
      sectorHistory.bars;

    const sectorStart =
      performance.now();

    sector =
      calculateSectorPulse({
        sector:
          classification.sector,

        symbol:
          classification
            .sectorEtf,

        bars:
          sectorBars,

        benchmarkBars:
          marketHistoryEntries.find(
            (entry) =>
              entry.symbol ===
              "SPY",
          )?.bars ?? [],

        marketPulse:
          market.score,
      });

    timings.sectorPulse =
      elapsed(
        sectorStart,
      );
  } else {
    missingData.push(
      "Sector classification",
    );
  }

  /*
   * Phase 4C uses the stock itself as the minimum industry
   * constituent when a complete peer universe is unavailable.
   *
   * This creates partial industry context, clearly marked with
   * reduced confidence. Replace it later with your industry peer
   * route or FMP stock screener results.
   */
  let industry:
    AMSAIndustryPulse | null =
      null;

  const preliminaryStockStart =
    performance.now();

  const preliminaryStock =
    stockBars.length >= 20
      ? calculateStockPulse(
          stockBars,
          {
            symbol,
          },
        )
      : null;

  timings.preliminaryStock =
    elapsed(
      preliminaryStockStart,
    );

  if (
    classification.industry &&
    classification.sector &&
    preliminaryStock
  ) {
    const industryStart =
      performance.now();

    industry =
      calculateIndustryPulse({
        industry:
          classification.industry,

        sector:
          classification.sector,

        constituentPulses: [
          {
            symbol,

            pulse:
              preliminaryStock.score,

            weight: 1,

            changePercent:
              quoteResult.quote
                ?.changePercent ??
              null,
          },
        ],

        sectorPulse:
          sector?.score ??
          null,

        marketPulse:
          market.score,
      });

    timings.industryPulse =
      elapsed(
        industryStart,
      );

    industry = {
      ...industry,

      status: "partial",

      confidence:
        Math.min(
          industry.confidence,
          42,
        ),

      warnings: [
        ...industry.warnings,

        "Industry Pulse currently uses limited constituent coverage.",
      ],
    };
  } else {
    missingData.push(
      "Industry context",
    );
  }

  const alignmentStart =
    performance.now();

  const preliminaryAlignment =
    preliminaryStock
      ? calculateAlignment({
          stockPulse:
            preliminaryStock.score,

          industryPulse:
            industry?.score ??
            null,

          sectorPulse:
            sector?.score ??
            null,

          marketPulse:
            market.score,

          stockDirection:
            preliminaryStock.direction,

          industryDirection:
            industry?.direction ??
            null,

          sectorDirection:
            sector?.direction ??
            null,

          marketDirection:
            market.direction,
        })
      : null;

  timings.preliminaryAlignment =
    elapsed(
      alignmentStart,
    );

  const finalStockStart =
    performance.now();

  const contextualStock =
    stockBars.length >= 20
      ? calculateStockPulse(
          stockBars,
          {
            symbol,

            context: {
              sectorName:
                classification.sector,

              sectorScore:
                sector?.score ??
                null,

              sectorConfidence:
                sector?.confidence ??
                null,

              marketScore:
                market.score,

              marketConfidence:
                market.confidence,
            },
          },
        )
      : null;

  const currentStockPulse =
    stockBars.length >= 20
      ? await resolveCurrentStockPulse(symbol, { bars: stockBars })
      : null;

  const stock =
    contextualStock && currentStockPulse
      ? {
          ...contextualStock,
          score: currentStockPulse.current.rawPulse,
          state: currentStockPulse.current.label,
          direction: currentStockPulse.current.direction,
          confidence: currentStockPulse.current.confidence,
          calculatedAt: currentStockPulse.current.asOf,
          updatedAt: currentStockPulse.current.asOf,
        }
      : contextualStock;

  timings.stockPulse =
    elapsed(
      finalStockStart,
    );

  const finalAlignmentStart =
    performance.now();

  const alignment =
    stock
      ? calculateAlignment({
          stockPulse:
            stock.score,

          industryPulse:
            industry?.score ??
            null,

          sectorPulse:
            sector?.score ??
            null,

          marketPulse:
            market.score,

          stockDirection:
            stock.direction,

          industryDirection:
            industry?.direction ??
            null,

          sectorDirection:
            sector?.direction ??
            null,

          marketDirection:
            market.direction,
        })
      : preliminaryAlignment;

  timings.alignment =
    elapsed(
      finalAlignmentStart,
    );

  let evolution:
    AMSAPulseEvolution | null =
      null;

  if (stock) {
    const evolutionStart =
      performance.now();

    evolution =
      await loadEvolution(
        symbol,
      );

    timings.evolution =
      elapsed(
        evolutionStart,
      );

    if (!evolution) {
      missingData.push(
        "Stored Pulse Evolution",
      );
    }
  }

  const technicals =
    calculateLiveTechnicals(
      stockBars,
    );

  const livePrice =
    quoteResult.quote?.price ??
    stock?.currentPrice ??
    stockBars.at(-1)?.close ??
    null;

  let futureMap =
    null;

  if (stock) {
    const futureStart =
      performance.now();

    const futureInput =
      createFutureMapInput({
        stock,
        market,
        sector,
        industry,
        alignment,
        evolution,
        horizon,
      });

    futureMap =
      calculateFutureMap({
        ...futureInput,

        stockPulse:
          currentStockPulse?.current.rawPulse ??
          futureInput.stockPulse,

        currentPrice:
          livePrice,

        technicals: {
          ...(futureInput.technicals ?? {}),
          ...technicals,
        },

        calculatedAt:
          new Date().toISOString(),
      });

    timings.futureMap =
      elapsed(
        futureStart,
      );
  }

  if (
    recordSnapshot &&
    stock
  ) {
    void recordStockSnapshot({
      stock,
      quoteTimestamp:
        quoteResult.quote
          ?.timestamp ??
        null,

      horizon,
      futureMap,
    });
  }

  timings.total =
    elapsed(
      startedAt,
    );

  return {
    success:
      futureMap !== null,

    symbol,
    horizon,

    quote:
      quoteResult.quote,

    classification,

    stock,
    market,
    sector,
    industry,
    alignment,
    evolution,
    futureMap,

    diagnostics: {
      symbol,

      quoteLoaded:
        quoteResult.quote !==
        null,

      historyLoaded:
        stockBars.length > 0,

      stockPulseCalculated:
        stock !== null,

      marketPulseCalculated:
        market.score !== null,

      sectorPulseCalculated:
        sector?.score !==
        null &&
        sector?.score !==
        undefined,

      industryPulseCalculated:
        industry?.score !==
        null &&
        industry?.score !==
        undefined,

      alignmentCalculated:
        alignment?.score !==
        null &&
        alignment?.score !==
        undefined,

      evolutionLoaded:
        evolution !== null,

      futureMapCalculated:
        futureMap !== null,

      historyBars:
        stockBars.length,

      quoteSource:
        quoteResult.quote
          ?.source ??
        null,

      classificationSource:
        classification.source,

      missingData:
        Array.from(
          new Set(
            missingData,
          ),
        ),

      warnings:
        Array.from(
          new Set(
            warnings,
          ),
        ),

      timings,

      generatedAt:
        new Date().toISOString(),
    },

    calculatedAt:
      new Date().toISOString(),
  };
}

async function loadEvolution(
  symbol: string,
): Promise<AMSAPulseEvolution | null> {
  try {
    const repository =
      new SupabaseAMSAPulseRepository();

    const snapshots =
      await repository.getSnapshots({
        entityType: "stock",
        entityKey: symbol,

        limit: 30,
        frequency: "daily",
      });

    return snapshots.length
      ? calculatePulseEvolution(
          snapshots,
        )
      : null;
  } catch (error) {
    console.error(
      `FutureMap evolution load failed for ${symbol}:`,
      error,
    );

    return null;
  }
}

async function recordStockSnapshot({
  stock,
  quoteTimestamp,
  horizon,
  futureMap,
}: {
  stock:
    NonNullable<
      AMSALiveFutureMapResult["stock"]
    >;

  quoteTimestamp:
    string | null;

  horizon:
    AMSAFutureMapHorizon;

  futureMap:
    AMSALiveFutureMapResult["futureMap"];
}) {
  try {
    await recordPulseSnapshot(
      stockPulseToSnapshot(
        stock,
        {
          frequency: "daily",

          sourceUpdatedAt:
            quoteTimestamp,

          metadata: {
            futureMap: futureMap
              ? {
                  horizon,

                  bias:
                    futureMap.bias,

                  grade:
                    futureMap.grade,

                  primaryScenario:
                    futureMap.primaryScenario,

                  bullProbability:
                    futureMap.bullProbability,

                  baseProbability:
                    futureMap.baseProbability,

                  bearProbability:
                    futureMap.bearProbability,

                  confidence:
                    futureMap.confidence,
                }
              : null,
          },
        },
      ),
    );
  } catch (error) {
    console.error(
      "FutureMap stock snapshot failed:",
      error,
    );
  }
}

function normalizeSymbol(
  value: string,
): string {
  const symbol =
    value
      .trim()
      .toUpperCase();

  if (
    !/^[A-Z0-9.^:-]{1,20}$/.test(
      symbol,
    )
  ) {
    throw new Error(
      "Invalid stock symbol.",
    );
  }

  return symbol;
}

function elapsed(
  startedAt: number,
): number {
  return Math.round(
    performance.now() -
      startedAt,
  );
}

function pushWarning(
  warnings: string[],
  warning:
    | string
    | null
    | undefined,
) {
  if (warning) {
    warnings.push(warning);
  }
}