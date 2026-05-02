import { NextRequest, NextResponse } from "next/server";
import { getQuoteByTicker } from "@/lib/market/quotes";
import { getCurrentMarketPhase } from "@/lib/today/marketPhase";

const INDEX_MAP: Record<string, string> = {
  "^GSPC": "SPY",
  "^IXIC": "QQQ",
  "^DJI": "DIA",
  "^RUT": "IWM",
};

const INDEX_SCALE: Record<string, number> = {
  "^GSPC": 10,
  "^IXIC": 37,
  "^DJI": 100,
  "^RUT": 10,
};

type BatchQuoteItem = {
  ticker: string;
  price: number | null;
  currentPrice: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  volume: number | null;
  avgVolume: number | null;
  rvol: number | null;
};

type MarketStatus = "live" | "last-close";

function getMarketStatus(): MarketStatus {
  const phase = getCurrentMarketPhase();
  return phase === "open" || phase === "midday" || phase === "close"
    ? "live"
    : "last-close";
}

type UpstreamBatchQuoteItem = {
  ticker?: string;
  symbol?: string;
  price?: unknown;
  currentPrice?: unknown;
  lastPrice?: unknown;
  last?: unknown;
  value?: unknown;
  change?: unknown;
  changes?: unknown;
  changePercent?: unknown;
  changePct?: unknown;
  changesPercentage?: unknown;
  previousClose?: unknown;
  prevClose?: unknown;
  volume?: unknown;
  regularMarketVolume?: unknown;
  dayVolume?: unknown;
  avgVolume?: unknown;
  averageVolume?: unknown;
  averageDailyVolume10Day?: unknown;
  averageDailyVolume3Month?: unknown;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,%()]/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function isIndexTicker(ticker: string): boolean {
  const normalized = normalizeTicker(ticker);
  return normalized in INDEX_MAP || normalized === "^VIX";
}

function normalizeChangePercent(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const cleaned = value.replace("%", "").replace("(", "").replace(")", "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function getScaleForTicker(ticker: string): number {
  return INDEX_SCALE[ticker] ?? 1;
}

function scaleMaybe(value: number | null, scale: number): number | null {
  if (value == null) return null;
  return value * scale;
}

function buildFallbackQuote(ticker: string): BatchQuoteItem {
  const normalized = normalizeTicker(ticker);
  const fallback = getQuoteByTicker(normalized);

  const price =
    toNumber((fallback as { price?: unknown })?.price) ??
    toNumber((fallback as { currentPrice?: unknown })?.currentPrice);

  const previousClose =
    toNumber((fallback as { previousClose?: unknown })?.previousClose) ??
    toNumber((fallback as { prevClose?: unknown })?.prevClose);

  const change =
    price != null && previousClose != null ? price - previousClose : null;

  const changePercent =
    change != null && previousClose != null && previousClose !== 0
      ? (change / previousClose) * 100
      : null;

  return {
    ticker: normalized,
    price,
    currentPrice: price,
    change,
    changePercent,
    previousClose,
    volume: null,
    avgVolume: null,
    rvol: null,
  };
}

function normalizeUpstreamBatchQuote(
  ticker: string,
  raw: UpstreamBatchQuoteItem
): BatchQuoteItem | null {
  const normalized = normalizeTicker(raw.ticker || raw.symbol || ticker);

  const price =
    toNumber(raw.price) ??
    toNumber(raw.currentPrice) ??
    toNumber(raw.lastPrice) ??
    toNumber(raw.last) ??
    toNumber(raw.value);

  if (price == null || price <= 0) {
    return null;
  }

  const previousClose =
    toNumber(raw.previousClose) ??
    toNumber(raw.prevClose);

  const change =
    toNumber(raw.change) ??
    toNumber(raw.changes) ??
    (previousClose != null ? price - previousClose : null);

  const changePercent =
    normalizeChangePercent(raw.changePercent) ??
    normalizeChangePercent(raw.changePct) ??
    normalizeChangePercent(raw.changesPercentage) ??
    (change != null && previousClose != null && previousClose !== 0
      ? (change / previousClose) * 100
      : null);

  const volume =
    Number(raw.volume ?? raw.regularMarketVolume ?? raw.dayVolume ?? 0) || null;

  const avgVolume =
    Number(
      raw.avgVolume ??
        raw.averageVolume ??
        raw.averageDailyVolume10Day ??
        raw.averageDailyVolume3Month ??
        0
    ) || null;

  const rvol =
    volume && avgVolume && avgVolume > 0
      ? volume / avgVolume
      : null;

  return {
    ticker: normalized,
    price,
    currentPrice: price,
    change,
    changePercent,
    volume,
    avgVolume,
    rvol,
    previousClose:
      previousClose ??
      (price != null && change != null ? price - change : null),
  };
}

async function fetchMassiveBatchQuotes(
  origin: string,
  tickers: string[]
): Promise<Record<string, BatchQuoteItem>> {
  if (tickers.length === 0) return {};

  try {
    const res = await fetch(
      `${origin}/api/massive/quotes?tickers=${encodeURIComponent(tickers.join(","))}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) return {};

    const json = (await res.json()) as { quotes?: UpstreamBatchQuoteItem[] };
    const items = Array.isArray(json.quotes) ? json.quotes : [];
    const mapped: Record<string, BatchQuoteItem> = {};

    for (const item of items) {
      const ticker = normalizeTicker(String(item.ticker || item.symbol || ""));
      if (!ticker) continue;

      const normalizedItem = normalizeUpstreamBatchQuote(ticker, item);
      if (!normalizedItem) continue;

      mapped[ticker] = normalizedItem;
    }

    return mapped;
  } catch {
    return {};
  }
}

async function fetchYahooQuote(
  ticker: string,
  symbol: string
): Promise<BatchQuoteItem | null> {
  try {
    const encodedSymbol = encodeURIComponent(symbol);
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodedSymbol}`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;

    const json = (await res.json()) as {
      quoteResponse?: {
        result?: Array<{
          regularMarketPrice?: unknown;
          regularMarketChange?: unknown;
          regularMarketChangePercent?: unknown;
          regularMarketPreviousClose?: unknown;
        }>;
      };
    };

    const quote = json.quoteResponse?.result?.[0];

    if (ticker === "^VIX" && !quote) {
      return {
        ticker,
        price: 0,
        currentPrice: 0,
        change: 0,
        changePercent: 0,
        previousClose: 0,
        volume: null,
        avgVolume: null,
        rvol: null,
      };
    }

    if (!quote) return null;

    const price = toNumber(quote.regularMarketPrice);
    const change = toNumber(quote.regularMarketChange);
    const changePercent = normalizeChangePercent(quote.regularMarketChangePercent);
    const previousClose =
      toNumber(quote.regularMarketPreviousClose) ??
      (price != null && change != null ? price - change : null);

    return {
      ticker,
      price,
      currentPrice: price,
      change,
      changePercent,
      previousClose,
      volume: null,
      avgVolume: null,
      rvol: null,
    };
  } catch {
    return null;
  }
}

async function fetchIndexAwareQuote(ticker: string): Promise<BatchQuoteItem> {
  const normalized = normalizeTicker(ticker);

  if (normalized === "^VIX") {
    const yahooQuote = await fetchYahooQuote(normalized, "^VIX");

    if (yahooQuote) {
      return yahooQuote;
    }
  }

  const upstreamTicker = INDEX_MAP[normalized] ?? normalized;
  const scale = getScaleForTicker(normalized);

  try {
    const data = await getQuoteByTicker(upstreamTicker);

    const rawPrice =
      toNumber((data as { price?: unknown })?.price) ??
      toNumber((data as { currentPrice?: unknown })?.currentPrice);

    const rawPreviousClose =
      toNumber((data as { previousClose?: unknown })?.previousClose) ??
      toNumber((data as { prevClose?: unknown })?.prevClose);

    const rawChange =
      toNumber((data as { change?: unknown })?.change) ??
      toNumber((data as { changes?: unknown })?.changes);

    const rawChangePercent =
      normalizeChangePercent((data as { changePercent?: unknown })?.changePercent) ??
      normalizeChangePercent((data as { changePct?: unknown })?.changePct) ??
      normalizeChangePercent((data as { changesPercentage?: unknown })?.changesPercentage);

    const price = scaleMaybe(rawPrice, scale);
    let previousClose = scaleMaybe(rawPreviousClose, scale);
    let change = scaleMaybe(rawChange, scale);
    let changePercent = rawChangePercent;

    if (change == null && price != null && previousClose != null) {
      change = price - previousClose;
    }

    if (previousClose == null && price != null && change != null) {
      previousClose = price - change;
    }

    if (changePercent == null && price != null && previousClose != null && previousClose !== 0) {
      changePercent = ((price - previousClose) / previousClose) * 100;
    }

    if (change == null && changePercent != null && price != null) {
      const denominator = 1 + changePercent / 100;
      if (denominator !== 0) {
        const inferredPreviousClose = price / denominator;
        if (Number.isFinite(inferredPreviousClose)) {
          previousClose = previousClose ?? inferredPreviousClose;
          change = price - inferredPreviousClose;
        }
      }
    }

    if (changePercent == null && change != null && previousClose != null && previousClose !== 0) {
      changePercent = (change / previousClose) * 100;
    }

    return {
      ticker: normalized,
      price,
      currentPrice: price,
      change,
      changePercent,
      previousClose,
      volume: null,
      avgVolume: null,
      rvol: null,
    };
  } catch {
    return {
      ticker: normalized,
      price: null,
      currentPrice: null,
      change: null,
      changePercent: null,
      previousClose: null,
      volume: null,
      avgVolume: null,
      rvol: null,
    };
  }
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
    )].slice(0, 50);

    if (!tickers.length) {
      return NextResponse.json(
        { error: "Missing tickers" },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin;
    const stockTickers = tickers.filter((ticker) => !isIndexTicker(ticker));
    const indexTickers = tickers.filter((ticker) => isIndexTicker(ticker));

    const [stockQuotes, indexResults] = await Promise.all([
      fetchMassiveBatchQuotes(origin, stockTickers),
      Promise.all(indexTickers.map(fetchIndexAwareQuote)),
    ]);

    const indexQuoteMap = Object.fromEntries(
      indexResults.map((item) => [item.ticker, item])
    ) as Record<string, BatchQuoteItem>;

    const results = tickers.map((ticker) => {
      const normalized = normalizeTicker(ticker);

      if (isIndexTicker(normalized)) {
        return indexQuoteMap[normalized] ?? buildFallbackQuote(normalized);
      }

      return stockQuotes[normalized] ?? buildFallbackQuote(normalized);
    });

    return NextResponse.json({
      quotes: results,
      count: results.length,
      marketStatus: getMarketStatus(),
      updatedAt: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load batch quotes" },
      { status: 500 }
    );
  }
}