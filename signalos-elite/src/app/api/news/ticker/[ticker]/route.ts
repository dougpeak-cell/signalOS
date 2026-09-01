import { NextRequest, NextResponse } from "next/server";
import { fetchNewsForWatchlist } from "@/lib/news";
import { toSignalNewsItems } from "@/lib/news/freeNewsSignalItems";

type RouteContext = {
  params: Promise<{
    ticker: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { ticker } = await context.params;
  const normalizedTicker = ticker.trim().toUpperCase();
  const requestedLookback = Number(request.nextUrl.searchParams.get("lookbackHours"));
  const lookbackHours = Number.isFinite(requestedLookback)
    ? Math.min(168, Math.max(1, requestedLookback))
    : 24;

  try {
    const items = toSignalNewsItems(
      await fetchNewsForWatchlist([normalizedTicker], {
        limit: 20,
        lookbackHours,
      })
    );

    return NextResponse.json(
      {
        ok: true,
        ticker: normalizedTicker,
        asOf: new Date().toISOString(),
        items,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "s-maxage=20, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to build free ticker news payload",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}