import { NextRequest, NextResponse } from "next/server";
import { FmpDataError, getFmpQuote, marketNumber } from "@/lib/market/fmpData";
import { normalizeFmpQuote } from "@/lib/market/fmpQuote";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  try {
    const row = await getFmpQuote(ticker);
    const quote = row ? normalizeFmpQuote(ticker, row) : null;
    if (!quote) return NextResponse.json({ error: "FMP quote unavailable." }, { status: 404 });
    return NextResponse.json({
      ticker, provider: "fmp", lastPrice: quote.price, change: quote.change, changePct: quote.changePct,
      updatedMs: quote.updatedMs, dayRange: { low: marketNumber(row?.dayLow), high: marketNumber(row?.dayHigh) },
      open: marketNumber(row?.open), close: null, prevClose: quote.prevClose, volume: quote.volume,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FMP quote unavailable." },
      { status: error instanceof FmpDataError ? error.status : 502 },
    );
  }
}
