import { NextRequest, NextResponse } from "next/server";

const MARKET_ITEMS = [
  { ticker: "^GSPC", symbol: "SPX", label: "S&P 500" },
  { ticker: "^IXIC", symbol: "IXIC", label: "Nasdaq" },
  { ticker: "^DJI", symbol: "DJI", label: "Dow" },
  { ticker: "^RUT", symbol: "RUT", label: "Russell" },
  { ticker: "^VIX", symbol: "VIX", label: "VIX" },
  { ticker: "^TNX", symbol: "TNX", label: "10Y" },
  { ticker: "X:BTCUSD", symbol: "BTC", label: "BTC" },
  { ticker: "GLD", symbol: "GLD", label: "GLD" },
] as const;

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const quoteTickers = MARKET_ITEMS
    .filter((item) => item.symbol !== "BTC")
    .map((item) => item.ticker);
  const [marketRaw, cryptoRaw] = await Promise.all([
    fetchJson(
      `${origin}/api/massive/quotes?tickers=${encodeURIComponent(quoteTickers.join(","))}`
    ),
    fetchJson(`${origin}/api/crypto/snapshot?tickers=BTC`),
  ]);
  const marketQuotes = Array.isArray(marketRaw?.quotes) ? marketRaw.quotes : [];
  const marketQuoteMap = new Map(
    marketQuotes.map((quote) => {
      const row = quote as Record<string, unknown>;
      return [String(row.ticker ?? ""), row];
    })
  );
  const cryptoRows = Array.isArray(cryptoRaw?.rows) ? cryptoRaw.rows : [];
  const bitcoinQuote = cryptoRows.find((quote) => {
    const row = quote as Record<string, unknown>;
    return row.symbol === "BTC";
  }) as Record<string, unknown> | undefined;

  const market = MARKET_ITEMS.map((item) => {
    const quote = item.symbol === "BTC"
      ? bitcoinQuote
      : marketQuoteMap.get(item.ticker);

    return {
      symbol: item.symbol,
      label: item.label,
      price: numberOrNull(quote?.price ?? quote?.currentPrice),
      changePercent: numberOrNull(quote?.changePercent ?? quote?.changePct),
    };
  });

  return NextResponse.json(
    { market, refreshedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}