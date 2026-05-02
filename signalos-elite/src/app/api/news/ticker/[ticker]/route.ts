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

  try {
    const items = toSignalNewsItems(
      await fetchNewsForWatchlist([normalizedTicker], {
        limit: 20,
        lookbackHours: 24,
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