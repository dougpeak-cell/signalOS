import { NextRequest, NextResponse } from "next/server";
import { resolveMarketTickerAlias } from "@/lib/market/indexAliases";
import { resolveMassiveQuote, type MassiveQuoteResponse } from "@/app/api/massive/quote/route";

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
  raw: MassiveQuoteResponse,
  fallbackTicker: string
): NormalizedQuote {
  const ticker = normalizeTicker(raw.ticker || fallbackTicker);

  const price =
    toNumber(raw.price) ??
    null;

  const change = toNumber(raw.change);

  const changePercent =
    toNumber(raw.changePct);

  const volume = toNumber(raw.volume);
  const avgVolume = toNumber(raw.avgVolume);

  const updatedMs = normalizeUpdatedMs(
    toNumber(raw.updatedMs)
  );

  return {
    ticker,
    price: price != null && price > 0 ? price : null,
    change,
    changePercent,
    volume,
    avgVolume,
    updatedMs,
  };
}

async function fetchSingleQuote(ticker: string): Promise<NormalizedQuote> {
  try {
    const quote = await resolveMassiveQuote(ticker);

    if (!quote) {
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

    return normalizeQuote(quote, ticker);
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

    const results = await Promise.all(
      tickers.map((ticker) => fetchSingleQuote(ticker))
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
