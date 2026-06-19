import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const topPickBySector = {
  Technology: {
    ticker: "NVDA",
    company: "NVIDIA",
    analyst: "Joseph Moore",
    firm: "Morgan Stanley",
    analystAvgReturn: 28.4,
    successRate: 73,
    currentPrice: 182.4,
    targetPrice: 225,
    upside: 23.3,
    convictionScore: 94,
    targetUpdated: "2026-06-17",
    trend: "Bullish",
    sigiReason:
      "NVDA combines strong analyst conviction, positive earnings revisions, sector leadership, and superior relative strength.",
  },
  Healthcare: {
    ticker: "LLY",
    company: "Eli Lilly and Company",
    analyst: "Chris Schott",
    firm: "JPMorgan",
    analystAvgReturn: 21.8,
    successRate: 69,
    currentPrice: 872.1,
    targetPrice: 960,
    upside: 10.1,
    convictionScore: 88,
    targetUpdated: "2026-06-17",
    trend: "Bullish",
    sigiReason:
      "LLY pairs strong analyst support with durable earnings momentum, category leadership, and steady institutional sponsorship.",
  },
  "Financial Services": {
    ticker: "JPM",
    company: "JPMorgan Chase & Co.",
    analyst: "Betsy Graseck",
    firm: "Morgan Stanley",
    analystAvgReturn: 18.9,
    successRate: 71,
    currentPrice: 236.4,
    targetPrice: 270,
    upside: 14.2,
    convictionScore: 83,
    targetUpdated: "2026-06-18",
    trend: "Bullish",
    sigiReason:
      "JPM stands out on capital strength, large-bank leadership, positive revisions, and resilient institutional positioning across the sector.",
  },
  Energy: {
    ticker: "XOM",
    company: "Exxon Mobil Corporation",
    analyst: "Neil Mehta",
    firm: "Goldman Sachs",
    analystAvgReturn: 16.7,
    successRate: 68,
    currentPrice: 118.6,
    targetPrice: 134,
    upside: 13.0,
    convictionScore: 81,
    targetUpdated: "2026-06-18",
    trend: "Bullish",
    sigiReason:
      "XOM combines integrated energy scale, cash-flow durability, analyst support, and stronger commodity-linked leadership than peers.",
  },
  Utilities: {
    ticker: "NEE",
    company: "NextEra Energy, Inc.",
    analyst: "Anthony Crowdell",
    firm: "Mizuho",
    analystAvgReturn: 14.2,
    successRate: 66,
    currentPrice: 78.2,
    targetPrice: 89,
    upside: 13.8,
    convictionScore: 78,
    targetUpdated: "2026-06-17",
    trend: "Bullish",
    sigiReason:
      "NEE leads utilities on quality, regulated growth visibility, clean-energy optionality, and supportive analyst conviction.",
  },
} as const;

export async function GET(req: NextRequest) {
  const sector = req.nextUrl.searchParams.get("sector") || "Technology";

  const result = topPickBySector[sector as keyof typeof topPickBySector] ?? topPickBySector.Technology;

  return NextResponse.json({
    sector,
    ...result,
  });
}