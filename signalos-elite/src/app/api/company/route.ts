import { NextResponse } from "next/server";
import { COMPANY_PROFILES } from "@/lib/companyProfiles";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";

function buildFallbackDescription(name: string | null): string {
  if (!name) return "";
  if (/\bETF\b/i.test(name)) {
    return `${name} is an exchange-traded fund. Its market price reflects the value and trading activity of its underlying portfolio.`;
  }

  return "";
}

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
    const massiveProfile = await getMassiveFundamentals(ticker, {
      profile: "discovery",
    });

    return NextResponse.json(
      {
        ticker,
        name: massiveProfile.name ?? ticker,
        description:
          massiveProfile.description ??
          buildFallbackDescription(massiveProfile.name),
        sector: massiveProfile.sector,
        industry: massiveProfile.industry,
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
      const massiveProfile = await getMassiveFundamentals(ticker, {
        profile: "discovery",
      });

      return NextResponse.json(
        {
          ticker,
          name: massiveProfile.name ?? ticker,
          description:
            massiveProfile.description ??
            buildFallbackDescription(massiveProfile.name),
          sector: massiveProfile.sector,
          industry: massiveProfile.industry,
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