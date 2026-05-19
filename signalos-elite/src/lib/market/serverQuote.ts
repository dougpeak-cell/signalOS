import { resolveMarketTickerAlias } from "@/lib/market/indexAliases";
import { getQuoteState } from "@/lib/market/quotes";
import { resolveMassiveQuote } from "@/app/api/massive/quote/route";

export type ServerQuoteState = {
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  source: "api" | "fallback";
};

export type ServerQuoteMap = Record<string, ServerQuoteState>;

const MARKET_API_KEY =
  process.env.POLYGON_API_KEY ??
  process.env.MASSIVE_API_KEY ??
  process.env.NEXT_PUBLIC_MASSIVE_API_KEY ??
  "";

type DirectStockSnapshot = {
  results?: {
    day?: { c?: number };
    prevDay?: { c?: number };
    lastTrade?: { p?: number };
  };
};

type YahooQuoteResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: unknown;
        chartPreviousClose?: unknown;
        regularMarketPreviousClose?: unknown;
      };
    }>;
  };
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function isDirectStockTicker(ticker: string) {
  return !ticker.startsWith("^") && !ticker.startsWith("I:");
}

async function fetchYahooServerQuoteState(
  ticker: string
): Promise<ServerQuoteState | null> {
  if (!isDirectStockTicker(ticker)) {
    return null;
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return null;
    }

    const payload = (await res.json()) as YahooQuoteResponse;
    const meta = payload.chart?.result?.[0]?.meta;

    if (!meta) {
      return null;
    }

    const price = toNumber(meta.regularMarketPrice);
    if (price == null || price <= 0) {
      return null;
    }

    const prevClose =
      toNumber(meta.regularMarketPreviousClose) ??
      toNumber(meta.chartPreviousClose);
    const change = prevClose != null ? price - prevClose : null;
    const changePct =
      change != null && prevClose != null && prevClose !== 0
        ? (change / prevClose) * 100
        : null;

    return {
      price,
      prevClose,
      change,
      changePct,
      source: "api",
    };
  } catch {
    return null;
  }
}

async function fetchDirectServerQuoteState(
  ticker: string
): Promise<ServerQuoteState | null> {
  if (!MARKET_API_KEY || !isDirectStockTicker(ticker)) {
    return null;
  }

  try {
    const res = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}?apiKey=${MARKET_API_KEY}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return null;
    }

    const payload = (await res.json()) as DirectStockSnapshot;
    const snapshot = payload.results;
    const price =
      toNumber(snapshot?.lastTrade?.p) ??
      toNumber(snapshot?.day?.c) ??
      toNumber(snapshot?.prevDay?.c);

    if (price == null || price <= 0) {
      return null;
    }

    const prevClose = toNumber(snapshot?.prevDay?.c);
    const change =
      prevClose != null && prevClose !== 0 ? price - prevClose : null;
    const changePct =
      change != null && prevClose != null && prevClose !== 0
        ? (change / prevClose) * 100
        : null;

    return {
      price,
      prevClose,
      change,
      changePct,
      source: "api",
    };
  } catch {
    return null;
  }
}

function buildFallbackQuoteState(ticker: string): ServerQuoteState {
  const fallback = getQuoteState(ticker);
  const fallbackChange =
    fallback.price != null &&
    fallback.prevClose != null &&
    fallback.prevClose !== 0
      ? fallback.price - fallback.prevClose
      : null;

  return {
    price: fallback.price ?? null,
    prevClose: fallback.prevClose ?? null,
    change: fallbackChange,
    changePct:
      fallbackChange != null &&
      fallback.prevClose != null &&
      fallback.prevClose !== 0
        ? (fallbackChange / fallback.prevClose) * 100
        : null,
    source: "fallback",
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function fetchServerQuoteMap(
  tickers: string[],
  origin?: string
): Promise<ServerQuoteMap> {
  const normalizedTickers = Array.from(
    new Set(
      tickers
        .map((ticker) => resolveMarketTickerAlias(String(ticker ?? "").trim()))
        .filter(Boolean)
    )
  );

  if (!normalizedTickers.length) return {};

  const fallbackMap = Object.fromEntries(
    normalizedTickers.map((ticker) => [ticker, buildFallbackQuoteState(ticker)])
  ) as ServerQuoteMap;

  try {
    const next: ServerQuoteMap = { ...fallbackMap };

    const responses = await Promise.all(
      normalizedTickers.map(async (ticker) => ({
        ticker,
        directQuote: await fetchDirectServerQuoteState(ticker),
        yahooQuote: await fetchYahooServerQuoteState(ticker),
        routeQuote: await resolveMassiveQuote(ticker, {
          includePoints: false,
          includeFundamentals: false,
        }),
      }))
    );

    for (const row of responses) {
      const ticker = resolveMarketTickerAlias(String(row.ticker ?? "").trim());
      if (!ticker) continue;

      const price =
        row.directQuote?.price ??
        row.yahooQuote?.price ??
        toNumber(row.routeQuote?.price);
      if (price == null) continue;

      const prevClose =
        row.directQuote?.prevClose ??
        row.yahooQuote?.prevClose ??
        toNumber(row.routeQuote?.prevClose) ??
        null;
      const change =
        row.directQuote?.change ??
        row.yahooQuote?.change ??
        toNumber(row.routeQuote?.change) ??
        (prevClose != null && prevClose !== 0 ? price - prevClose : null);
      const changePct =
        row.directQuote?.changePct ??
        row.yahooQuote?.changePct ??
        toNumber(row.routeQuote?.changePct) ??
        (change != null && prevClose != null && prevClose !== 0
          ? (change / prevClose) * 100
          : null);

      next[ticker] = {
        price,
        prevClose,
        change,
        changePct,
        source: "api",
      };
    }

    return next;
  } catch {
    return fallbackMap;
  }
}

export async function fetchServerQuoteState(
  ticker: string,
  origin?: string
): Promise<ServerQuoteState> {
  const normalizedTicker = resolveMarketTickerAlias(String(ticker ?? "").trim());

  if (!normalizedTicker) {
    return {
      price: null,
      prevClose: null,
      change: null,
      changePct: null,
      source: "fallback",
    };
  }

  const fallback = buildFallbackQuoteState(normalizedTicker);

  try {
    const directQuote = await fetchDirectServerQuoteState(normalizedTicker);
    const yahooQuote = directQuote ? null : await fetchYahooServerQuoteState(normalizedTicker);
    const payload = directQuote || yahooQuote
      ? null
      : await resolveMassiveQuote(normalizedTicker, {
          includePoints: false,
          includeFundamentals: false,
        });
    const price = directQuote?.price ?? yahooQuote?.price ?? toNumber(payload?.price);

    if (price != null) {
      const prevClose =
        directQuote?.prevClose ?? yahooQuote?.prevClose ?? toNumber(payload?.prevClose);
      const change =
        directQuote?.change ??
        yahooQuote?.change ??
        toNumber(payload?.change) ??
        (prevClose != null && prevClose !== 0 ? price - prevClose : null);
      const changePct =
        directQuote?.changePct ??
        yahooQuote?.changePct ??
        toNumber(payload?.changePct) ??
        (change != null && prevClose != null && prevClose !== 0
          ? (change / prevClose) * 100
          : null);

      return {
        price,
        prevClose,
        change,
        changePct,
        source: "api",
      };
    }
  } catch {
    // Fall back to the static server-side quote table when the live route is unavailable.
  }

  return fallback;
}