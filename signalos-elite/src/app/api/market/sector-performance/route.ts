import { NextRequest, NextResponse } from "next/server";
import { getFmpBars } from "@/lib/market/fmpData";

type PolygonDailyAgg = {
  t: number;
  c: number;
};

type TickerPeriodPerformance = {
  day: number | null;
  week: number | null;
  month: number | null;
  ytd: number | null;
};

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function pctChange(current: number | null, anchor: number | null): number | null {
  if (
    current == null ||
    anchor == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(anchor) ||
    anchor <= 0
  ) {
    return null;
  }

  return ((current - anchor) / anchor) * 100;
}

function computePerformance(results: PolygonDailyAgg[]): TickerPeriodPerformance {
  if (!results.length) {
    return { day: null, week: null, month: null, ytd: null };
  }

  const closes = results
    .map((item) => ({
      time: Number(item.t),
      close: Number(item.c),
      year: new Date(Number(item.t)).getUTCFullYear(),
    }))
    .filter((item) => Number.isFinite(item.time) && Number.isFinite(item.close) && item.close > 0)
    .sort((left, right) => left.time - right.time);

  if (!closes.length) {
    return { day: null, week: null, month: null, ytd: null };
  }

  const latest = closes[closes.length - 1]?.close ?? null;
  const previous = closes.length > 1 ? closes[closes.length - 2]?.close ?? null : null;
  const weekAnchor = closes.length > 5 ? closes[closes.length - 6]?.close ?? null : null;
  const monthAnchor = closes.length > 21 ? closes[closes.length - 22]?.close ?? null : null;
  const currentYear = closes[closes.length - 1]?.year ?? new Date().getUTCFullYear();
  const firstCurrentYear = closes.find((item) => item.year === currentYear)?.close ?? null;

  return {
    day: pctChange(latest, previous),
    week: pctChange(latest, weekAnchor),
    month: pctChange(latest, monthAnchor),
    ytd: pctChange(latest, firstCurrentYear),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tickersParam = searchParams.get("tickers") ?? "";

    const tickers = [...new Set(
      tickersParam
        .split(",")
        .map(normalizeTicker)
        .filter(Boolean)
    )].slice(0, 60);

    if (!tickers.length) {
      return NextResponse.json({ error: "Missing tickers" }, { status: 400 });
    }

    const today = new Date();
    const from = new Date(Date.UTC(today.getUTCFullYear() - 1, 11, 20));
    const to = new Date();

    const rows = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const bars = await getFmpBars(ticker, isoDate(from), isoDate(to));
          const results = bars.map((bar) => ({ t: bar.timestamp, c: bar.close }));

          return {
            ticker,
            performance: computePerformance(results),
          };
        } catch (error) {
          console.error("FMP sector performance unavailable:", error instanceof Error ? error.message : "Unknown provider error");
          return {
            ticker,
            performance: { day: null, week: null, month: null, ytd: null },
          };
        }
      })
    );

    return NextResponse.json({
      performance: Object.fromEntries(rows.map((row) => [row.ticker, row.performance])),
      updatedAt: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load sector performance" },
      { status: 500 }
    );
  }
}