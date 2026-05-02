import { NextRequest, NextResponse } from "next/server";
import { resolveMarketTickerAlias } from "@/lib/market/indexAliases";

type UpstreamHistoryPoint = {
  time?: string;
  date?: string;
  datetime?: string;
  timestamp?: string | number;
  close?: number | null;
  price?: number | null;
  value?: number | null;
};

type NormalizedHistory = {
  ticker: string;
  series: number[];
};

function normalizeTicker(value: string): string {
  return resolveMarketTickerAlias(value);
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeSeries(rows: UpstreamHistoryPoint[]): number[] {
  return rows
    .map((row) => {
      const value =
        toNumber(row.close) ??
        toNumber(row.price) ??
        toNumber(row.value);

      return value != null && value > 0 ? Number(value) : null;
    })
    .filter((value): value is number => value != null);
}

function extractHistoryRows(json: unknown): UpstreamHistoryPoint[] {
  if (Array.isArray(json)) return json as UpstreamHistoryPoint[];

  if (
    json &&
    typeof json === "object" &&
    Array.isArray((json as { data?: unknown[] }).data)
  ) {
    return (json as { data: UpstreamHistoryPoint[] }).data;
  }

  if (
    json &&
    typeof json === "object" &&
    Array.isArray((json as { history?: unknown[] }).history)
  ) {
    return (json as { history: UpstreamHistoryPoint[] }).history;
  }

  if (
    json &&
    typeof json === "object" &&
    Array.isArray((json as { prices?: unknown[] }).prices)
  ) {
    return (json as { prices: UpstreamHistoryPoint[] }).prices;
  }

  if (
    json &&
    typeof json === "object" &&
    Array.isArray((json as { results?: unknown[] }).results)
  ) {
    return (json as { results: UpstreamHistoryPoint[] }).results;
  }

  if (
    json &&
    typeof json === "object" &&
    Array.isArray((json as { points?: unknown[] }).points)
  ) {
    return (json as { points: UpstreamHistoryPoint[] }).points;
  }

  return [];
}

async function fetchSingleHistory(
  origin: string,
  ticker: string,
  range: string,
  interval: string
): Promise<NormalizedHistory> {
  try {
    const res = await fetch(
      `${origin}/api/massive/history?ticker=${encodeURIComponent(
        ticker
      )}&range=${encodeURIComponent(range)}&interval=${encodeURIComponent(
        interval
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return { ticker, series: [] };
    }

    const json = (await res.json()) as unknown;
    const rows = extractHistoryRows(json);
    const series = normalizeSeries(rows);

    return { ticker, series };
  } catch {
    return { ticker, series: [] };
  }
}

export async function GET(req: NextRequest) {
  try {
    const tickersParam = req.nextUrl.searchParams.get("tickers") || "";
    const range = req.nextUrl.searchParams.get("range") || "1D";
    const interval = req.nextUrl.searchParams.get("interval") || "5m";

    const tickers = Array.from(
      new Set(
        tickersParam
          .split(",")
          .map(normalizeTicker)
          .filter(Boolean)
      )
    );

    if (tickers.length === 0) {
      return NextResponse.json(
        { histories: [], error: "Missing tickers query param" },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin;

    const histories = await Promise.all(
      tickers.map((ticker) =>
        fetchSingleHistory(origin, ticker, range, interval)
      )
    );

    return NextResponse.json({
      histories,
      range,
      interval,
    });
  } catch (error) {
    return NextResponse.json(
      {
        histories: [],
        error:
          error instanceof Error
            ? error.message
            : "Unknown histories batch error",
      },
      { status: 500 }
    );
  }
}