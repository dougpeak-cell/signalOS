import { NextRequest, NextResponse } from "next/server";
import { resolveMarketTickerAlias } from "@/lib/market/indexAliases";

type UpstreamQuote = {
  ticker?: string;
  symbol?: string;
  name?: string | null;
  price?: number | null;
  lastPrice?: number | null;
  last?: number | null;
  value?: number | null;
  change?: number | null;
  changePercent?: number | null;
  changePct?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  updated?: number | null;
  updatedMs?: number | null;
  timestamp?: number | null;
  lastUpdated?: number | null;
};

type NormalizedQuote = {
  ticker: string;
  name?: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  avgVolume: number | null;
  updatedMs: number | null;
};

function normalizeTicker(value: string): string {
  return resolveMarketTickerAlias(value);
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeUpdatedMs(raw: number | null): number | null {
  if (raw == null) return null;
  if (raw > 0 && raw < 10_000_000_000) return raw * 1_000;
  if (raw >= 10_000_000_000_000_000) return Math.floor(raw / 1_000_000);
  if (raw >= 10_000_000_000_000) return Math.floor(raw / 1_000);
  return raw;
}

function normalizeQuote(
  raw: UpstreamQuote,
  fallbackTicker: string
): NormalizedQuote {
  const ticker = normalizeTicker(raw.ticker || raw.symbol || fallbackTicker);

  const price =
    toNumber(raw.lastPrice) ??
    toNumber(raw.price) ??
    toNumber(raw.last) ??
    toNumber(raw.value);

  const change = toNumber(raw.change);

  const changePercent =
    toNumber(raw.changePercent) ??
    toNumber(raw.changePct);

  const volume = toNumber(raw.volume);
  const avgVolume = toNumber(raw.avgVolume);

  const updatedMs = normalizeUpdatedMs(
    toNumber(raw.updated) ??
    toNumber(raw.updatedMs) ??
    toNumber(raw.timestamp) ??
    toNumber(raw.lastUpdated)
  );

  return {
    ticker,
    name: raw.name?.trim() || undefined,
    price: price != null && price > 0 ? price : null,
    change,
    changePercent,
    volume,
    avgVolume,
    updatedMs,
  };
}

async function fetchSingleQuote(
  origin: string,
  ticker: string
): Promise<NormalizedQuote> {
  try {
    const res = await fetch(
      `${origin}/api/massive/quote?ticker=${encodeURIComponent(ticker)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return {
        ticker,
        price: null,
        change: null,
        changePercent: null,
        volume: null,
        avgVolume: null,
        updatedMs: null,
      };
    }

    const json = (await res.json()) as UpstreamQuote;
    return normalizeQuote(json, ticker);
  } catch {
    return {
      ticker,
      price: null,
      change: null,
      changePercent: null,
      volume: null,
      avgVolume: null,
      updatedMs: null,
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const tickersParam = req.nextUrl.searchParams.get("tickers") || "";

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
        { quotes: [], error: "Missing tickers query param" },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin;

    const results = await Promise.all(
      tickers.map((ticker) => fetchSingleQuote(origin, ticker))
    );

    return NextResponse.json({ quotes: results });
  } catch (error) {
    return NextResponse.json(
      {
        quotes: [],
        error:
          error instanceof Error ? error.message : "Unknown quotes batch error",
      },
      { status: 500 }
    );
  }
}
