export type FinnhubCompanyProfile = {
  name: string | null;
  sector: string | null;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  ipo: string | null;
  marketCap: number | null;
  logo: string | null;
  weburl: string | null;
};

export async function getFinnhubCompanyProfile(
  ticker: string
): Promise<FinnhubCompanyProfile | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  const normalizedTicker = ticker.trim().toUpperCase();

  if (!apiKey || !normalizedTicker) {
    return null;
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(normalizedTicker)}&token=${apiKey}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as Record<string, unknown>;

    return {
      name: typeof data.name === "string" ? data.name : null,
      sector: typeof data.finnhubIndustry === "string" ? data.finnhubIndustry : null,
      exchange: typeof data.exchange === "string" ? data.exchange : null,
      country: typeof data.country === "string" ? data.country : null,
      currency: typeof data.currency === "string" ? data.currency : null,
      ipo: typeof data.ipo === "string" ? data.ipo : null,
      marketCap:
        typeof data.marketCapitalization === "number" && Number.isFinite(data.marketCapitalization)
          ? data.marketCapitalization
          : null,
      logo: typeof data.logo === "string" ? data.logo : null,
      weburl: typeof data.weburl === "string" ? data.weburl : null,
    };
  } catch {
    return null;
  }
}