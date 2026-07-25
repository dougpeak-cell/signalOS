import { NextRequest, NextResponse } from "next/server";
import {
  calculateStockPulse,
  recordPulseSnapshot,
  stockPulseToSnapshot,
  type HistoricalBar,
} from "@/lib/amsa";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    symbol: string;
  }>;
};

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

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { symbol: rawSymbol } = await context.params;
    const symbol = rawSymbol.trim().toUpperCase();

    if (!/^[A-Z0-9.^-]{1,12}$/.test(symbol)) {
      return NextResponse.json(
        {
          error: "Invalid stock symbol.",
        },
        {
          status: 400,
        },
      );
    }

    const origin = request.nextUrl.origin;
    const historyResponse = await fetch(
      `${origin}/api/history?ticker=${encodeURIComponent(
        symbol,
      )}&range=1y`,
      {
        cache: "no-store",
      },
    );

    if (!historyResponse.ok) {
      return NextResponse.json(
        {
          error: "Historical market data could not be retrieved.",
          upstreamStatus: historyResponse.status,
        },
        {
          status: 502,
        },
      );
    }

    const history =
      (await historyResponse.json()) as HistoryResponse;

    const bars = normalizeHistoryResponse(history);

    if (!bars.length) {
      return NextResponse.json(
        {
          error: "No valid daily bars were returned.",
        },
        {
          status: 404,
        },
      );
    }

    const pulse = calculateStockPulse(bars, {
      symbol,
      context: {
        sectorScore: null,
        marketScore: null,
      },
    });

    try {
      await recordPulseSnapshot(
        stockPulseToSnapshot(
          pulse,
          {
            frequency: "daily",

            sourceUpdatedAt:
              bars.at(-1)?.time
                ? new Date(
                    normalizeBarTime(
                      bars.at(-1)!.time,
                    ),
                  ).toISOString()
                : null,
          },
        ),
      );
    } catch (snapshotError) {
      /*
       * A snapshot-storage problem should not prevent the current
       * Pulse response from being returned.
       */
      console.error(
        "AMSA stock snapshot error:",
        snapshotError,
      );
    }

    return NextResponse.json({
      success: true,
      pulse,
    });
  } catch (error) {
    console.error("AMSA route error:", error);

    return NextResponse.json(
      {
        error: "AMSA could not calculate the stock Pulse.",
      },
      {
        status: 500,
      },
    );
  }
}

function normalizeHistoryResponse(
  response: HistoryResponse,
): HistoricalBar[] {
  if (Array.isArray(response.bars)) {
    return response.bars.map((bar) => ({
      time: bar.time ?? bar.date ?? 0,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));
  }

  if (Array.isArray(response.results)) {
    return response.results.map((bar) => ({
      time: bar.t,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));
  }

  return [];
}

function normalizeBarTime(
  value: string | number,
): number {
  if (
    typeof value === "number"
  ) {
    return value <
      10_000_000_000
      ? value * 1_000
      : value;
  }

  return new Date(
    value,
  ).getTime();
}
