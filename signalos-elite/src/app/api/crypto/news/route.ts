import { NextRequest, NextResponse } from "next/server";

import { fetchTopFreeCryptoNews } from "@/lib/news";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit") ?? "3");
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 10)
    : 3;

  try {
    const items = await fetchTopFreeCryptoNews({
      limit,
      lookbackHours: 48,
    });

    return NextResponse.json(
      {
        ok: true,
        asOf: new Date().toISOString(),
        items,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load crypto news preview",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}