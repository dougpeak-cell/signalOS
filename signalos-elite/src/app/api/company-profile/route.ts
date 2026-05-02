import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return NextResponse.json({ ok: false, error: "Missing ticker" }, { status: 400 });
  }

  if (!FINNHUB_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing FINNHUB_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_API_KEY}`,
      { cache: "no-store" }
    );

    const data = await res.json();

    return NextResponse.json({
      ok: true,
      ticker,
      name: data.name ?? null,
      sector: data.finnhubIndustry ?? null,
      exchange: data.exchange ?? null,
      country: data.country ?? null,
      currency: data.currency ?? null,
      ipo: data.ipo ?? null,
      marketCap: data.marketCapitalization ?? null,
      logo: data.logo ?? null,
      weburl: data.weburl ?? null,
    });
  } catch (error) {
    console.error("Company profile error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load company profile" },
      { status: 500 }
    );
  }
}