import { NextResponse } from "next/server";
import { getFinnhubCompanyProfile } from "@/lib/stocks/finnhubCompanyProfile";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return NextResponse.json({ ok: false, error: "Missing ticker" }, { status: 400 });
  }

  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing FINNHUB_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const profile = await getFinnhubCompanyProfile(ticker);

    return NextResponse.json({
      ok: true,
      ticker,
      name: profile?.name ?? null,
      sector: profile?.sector ?? null,
      exchange: profile?.exchange ?? null,
      country: profile?.country ?? null,
      currency: profile?.currency ?? null,
      ipo: profile?.ipo ?? null,
      marketCap: profile?.marketCap ?? null,
      logo: profile?.logo ?? null,
      weburl: profile?.weburl ?? null,
    });
  } catch (error) {
    console.error("Company profile error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load company profile" },
      { status: 500 }
    );
  }
}