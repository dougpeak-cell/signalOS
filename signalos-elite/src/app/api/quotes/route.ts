import { NextRequest, NextResponse } from "next/server";
import { GET as getQuotes } from "@/app/api/massive/quotes/route";
import { getCurrentMarketPhase } from "@/lib/today/marketPhase";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const response = await getQuotes(req);
  if (!response.ok) return response;
  const payload = await response.json();
  const phase = getCurrentMarketPhase();
  const quotes = payload.quotes.map((quote: {
    price: number | null; volume: number | null; avgVolume: number | null;
  }) => ({
    ...quote, currentPrice: quote.price,
    rvol: quote.volume != null && quote.avgVolume != null && quote.avgVolume > 0 ? quote.volume / quote.avgVolume : null,
  }));
  return NextResponse.json({
    quotes, count: quotes.length, provider: "fmp",
    marketStatus: ["open", "midday", "close"].includes(phase) ? "live" : "last-close",
    updatedAt: Date.now(),
  });
}
