import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  calculateAMSAContext,
  calculateStockPulse,
  marketPulseToSnapshot,
  recordPulseSnapshot,
  sectorPulseToSnapshot,
  stockPulseToSnapshot,
  type HistoricalBar,
} from "@/lib/amsa";

export const dynamic =
  "force-dynamic";

type HistoryRouteBar = {
  time?: string | number;
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type HistoryResponse = {
  bars?: HistoryRouteBar[];

  results?: {
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
  }[];
};

const SECTORS = [
  {
    sector: "Technology",
    symbol: "XLK",
  },
  {
    sector:
      "Communication Services",
    symbol: "XLC",
  },
  {
    sector:
      "Consumer Discretionary",
    symbol: "XLY",
  },
  {
    sector:
      "Consumer Staples",
    symbol: "XLP",
  },
  {
    sector: "Energy",
    symbol: "XLE",
  },
  {
    sector: "Financials",
    symbol: "XLF",
  },
  {
    sector: "Healthcare",
    symbol: "XLV",
  },
  {
    sector: "Industrials",
    symbol: "XLI",
  },
  {
    sector: "Materials",
    symbol: "XLB",
  },
  {
    sector: "Real Estate",
    symbol: "XLRE",
  },
  {
    sector: "Utilities",
    symbol: "XLU",
  },
] as const;

export async function GET(
  request: NextRequest,
) {
  try {
    const symbol =
      (
        request.nextUrl.searchParams.get(
          "symbol",
        ) ?? "NVDA"
      )
        .trim()
        .toUpperCase();

    if (
      !/^[A-Z0-9.^-]{1,12}$/.test(
        symbol,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid stock symbol.",
        },
        {
          status: 400,
        },
      );
    }

    const origin =
      request.nextUrl.origin;

    const symbols = [
      "SPY",
      "QQQ",
      "DIA",
      "IWM",
      symbol,
      ...SECTORS.map(
        (sector) =>
          sector.symbol,
      ),
    ];

    const uniqueSymbols =
      Array.from(
        new Set(symbols),
      );

    const historyEntries =
      await Promise.all(
        uniqueSymbols.map(
          async (
            currentSymbol,
          ) => {
            const bars =
              await fetchHistory(
                origin,
                currentSymbol,
              );

            return [
              currentSymbol,
              bars,
            ] as const;
          },
        ),
      );

    const historyMap =
      new Map(
        historyEntries,
      );

    const stockBars =
      historyMap.get(symbol) ??
      [];

    const preliminaryStockPulse =
      calculateStockPulse(
        stockBars,
        {
          symbol,
        },
      );

    const context =
      calculateAMSAContext({
        market: {
          indices: [
            {
              symbol: "SPY",
              name: "S&P 500",
              bars:
                historyMap.get(
                  "SPY",
                ) ?? [],
              weight: 0.32,
            },
            {
              symbol: "QQQ",
              name: "Nasdaq 100",
              bars:
                historyMap.get(
                  "QQQ",
                ) ?? [],
              weight: 0.26,
            },
            {
              symbol: "DIA",
              name:
                "Dow Jones Industrial Average",
              bars:
                historyMap.get(
                  "DIA",
                ) ?? [],
              weight: 0.2,
            },
            {
              symbol: "IWM",
              name:
                "Russell 2000",
              bars:
                historyMap.get(
                  "IWM",
                ) ?? [],
              weight: 0.22,
            },
          ],

          /*
           * Add real breadth, VIX, and macro inputs here when
           * those routes are connected.
           *
           * Never insert placeholder scores.
           */
          breadth: null,
          volatility: null,
          macro: null,
        },

        sectors:
          SECTORS.map(
            (sector) => ({
              sector:
                sector.sector,

              symbol:
                sector.symbol,

              bars:
                historyMap.get(
                  sector.symbol,
                ) ?? [],

              benchmarkBars:
                historyMap.get(
                  "SPY",
                ) ?? [],
            }),
          ),

        alignment: {
          stockPulse:
            preliminaryStockPulse.score,

          marketPulse: null,
        },
      });

    /*
     * Replace this map with your actual symbol profile or FMP
     * sector classification.
     */
    const guessedSector =
      symbol === "NVDA" ||
      symbol === "AMD" ||
      symbol === "MSFT" ||
      symbol === "AAPL"
        ? "Technology"
        : null;

    const matchingSector =
      context.sectors.find(
        (sector) =>
          sector.sector ===
          guessedSector,
      );

    const finalStockPulse =
      calculateStockPulse(
        stockBars,
        {
          symbol,

          context: {
            sectorName:
              matchingSector?.sector ??
              null,

            sectorScore:
              matchingSector?.score ??
              null,

            sectorConfidence:
              matchingSector?.confidence ??
              null,

            marketScore:
              context.market?.score ??
              null,

            marketConfidence:
              context.market?.confidence ??
              null,
          },
        },
      );

    const stockAlignment =
      context.market
        ? calculateAMSAContext({
            alignment: {
              stockPulse:
                finalStockPulse.score,

              sectorPulse:
                matchingSector?.score ??
                null,

              industryPulse:
                null,

              marketPulse:
                context.market.score,

              stockDirection:
                finalStockPulse.direction,

              sectorDirection:
                matchingSector?.direction ??
                null,

              marketDirection:
                context.market.direction,
            },
          }).alignment
        : null;

    const snapshotTasks: Promise<unknown>[] = [];

    if (context.market) {
      snapshotTasks.push(
        recordPulseSnapshot(
          marketPulseToSnapshot(
            context.market,
            {
              frequency: "daily",
            },
          ),
        ),
      );
    }

    for (const sector of context.sectors) {
      snapshotTasks.push(
        recordPulseSnapshot(
          sectorPulseToSnapshot(
            sector,
            {
              frequency: "daily",
            },
          ),
        ),
      );
    }

    snapshotTasks.push(
      recordPulseSnapshot(
        stockPulseToSnapshot(
          finalStockPulse,
          {
            frequency: "daily",

            sourceUpdatedAt:
              toSourceUpdatedAt(
                stockBars.at(-1)?.time,
              ),

            metadata: {
              alignment:
                stockAlignment,
            },
          },
        ),
      ),
    );

    const snapshotResults =
      await Promise.allSettled(
        snapshotTasks,
      );

    const snapshotFailures =
      snapshotResults.filter(
        (result) =>
          result.status ===
          "rejected",
      );

    if (snapshotFailures.length) {
      console.error(
        "Some AMSA snapshots failed:",
        snapshotFailures,
      );
    }

    return NextResponse.json({
      success: true,

      stock: finalStockPulse,

      alignment:
        stockAlignment,

      market:
        context.market,

      sectors:
        context.sectors,

      calculatedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "AMSA context route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "AMSA Context Intelligence could not complete the calculation.",
      },
      {
        status: 500,
      },
    );
  }
}

async function fetchHistory(
  origin: string,
  symbol: string,
): Promise<HistoricalBar[]> {
  try {
    const response =
      await fetch(
        `${origin}/api/history?ticker=${encodeURIComponent(
          symbol,
        )}&range=1y`,
        {
          cache: "no-store",
        },
      );

    if (!response.ok) {
      return [];
    }

    const payload =
      (await response.json()) as HistoryResponse;

    return normalizeHistory(
      payload,
    );
  } catch (error) {
    console.error(
      `History load failed for ${symbol}:`,
      error,
    );

    return [];
  }
}

function normalizeHistory(
  response: HistoryResponse,
): HistoricalBar[] {
  if (
    Array.isArray(
      response.bars,
    )
  ) {
    return response.bars.map(
      (bar) => ({
        time:
          bar.time ??
          bar.date ??
          0,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }),
    );
  }

  if (
    Array.isArray(
      response.results,
    )
  ) {
    return response.results.map(
      (bar) => ({
        time: bar.t,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
      }),
    );
  }

  return [];
}

function toSourceUpdatedAt(
  value: string | number | undefined,
): string | null {
  if (value === undefined) {
    return null;
  }

  const numericValue =
    typeof value === "number" && value < 10_000_000_000
      ? value * 1000
      : value;
  const date = new Date(numericValue);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}