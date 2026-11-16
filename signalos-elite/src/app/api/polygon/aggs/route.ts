import { NextRequest, NextResponse } from "next/server";
import { FmpDataError, getFmpBars, getFmpQuote, historyStartDate, marketNumber } from "@/lib/market/fmpData";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  try {
    const [history, quote] = await Promise.all([
      getFmpBars(ticker, historyStartDate("1D"), new Date().toISOString().slice(0, 10), "1m"),
      getFmpQuote(ticker),
    ]);
    return NextResponse.json({
      ticker, provider: "fmp", prevClose: marketNumber(quote?.previousClose),
      bars: history.map(({ timestamp, ...bar }) => ({ time: timestamp / 1000, ...bar })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FMP candles unavailable." },
      { status: error instanceof FmpDataError ? error.status : 502 },
    );
  }
}
