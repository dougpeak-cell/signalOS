import { NextRequest, NextResponse } from "next/server";
import { fetchNewsForWatchlist, fetchTopMarketNews } from "@/lib/news";
import {
  dedupeSignalNewsItems,
  toSignalNewsItems,
} from "@/lib/news/freeNewsSignalItems";
import {
  scoreNewsHeaderItems,
  type NewsHeaderMode,
} from "@/lib/news/scoreNewsHeaderItems";

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

function parseMode(value: string | null): NewsHeaderMode {
  if (value === "context" || value === "personal") return value;
  return "market";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = parseMode(searchParams.get("mode"));
  const focusedTicker = searchParams.get("ticker")?.trim().toUpperCase() ?? undefined;

  const watchlistTickers = parseCsvParam(searchParams.get("watchlist"));
  const portfolioTickers = parseCsvParam(searchParams.get("portfolio"));
  const topSetupTickers = parseCsvParam(searchParams.get("topSetups"));
  const mostTradedTickers = parseCsvParam(searchParams.get("mostTraded"));

  const requestedChannels = parseCsvParam(searchParams.get("channels"));
  const updatedSince = searchParams.get("updatedSince");

  const allRelevantTickers = Array.from(
    new Set([
      ...(focusedTicker ? [focusedTicker] : []),
      ...watchlistTickers,
      ...portfolioTickers,
      ...topSetupTickers,
      ...mostTradedTickers,
    ])
  );

  const effectiveTickers = allRelevantTickers;

  const defaultChannels =
    requestedChannels.length > 0
      ? requestedChannels
      : mode === "market"
        ? undefined
        : ["WIIM", "Analyst Ratings", "Press Releases", "Markets"];

  try {
    const [marketItems, contextualItems] = await Promise.all([
      fetchTopMarketNews({
        limit: mode === "market" ? 30 : 18,
        lookbackHours: 24,
      }),
      effectiveTickers.length > 0
        ? fetchNewsForWatchlist(effectiveTickers, {
            limit: Math.min(Math.max(effectiveTickers.length * 6, 18), 60),
            lookbackHours: 24,
          })
        : Promise.resolve([]),
    ]);

    const normalized = dedupeSignalNewsItems(
      toSignalNewsItems([...marketItems, ...contextualItems])
    );

    const scored = scoreNewsHeaderItems({
      items: normalized,
      mode,
      focusedTicker,
      watchlistTickers,
      portfolioTickers,
      topSetupTickers,
      mostTradedTickers,
    });

    return NextResponse.json(
      {
        ok: true,
        mode,
        asOf: new Date().toISOString(),
        newsQuery: {
          tickers: effectiveTickers,
          channels: defaultChannels ?? [],
          updatedSince,
          source: "free-rss",
        },
        items: {
          primary: scored.primary,
          secondary: scored.secondary,
          queue: scored.queue,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to build free news header payload",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}