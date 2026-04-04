import { NextRequest, NextResponse } from "next/server";
import { getQuoteByTicker } from "@/lib/market/quotes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const INDEX_MAP: Record<string, string> = {
  "^GSPC": "I:SPX",
  "^IXIC": "I:COMP",
  "^DJI": "I:DJI",
  "^RUT": "I:RUT",
  "^VIX": "I:VIX",
};

const INDEX_PROXY_FALLBACK: Record<string, string> = {
  "^GSPC": "SPY",
  "^IXIC": "QQQ",
  "^DJI": "DIA",
  "^RUT": "IWM",
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toPositiveNumber(value: unknown): number | null {
  const n = toNumber(value);
  return n != null && n > 0 ? n : null;
}

function normalizeUpdatedMs(raw: number | null): number | null {
  if (raw == null) return null;
  if (raw > 1_000_000_000_000_000) return Math.floor(raw / 1_000_000);
  if (raw > 1_000_000_000_000) return Math.floor(raw / 1_000);
  return raw;
}

type IndexSnapshotResult = {
  ticker?: string;
  value?: number;
  market_status?: string;
  last_updated?: number;
  session?: {
    change?: number;
    change_percent?: number;
    close?: number;
    previous_close?: number;
  };
  error?: string;
  message?: string;
};

async function fetchMassivePreviousClose(indexTicker: string): Promise<number | null> {
  if (!POLYGON_API_KEY) return null;

  try {
    const url =
      `https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(indexTicker)}` +
      `/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`Massive prev close failed for ${indexTicker}: ${res.status}`);
      return null;
    }

    const json = await res.json();
    const result = Array.isArray((json as any)?.results)
      ? (json as any).results[0]
      : (json as any)?.results ?? (json as any)?.result ?? null;

    return toNumber(result?.c ?? result?.close);
  } catch (error) {
    console.error(`Massive prev close fetch error for ${indexTicker}:`, error);
    return null;
  }
}

async function fetchMassiveIndexQuote(indexTicker: string): Promise<{
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  updatedMs: number | null;
  isMarketOpen: boolean | null;
} | null> {
  if (!POLYGON_API_KEY) {
    console.log("POLYGON API KEY MISSING");
    return null;
  }

  try {
    const url =
      `https://api.massive.com/v3/snapshot?` +
      `ticker.any_of=${encodeURIComponent(indexTicker)}` +
      `&limit=1` +
      `&apiKey=${POLYGON_API_KEY}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    console.log("INDEX RESPONSE", {
      indexTicker,
      status: res.status,
      ok: res.ok,
    });

    const json = await res.json();

    console.log("INDEX JSON FULL", json);

    if (!res.ok) {
      console.error(`Massive index snapshot failed for ${indexTicker}: ${res.status}`);
      return null;
    }

    const snapshot = Array.isArray((json as any)?.results)
      ? ((json as any).results[0] as IndexSnapshotResult | undefined)
      : undefined;

    if (!snapshot) {
      console.log("INDEX SNAPSHOT MISSING", { indexTicker, json });
      return null;
    }

    if (snapshot.error || snapshot.message) {
      console.log("INDEX SNAPSHOT ERROR", {
        indexTicker,
        error: snapshot.error,
        message: snapshot.message,
      });
      return null;
    }

    const price =
      toNumber(snapshot.value) ??
      toNumber(snapshot.session?.close);

    const snapshotPrevClose = toNumber(snapshot.session?.previous_close);
    let prevClose = snapshotPrevClose;

    const snapshotChange = toNumber(snapshot.session?.change);
    const snapshotChangePct = toNumber(snapshot.session?.change_percent);

    const needsPrevCloseFallback =
      price != null &&
      (prevClose == null ||
        ((snapshotChange == null || snapshotChange === 0) && prevClose === price));

    if (needsPrevCloseFallback) {
      prevClose = (await fetchMassivePreviousClose(indexTicker)) ?? prevClose;
    }

    let change =
      snapshotChange ??
      (price != null && prevClose != null ? price - prevClose : null);

    if (change === 0 && price != null && prevClose != null && price !== prevClose) {
      change = price - prevClose;
    }

    let changePct =
      snapshotChangePct ??
      (change != null && prevClose != null && prevClose !== 0
        ? (change / prevClose) * 100
        : null);

    if (
      changePct === 0 &&
      change != null &&
      prevClose != null &&
      prevClose !== 0 &&
      change !== 0
    ) {
      changePct = (change / prevClose) * 100;
    }

    const updatedMs = normalizeUpdatedMs(
      toNumber((snapshot as any).updated) ?? toNumber(snapshot.last_updated)
    );

    const marketStatus = String(snapshot.market_status ?? "").toLowerCase();
    const isMarketOpen =
      marketStatus === "regular_trading" ||
      marketStatus === "early_trading" ||
      marketStatus === "late_trading";

    if (price == null) {
      console.log("INDEX PRICE MISSING", {
        indexTicker,
        snapshot,
      });
      return null;
    }

    return {
      price,
      prevClose,
      change,
      changePct,
      updatedMs,
      isMarketOpen,
    };
  } catch (error) {
    console.error(`Massive index quote fetch error for ${indexTicker}:`, error);
    return null;
  }
}

type StockSnapshot = {
  ticker?: string;
  day?: { c?: number };
  prevDay?: { c?: number };
  lastQuote?: { P?: number; p?: number };
  lastTrade?: { p?: number };
  updated?: number;
};

async function fetchStockQuote(ticker: string): Promise<{
  price: number | null;
  prevClose: number | null;
  updatedMs: number | null;
} | null> {
  if (!POLYGON_API_KEY) return null;

  try {
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(
      ticker
    )}?apiKey=${POLYGON_API_KEY}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    console.log("STOCK RESPONSE", {
      ticker,
      status: res.status,
      ok: res.ok,
    });

    const json = await res.json();

    if (!res.ok) {
      console.error(`Polygon stock snapshot failed for ${ticker}: ${res.status}`);
      return null;
    }

    const snapshot =
      (json as any)?.results ??
      (json as any)?.ticker ??
      (json as StockSnapshot);

    const price =
      toPositiveNumber(snapshot?.lastTrade?.p) ??
      toPositiveNumber(snapshot?.day?.c) ??
      toPositiveNumber(snapshot?.lastQuote?.P) ??
      toPositiveNumber(snapshot?.lastQuote?.p) ??
      toPositiveNumber(snapshot?.prevDay?.c);

    const prevClose = toPositiveNumber(snapshot?.prevDay?.c);
    const updatedMs = normalizeUpdatedMs(toNumber(snapshot?.updated));

    if (price == null) return null;

    return {
      price,
      prevClose,
      updatedMs,
    };
  } catch (error) {
    console.error(`Polygon stock quote fetch error for ${ticker}:`, error);
    return null;
  }
}

type IntradayPoint = {
  value: number;
};

type AggBar = {
  c?: number;
};

function getDateStringET(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getPreviousDateStringET(date = new Date()) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - 1);
  return getDateStringET(copy);
}

async function fetchMassiveIndexIntradaySeries(indexTicker: string): Promise<number[]> {
  if (!POLYGON_API_KEY) return [];

  try {
    const from = getPreviousDateStringET();
    const to = getDateStringET();

    const url =
      `https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(indexTicker)}` +
      `/range/1/minute/${from}/${to}` +
      `?sort=asc&limit=120&apiKey=${POLYGON_API_KEY}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`Massive index series failed for ${indexTicker}: ${res.status}`);
      return [];
    }

    const json = await res.json();

    const results = Array.isArray((json as any)?.results)
      ? ((json as any).results as AggBar[])
      : [];

    return results
      .map((bar) => toNumber(bar?.c))
      .filter((value): value is number => value != null)
      .slice(-48);
  } catch (error) {
    console.error(`Massive index intraday series fetch error for ${indexTicker}:`, error);
    return [];
  }
}

async function fetchStockIntradaySeries(ticker: string): Promise<number[]> {
  if (!POLYGON_API_KEY) return [];

  try {
    const from = getPreviousDateStringET();
    const to = getDateStringET();

    const url =
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}` +
      `/range/1/minute/${from}/${to}` +
      `?sort=asc&limit=120&apiKey=${POLYGON_API_KEY}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`Polygon stock series failed for ${ticker}: ${res.status}`);
      return [];
    }

    const json = await res.json();

    const results = Array.isArray((json as any)?.results)
      ? ((json as any).results as AggBar[])
      : [];

    return results
      .map((bar) => toNumber(bar?.c))
      .filter((value): value is number => value != null)
      .slice(-48);
  } catch (error) {
    console.error(`Polygon stock intraday series fetch error for ${ticker}:`, error);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let ticker = searchParams.get("ticker") ?? searchParams.get("symbol");

    if (!ticker) {
      return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
    }

    ticker = ticker.toUpperCase().trim();

    const trueIndexTicker = INDEX_MAP[ticker] ?? null;
    const proxyTicker = INDEX_PROXY_FALLBACK[ticker] ?? null;
    const isHeadlineIndexRequest = Boolean(trueIndexTicker);

    console.log("QUOTE ROUTE DEBUG", {
      ticker,
      trueIndexTicker,
      proxyTicker,
      hasPolygonKey: Boolean(POLYGON_API_KEY),
    });

    let price: number | null = null;
    let prevClose: number | null = null;
    let change: number | null = null;
    let changePct: number | null = null;
    let updatedMs: number | null = null;
    let isMarketOpen: boolean | null = null;
    let points: number[] = [];
    let source: "stock" | "true-index" | "index-proxy" | "fallback" =
      isHeadlineIndexRequest ? "true-index" : "stock";
    let lookupTicker = trueIndexTicker ?? ticker;

    if (trueIndexTicker) {
      const indexQuote = await fetchMassiveIndexQuote(trueIndexTicker);

      if (indexQuote) {
        price = indexQuote.price;
        prevClose = indexQuote.prevClose;
        change = indexQuote.change;
        changePct = indexQuote.changePct;
        updatedMs = indexQuote.updatedMs;
        isMarketOpen = indexQuote.isMarketOpen;
        source = "true-index";
        points = await fetchMassiveIndexIntradaySeries(trueIndexTicker);
      }
    }

    if (price == null && !isHeadlineIndexRequest) {
      const stockQuote = await fetchStockQuote(ticker);

      if (stockQuote) {
        price = stockQuote.price;
        prevClose = stockQuote.prevClose;
        updatedMs = stockQuote.updatedMs;
        source = "stock";
        points = await fetchStockIntradaySeries(ticker);
      }
    }

    if (price == null && isHeadlineIndexRequest && proxyTicker) {
      const proxyQuote = await fetchStockQuote(proxyTicker);

      if (proxyQuote) {
        price = proxyQuote.price;
        prevClose = proxyQuote.prevClose;
        updatedMs = proxyQuote.updatedMs;
        source = "index-proxy";
        lookupTicker = proxyTicker;
        points = await fetchStockIntradaySeries(proxyTicker);
      }
    }

    if (price == null) {
      const rawQuote = await getQuoteByTicker(lookupTicker);

      console.log("FALLBACK QUOTE", {
        ticker,
        lookupTicker,
        rawQuote,
      });

      if (rawQuote != null) {
        price =
          typeof rawQuote === "number"
            ? toPositiveNumber(rawQuote)
            : toPositiveNumber((rawQuote as any).price) ??
              toPositiveNumber((rawQuote as any).lastPrice) ??
              toPositiveNumber((rawQuote as any).last) ??
              toPositiveNumber((rawQuote as any).close);

        prevClose =
          typeof rawQuote === "object" && rawQuote !== null
            ? toPositiveNumber((rawQuote as any).prevClose) ??
              toPositiveNumber((rawQuote as any).previousClose) ??
              toPositiveNumber((rawQuote as any).priorClose) ??
              toPositiveNumber((rawQuote as any).closePrev)
            : null;

        source = "fallback";
      }
    }

    if (price != null && price <= 0) {
      price = null;
    }

    if (price == null) {
      return NextResponse.json(
        { ticker, lookupTicker, error: "No price available" },
        { status: 404 }
      );
    }

    const needsSeriesDerivedChange =
      isHeadlineIndexRequest &&
      price != null &&
      points.length > 1 &&
      (change == null || change === 0 || prevClose == null || prevClose === price);

    if (needsSeriesDerivedChange) {
      const seriesReference = points[0] ?? null;

      if (seriesReference != null && seriesReference !== 0 && seriesReference !== price) {
        prevClose = seriesReference;
        change = price - seriesReference;
        changePct = (change / seriesReference) * 100;
      }
    }

    if (change == null) {
      change =
        prevClose != null && prevClose !== 0 ? price - prevClose : null;
    }

    if (changePct == null) {
      changePct =
        change != null && prevClose != null && prevClose !== 0
          ? (change / prevClose) * 100
          : null;
    }

      const data: any = {
        last: price,
        price,
        close: prevClose,
        c: price,
        results: points.map((point) => ({ c: point })),
      };
      const series = points;
      const last =
        data?.last ??
        data?.price ??
        data?.close ??
        data?.c ??
        data?.results?.[0]?.c ??
        data?.results?.[data?.results?.length - 1] ??
        null;

      return NextResponse.json({
        ticker,
        lookupTicker: ticker,
        source: "stock",
        price: last ?? prevClose ?? 0,
        prevClose,
        change: last && prevClose ? last - prevClose : 0,
        changePct:
          last && prevClose ? ((last - prevClose) / prevClose) * 100 : 0,
        direction:
          last && prevClose
            ? last > prevClose
              ? "up"
              : "down"
            : "flat",
        updatedMs: Date.now(),
        isMarketOpen: null,
        points: series ?? [],
      });
  } catch (error) {
    console.error("Quote route failed:", error);

    return NextResponse.json(
      { error: "Quote route failed" },
      { status: 500 }
    );
  }
}