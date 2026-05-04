import { NextRequest, NextResponse } from "next/server";
import { getHistoryBars } from "@/lib/market/historyBars";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const ticker = (searchParams.get("ticker") || "").toUpperCase();
    const range = searchParams.get("range") || "6mo";

    if (!ticker) {
      return NextResponse.json({ bars: [] });
    }
    const bars = await getHistoryBars(ticker, range);

    return NextResponse.json({
      bars,
      history: bars,
      prices: bars,
    });
  } catch {
    return NextResponse.json({ bars: [] });
  }
}