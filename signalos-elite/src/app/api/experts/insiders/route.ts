import { NextResponse } from "next/server";

import { loadFmpInsiderTradesFeed } from "@/lib/experts/fmpInsiders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get("sector");
    const feed = await loadFmpInsiderTradesFeed(sector);

    return NextResponse.json({
      ok: true,
      ...feed,
    });
  } catch (error) {
    console.error("FMP insider trades error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error && error.message === "Missing FMP_API_KEY"
            ? "Missing FMP_API_KEY"
            : "Failed to load insider trades",
        rows: [],
      },
      { status: 500 }
    );
  }
}