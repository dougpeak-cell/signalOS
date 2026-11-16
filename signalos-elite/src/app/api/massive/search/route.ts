import { NextRequest, NextResponse } from "next/server";
import { searchFmpStocks } from "@/lib/market/fmpSearch";
import { FmpDataError } from "@/lib/market/fmpData";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ results: [] });
  try {
    return NextResponse.json({ results: await searchFmpStocks(query), provider: "fmp" });
  } catch (error) {
    return NextResponse.json(
      { results: [], error: error instanceof Error ? error.message : "FMP search unavailable." },
      { status: error instanceof FmpDataError ? error.status : 502 },
    );
  }
}
