import { NextRequest, NextResponse } from "next/server";
import {
  buildMarketIntel,
  type PortfolioItem,
  type QuoteMap,
  type QuoteSnapshot,
  type WatchlistItem,
} from "@/lib/intelligence/buildMarketIntel";
import { fetchFreeTickerPulses } from "@/lib/news/fetchFreeTickerPulses";
import {
  getStoredMarketContext,
  upsertStoredMarketContext,
} from "@/lib/intelligence/contextStore";
import {
  buildPortfolioSummary,
  getPortfolioTicker,
} from "@/lib/intelligence/portfolioSummary";

function normalizeTicker(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parseWatchlistParam(raw: string | null): WatchlistItem[] {
  const parsed = safeJsonParse<unknown>(raw);
  return Array.isArray(parsed) ? (parsed as WatchlistItem[]) : [];
}

function parsePortfolioParam(raw: string | null): PortfolioItem[] {
  const parsed = safeJsonParse<unknown>(raw);
  return Array.isArray(parsed) ? (parsed as PortfolioItem[]) : [];
}

function getWatchlistTicker(item: WatchlistItem): string {
  if (typeof item === "string") return normalizeTicker(item);
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

async function fetchQuotesForTickers(
  origin: string,
  tickers: string[]
): Promise<QuoteMap> {
  const unique = [...new Set(tickers.map(normalizeTicker).filter(Boolean))];
  if (!unique.length) return {};

  try {
    const res = await fetch(
      `${origin}/api/quotes?tickers=${encodeURIComponent(unique.join(","))}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) return {};

    const json = await res.json();
    const rows = Array.isArray(json?.quotes) ? json.quotes : [];

    const next: QuoteMap = {};

    for (const row of rows) {
      const ticker = normalizeTicker(String(row?.ticker ?? ""));
      if (!ticker) continue;

      const quote: QuoteSnapshot = {
        ticker,
        price: getNumber(row?.price),
        currentPrice:
          getNumber(row?.currentPrice) ?? getNumber(row?.price),
        changePercent:
          getNumber(row?.changePercent) ??
          getNumber(row?.changePct) ??
          getNumber(row?.changesPercentage),
        updatedAt: Date.now(),
      };

      next[ticker] = quote;
    }

    return next;
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queryWatchlist = parseWatchlistParam(url.searchParams.get("watchlist"));
    const queryPortfolio = parsePortfolioParam(url.searchParams.get("portfolio"));
    const storedContext = await getStoredMarketContext();

    const watchlist = queryWatchlist.length ? queryWatchlist : storedContext.watchlist;
    const portfolio = queryPortfolio.length ? queryPortfolio : storedContext.portfolio;

    const tickers = [
      ...watchlist.map(getWatchlistTicker),
      ...portfolio.map(getPortfolioTicker),
    ].filter(Boolean);

    const quotes = await fetchQuotesForTickers(url.origin, tickers);
    const portfolioPulseMap = await fetchFreeTickerPulses(
      portfolio.map(getPortfolioTicker).filter(Boolean),
      {
        maxAgeHours: 24,
      }
    );

    const intel = buildMarketIntel({
      watchlist,
      portfolio,
      quotes,
    });

    return NextResponse.json({
      ok: true,
      intel,
      hasAccountSession: Boolean(storedContext.userId),
      watchlist,
      portfolio,
      source:
        queryWatchlist.length || queryPortfolio.length ? "request" : "shared-store",
      counts: {
        watchlist: watchlist.length,
        portfolio: portfolio.length,
        quotes: Object.keys(quotes).length,
      },
      portfolioSummary: buildPortfolioSummary(portfolio, portfolioPulseMap),
      contextUpdatedAt: storedContext.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to build intelligence snapshot",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      watchlist?: unknown;
      portfolio?: unknown;
    };

    const watchlist = Array.isArray(body?.watchlist)
      ? (body.watchlist as WatchlistItem[])
      : [];
    const portfolio = Array.isArray(body?.portfolio)
      ? (body.portfolio as PortfolioItem[])
      : [];

    const persistResult = await upsertStoredMarketContext({
      watchlist,
      portfolio,
    });

    const allowDevBypass = process.env.NODE_ENV !== "production" && !persistResult.userId;
    const persisted = persistResult.ok;

    if (!persistResult.userId && !allowDevBypass) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required to persist shared market context.",
        },
        { status: 401 }
      );
    }

    if (!persistResult.ok && !allowDevBypass) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to persist shared market context.",
        },
        { status: 500 }
      );
    }

    const tickers = [
      ...watchlist.map(getWatchlistTicker),
      ...portfolio.map(getPortfolioTicker),
    ].filter(Boolean);

    const quotes = await fetchQuotesForTickers(req.nextUrl.origin, tickers);
    const portfolioPulseMap = await fetchFreeTickerPulses(
      portfolio.map(getPortfolioTicker).filter(Boolean),
      {
        maxAgeHours: 24,
      }
    );
    const intel = buildMarketIntel({
      watchlist,
      portfolio,
      quotes,
    });

    return NextResponse.json({
      ok: true,
      intel,
      hasAccountSession: Boolean(persistResult.userId),
      watchlist,
      portfolio,
      source: persistResult.usedDevStore ? "shared-store-dev" : "shared-store",
      persisted,
      counts: {
        watchlist: watchlist.length,
        portfolio: portfolio.length,
        quotes: Object.keys(quotes).length,
      },
      portfolioSummary: buildPortfolioSummary(portfolio, portfolioPulseMap),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to persist intelligence context",
      },
      { status: 500 }
    );
  }
}