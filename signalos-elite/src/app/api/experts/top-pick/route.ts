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
  Industrials: {
    ticker: "CAT",
    company: "Caterpillar Inc.",
    analyst: "Angel Castillo",
    firm: "Morgan Stanley",
    analystAvgReturn: 15.8,
    successRate: 67,
    currentPrice: 334.2,
    targetPrice: 372,
    upside: 11.3,
    convictionScore: 80,
    targetUpdated: "2026-06-18",
    trend: "Bullish",
    sigiReason:
      "CAT combines infrastructure leverage, industrial leadership, durable cash generation, and steady analyst support.",
  },
  "Consumer Cyclical": {
    ticker: "AMZN",
    company: "Amazon.com, Inc.",
    analyst: "Justin Post",
    firm: "Bank of America",
    analystAvgReturn: 19.6,
    successRate: 70,
    currentPrice: 201.8,
    targetPrice: 235,
    upside: 16.5,
    convictionScore: 86,
    targetUpdated: "2026-06-17",
    trend: "Bullish",
    sigiReason:
      "AMZN stands out through consumer platform scale, cloud support, estimate revisions, and strong institutional sponsorship.",
  },
  "Consumer Defensive": {
    ticker: "COST",
    company: "Costco Wholesale Corporation",
    analyst: "Robert Ohmes",
    firm: "Bank of America",
    analystAvgReturn: 13.9,
    successRate: 65,
    currentPrice: 845.5,
    targetPrice: 920,
    upside: 8.8,
    convictionScore: 76,
    targetUpdated: "2026-06-17",
    trend: "Bullish",
    sigiReason:
      "COST leads consumer defensive on membership durability, pricing power, execution consistency, and steady analyst conviction.",
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
  "Communication Services": {
    ticker: "META",
    company: "Meta Platforms, Inc.",
    analyst: "Doug Anmuth",
    firm: "JPMorgan",
    analystAvgReturn: 20.7,
    successRate: 72,
    currentPrice: 527.6,
    targetPrice: 610,
    upside: 15.6,
    convictionScore: 87,
    targetUpdated: "2026-06-18",
    trend: "Bullish",
    sigiReason:
      "META pairs ad-market leadership, margin strength, AI optionality, and durable analyst support better than sector peers.",
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
  "Real Estate": {
    ticker: "PLD",
    company: "Prologis, Inc.",
    analyst: "Michael Goldsmith",
    firm: "UBS",
    analystAvgReturn: 12.4,
    successRate: 63,
    currentPrice: 109.3,
    targetPrice: 124,
    upside: 13.4,
    convictionScore: 75,
    targetUpdated: "2026-06-17",
    trend: "Bullish",
    sigiReason:
      "PLD leads real estate on logistics quality, balance-sheet strength, rent-growth resilience, and constructive analyst backing.",
  },
  "Basic Materials": {
    ticker: "LIN",
    company: "Linde plc",
    analyst: "Steve Byrne",
    firm: "BofA Securities",
    analystAvgReturn: 14.7,
    successRate: 66,
    currentPrice: 438.9,
    targetPrice: 485,
    upside: 10.5,
    convictionScore: 77,
    targetUpdated: "2026-06-18",
    trend: "Bullish",
    sigiReason:
      "LIN stands out for defensive quality, industrial gas leadership, pricing discipline, and consistent analyst support.",
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