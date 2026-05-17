import { NextResponse } from "next/server";

import { loadFmpExpertsFeed } from "@/lib/experts/fmpLeaders";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const feed = await loadFmpExpertsFeed();

    return NextResponse.json({
      ok: true,
      ...feed,
    });
  } catch (error) {
    console.error("FMP diversified experts error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error && error.message === "Missing FMP_API_KEY"
            ? "Missing FMP_API_KEY"
            : "Failed to load diversified analyst picks",
        rows: [],
      },
      { status: 500 }
    );
  }
}
