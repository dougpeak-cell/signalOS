import { NextResponse } from "next/server";
import { COMPANY_PROFILES } from "@/lib/companyProfiles";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker")?.trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  }

  if (COMPANY_PROFILES[ticker]) {
    return NextResponse.json(COMPANY_PROFILES[ticker]);
  }

  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ticker,
        name: ticker,
        description: "",
      }
    );
  }

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`,
      { next: { revalidate: 86400 } }
    );

    const data = (await res.json()) as Array<{
      companyName?: string;
      description?: string;
      sector?: string;
      industry?: string;
    }>;
    const profile = data?.[0];

    if (!profile) {
      return NextResponse.json(
        {
          ticker,
          name: ticker,
          description: "",
        }
      );
    }

    return NextResponse.json({
      ticker,
      name: profile.companyName,
      description: profile.description,
      sector: profile.sector,
      industry: profile.industry,
    });
  } catch {
    return NextResponse.json(
      {
        ticker,
        name: ticker,
        description: "",
      }
    );
  }
}