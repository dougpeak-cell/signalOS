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
  const normalizedTicker = ticker.trim().toUpperCase();

  if (!normalizedTicker) {
    return null;
  }

  try {
    const data = (await fetchFmpRows("profile", { symbol: normalizedTicker }, 300))[0];
    if (!data) return null;

    return {
      name: typeof data.companyName === "string" ? data.companyName : null,
      sector: typeof data.sector === "string" ? data.sector : null,
      exchange: typeof data.exchange === "string" ? data.exchange : null,
      country: typeof data.country === "string" ? data.country : null,
      currency: typeof data.currency === "string" ? data.currency : null,
      ipo: typeof data.ipoDate === "string" ? data.ipoDate : null,
      marketCap: marketNumber(data.marketCap),
      logo: typeof data.image === "string" ? data.image : null,
      weburl: typeof data.website === "string" ? data.website : null,
    };
  } catch (error) {
    console.error("FMP company profile unavailable:", error instanceof Error ? error.message : "Unknown provider error");
    return null;
  }
}
import { fetchFmpRows } from "@/lib/experts/fmpClient";
import { marketNumber } from "@/lib/market/fmpData";
