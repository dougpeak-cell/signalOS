import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sector = req.nextUrl.searchParams.get("sector") || "Technology";

  const result = {
    sector,
    ticker: "NVDA",
    company: "NVIDIA",
    analyst: "Joseph Moore",
    firm: "Morgan Stanley",
    analystAvgReturn: 28.4,
    successRate: 73,
    currentPrice: 182.4,
    targetPrice: 225,
    upside: 23.3,
    momentumScore: 92,
    trend: "Bullish",
    sigiReason:
      "NVDA combines strong analyst conviction, positive earnings revisions, sector leadership, and superior relative strength.",
  };

  return NextResponse.json(result);
}