import { NextRequest, NextResponse } from "next/server";
import { fmpSymbol, getFmpBars, getFmpQuote, historyStartDate, marketNumber, FmpDataError } from "@/lib/market/fmpData";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ticker = fmpSymbol(req.nextUrl.searchParams.get("ticker") ?? "");
  if (!ticker) return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  const range = req.nextUrl.searchParams.get("range") || "1D";
  const interval = req.nextUrl.searchParams.get("interval") || "1m";
  try {
    const [bars, quote] = await Promise.all([
      getFmpBars(ticker, historyStartDate(range), new Date().toISOString().slice(0, 10), interval),
      getFmpQuote(ticker),
    ]);
    const history = bars.map((bar) => ({
      ...bar, time: new Date(bar.timestamp).toISOString(), date: new Date(bar.timestamp).toISOString(),
    }));
    return NextResponse.json({
      ticker, range, interval, provider: "fmp", prevClose: marketNumber(quote?.previousClose),
      results: history, data: history, history, prices: history, points: history,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FMP history unavailable." },
      { status: error instanceof FmpDataError ? error.status : 502 },
    );
  }
}
