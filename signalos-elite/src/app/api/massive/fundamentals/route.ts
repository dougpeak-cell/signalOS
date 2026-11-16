import { NextRequest, NextResponse } from "next/server";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";
import { FmpDataError } from "@/lib/market/fmpData";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  try {
    return NextResponse.json({ ticker, ...await getMassiveFundamentals(ticker), source: "fmp" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FMP fundamentals unavailable." },
      { status: error instanceof FmpDataError ? error.status : 502 },
    );
  }
}
