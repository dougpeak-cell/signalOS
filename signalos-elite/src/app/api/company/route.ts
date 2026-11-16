import { NextResponse } from "next/server";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";

export async function GET(req: Request): Promise<NextResponse> {
  const ticker = new URL(req.url).searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  try {
    const profile = await getMassiveFundamentals(ticker, { profile: "discovery" });
    return NextResponse.json({
      ticker, name: profile.name, description: profile.description, sector: profile.sector, industry: profile.industry,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "FMP profile unavailable." }, { status: 502 });
  }
}
