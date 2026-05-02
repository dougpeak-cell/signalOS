import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return NextResponse.json(
      { ok: false, error: "Missing ticker" },
      { status: 400 }
    );
  }

  if (!FINNHUB_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing FINNHUB_API_KEY" },
      { status: 500 }
    );
  }

  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_API_KEY}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    const m = json.metric ?? {};

    return NextResponse.json({
      ok: true,
      ticker,
      pe: m.peBasicExclExtraTTM ?? m.peNormalizedAnnual ?? null,
      peg: m.pegRatio ?? null,
      marketCap: m.marketCapitalization ?? null,
      revenue: m.revenueTTM ?? null,
      grossMargin: m.grossMarginTTM ?? null,
      operatingMargin: m.operatingMarginTTM ?? null,
      netMargin: m.netProfitMarginTTM ?? null,
      roe: m.roeTTM ?? null,
      roa: m.roaTTM ?? null,
      currentRatio: m.currentRatioAnnual ?? null,
      debtToEquity: m.totalDebtToEquityAnnual ?? null,
      dividendYield: m.dividendYieldIndicatedAnnual ?? null,
      beta: m.beta ?? null,
      week52High: m["52WeekHigh"] ?? null,
      week52Low: m["52WeekLow"] ?? null,
    });
  } catch (error) {
    console.error("Finnhub fundamentals error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load fundamentals" },
      { status: 500 }
    );
  }
}