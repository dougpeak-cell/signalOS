import { NextResponse } from "next/server";

import { InsiderDataError, loadFmpInsiderTradesFeed } from "@/lib/experts/fmpInsiders";

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
    console.error("FMP insider trades error:", error instanceof InsiderDataError ? error.message : "Unexpected server error");

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof InsiderDataError
            ? error.message
            : "Failed to load insider trades. Please retry.",
        rows: [],
      },
      { status: error instanceof InsiderDataError ? error.status : 500 }
    );
  }
}