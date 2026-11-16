export type FinnhubFundamentals = {
  pe: number | null;
  peg: number | null;
  marketCap: number | null;
  revenue: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  roa: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  beta: number | null;
  week52High: number | null;
  week52Low: number | null;
};

const EMPTY_FINNHUB_FUNDAMENTALS: FinnhubFundamentals = {
  pe: null,
  peg: null,
  marketCap: null,
  revenue: null,
  grossMargin: null,
  operatingMargin: null,
  netMargin: null,
  roe: null,
  roa: null,
  currentRatio: null,
  debtToEquity: null,
  dividendYield: null,
  beta: null,
  week52High: null,
  week52Low: null,
};

export async function getFinnhubFundamentals(
  ticker: string
): Promise<FinnhubFundamentals | null> {
  const normalizedTicker = ticker.trim().toUpperCase();

  if (!normalizedTicker) {
    return null;
  }

  try {
    const [fundamentals, profiles, ratios, metrics] = await Promise.all([
      getMassiveFundamentals(normalizedTicker),
      fetchFmpRows("profile", { symbol: normalizedTicker }, 300),
      fetchFmpRows("ratios-ttm", { symbol: normalizedTicker }, 300),
      fetchFmpRows("key-metrics-ttm", { symbol: normalizedTicker }, 300),
    ]);
    const profile = profiles[0], ratio = ratios[0], metric = metrics[0];
    const percent = (value: unknown) => { const n = marketNumber(value); return n == null ? null : n * 100; };
    const range = typeof profile?.range === "string" ? profile.range.split("-").map(Number) : [];

    return {
      pe: fundamentals.pe, peg: fundamentals.peg, marketCap: fundamentals.marketCap,
      revenue: fundamentals.revenue,
      grossMargin: percent(ratio?.grossProfitMarginTTM), operatingMargin: percent(ratio?.operatingProfitMarginTTM),
      netMargin: percent(ratio?.netProfitMarginTTM), roe: percent(metric?.returnOnEquityTTM),
      roa: percent(metric?.returnOnAssetsTTM), currentRatio: marketNumber(ratio?.currentRatioTTM),
      debtToEquity: marketNumber(ratio?.debtToEquityRatioTTM), dividendYield: fundamentals.dividendYield,
      beta: marketNumber(profile?.beta), week52High: marketNumber(range[1]), week52Low: marketNumber(range[0]),
    };
  } catch (error) {
    console.error("FMP financial metrics unavailable:", error instanceof Error ? error.message : "Unknown provider error");
    return null;
  }
}

export function getEmptyFinnhubFundamentals(): FinnhubFundamentals {
  return EMPTY_FINNHUB_FUNDAMENTALS;
}
import { fetchFmpRows } from "@/lib/experts/fmpClient";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";
import { marketNumber } from "@/lib/market/fmpData";
