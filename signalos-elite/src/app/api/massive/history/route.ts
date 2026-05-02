import { NextRequest, NextResponse } from "next/server";
import { resolveMarketTickerAlias } from "@/lib/market/indexAliases";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INDEX_MAP: Record<string, string> = {
  "^GSPC": "I:SPX",
  "^NDX": "I:NDX",
  "^IXIC": "I:COMP",
  "^DJI": "I:DJI",
  "^RUT": "I:RUT",
  "^VIX": "I:VIX",
};

type AggregateRow = {
  t?: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
};

type NormalizedHistoryPoint = {
  time: string;
  date: string;
  timestamp: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

function normalizeTicker(value: string | null): string {
  const normalized = resolveMarketTickerAlias(String(value ?? ""));
  return INDEX_MAP[normalized] ?? normalized;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getApiKey(): string {
  return (
    process.env.MASSIVE_API_KEY ||
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ||
    ""
  );
}

function rangeToStartDate(range: string, now: Date): Date {
  const start = new Date(now);
  const normalized = range.trim().toLowerCase();

  switch (normalized) {
    case "1d":
      start.setDate(now.getDate() - 2);
      return start;
    case "5d":
      start.setDate(now.getDate() - 7);
      return start;
    case "1mo":
    case "1m":
      start.setMonth(now.getMonth() - 1);
      return start;
    case "3mo":
    case "3m":
      start.setMonth(now.getMonth() - 3);
      return start;
    case "6mo":
    case "6m":
      start.setMonth(now.getMonth() - 6);
      return start;
    case "1y":
      start.setFullYear(now.getFullYear() - 1);
      return start;
    case "5y":
      start.setFullYear(now.getFullYear() - 5);
      return start;
    default:
      start.setDate(now.getDate() - 30);
      return start;
  }
}

function intervalToAgg(interval: string): { multiplier: number; timespan: string } {
  const normalized = interval.trim().toLowerCase();

  switch (normalized) {
    case "1m":
      return { multiplier: 1, timespan: "minute" };
    case "2m":
      return { multiplier: 2, timespan: "minute" };
    case "3m":
      return { multiplier: 3, timespan: "minute" };
    case "5m":
      return { multiplier: 5, timespan: "minute" };
    case "10m":
      return { multiplier: 10, timespan: "minute" };
    case "15m":
      return { multiplier: 15, timespan: "minute" };
    case "30m":
      return { multiplier: 30, timespan: "minute" };
    case "1h":
      return { multiplier: 1, timespan: "hour" };
    case "4h":
      return { multiplier: 4, timespan: "hour" };
    case "1day":
    case "day":
    case "1d":
      return { multiplier: 1, timespan: "day" };
    case "1week":
    case "week":
    case "1w":
      return { multiplier: 1, timespan: "week" };
    default:
      return { multiplier: 5, timespan: "minute" };
  }
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeRows(rows: AggregateRow[]): NormalizedHistoryPoint[] {
  return rows
    .map((row) => {
      const timestamp = toNumber(row.t);
      const date =
        timestamp != null
          ? new Date(timestamp).toISOString()
          : new Date(0).toISOString();

      return {
        time: date,
        date,
        timestamp: timestamp ?? 0,
        open: toNumber(row.o),
        high: toNumber(row.h),
        low: toNumber(row.l),
        close: toNumber(row.c),
        volume: toNumber(row.v),
      };
    })
    .filter((row) => row.close != null && row.close > 0);
}

export async function GET(req: NextRequest) {
  const ticker = normalizeTicker(req.nextUrl.searchParams.get("ticker"));

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Massive API key" },
      { status: 500 }
    );
  }

  const range = req.nextUrl.searchParams.get("range") || "1D";
  const interval = req.nextUrl.searchParams.get("interval") || "5m";
  const now = new Date();
  const from = rangeToStartDate(range, now);
  const { multiplier, timespan } = intervalToAgg(interval);
  const url =
    `https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(ticker)}` +
    `/range/${multiplier}/${timespan}/${formatDate(from)}/${formatDate(now)}` +
    `?adjusted=true&sort=asc&limit=5000&apiKey=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Massive history request failed for ${ticker}` },
        { status: response.status }
      );
    }

    const payload = (await response.json()) as { results?: AggregateRow[] };
    const rows = Array.isArray(payload.results) ? payload.results : [];
    const history = normalizeRows(rows);

    return NextResponse.json({
      ticker,
      range,
      interval,
      results: history,
      data: history,
      history,
      prices: history,
      points: history,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown Massive history error",
      },
      { status: 500 }
    );
  }
}