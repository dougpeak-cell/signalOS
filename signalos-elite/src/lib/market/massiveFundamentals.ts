import { fetchFmpRows } from "@/lib/experts/fmpClient";
import { fmpSymbol, getFmpQuote, marketNumber, FmpDataError } from "@/lib/market/fmpData";

export type MassiveFundamentals = {
  name: string | null;
  description: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  volume: number | null;
  avgVolume: number | null;
  pe: number | null;
  peg: number | null;
  dividendYield: number | null;
  cash: number | null;
  debt: number | null;
  revenue: number | null;
  previousRevenue: number | null;
  twoYearsAgoRevenue: number | null;
  netIncome: number | null;
};

export async function getMassiveFundamentals(
  ticker: string,
  options?: { profile?: "full" | "discovery" },
): Promise<MassiveFundamentals> {
  const symbol = fmpSymbol(ticker);
  const full = options?.profile !== "discovery";
  const results = await Promise.allSettled([
    fetchFmpRows("profile", { symbol }, 300),
    getFmpQuote(symbol).then((row) => row ? [row] : []),
    full ? fetchFmpRows("ratios-ttm", { symbol }, 300) : Promise.resolve([]),
    full ? fetchFmpRows("balance-sheet-statement", { symbol, period: "annual", limit: "1" }, 300) : Promise.resolve([]),
    full ? fetchFmpRows("income-statement", { symbol, period: "annual", limit: "3" }, 300) : Promise.resolve([]),
  ]);
  if (results.slice(0, full ? 5 : 2).every((result) => result.status === "rejected")) {
    throw new FmpDataError("FMP fundamentals unavailable. Check the server key and endpoint access.", 503);
  }
  for (const result of results) {
    if (result.status === "rejected") console.error("FMP fundamentals source unavailable:", result.reason instanceof Error ? result.reason.message : "Unknown provider error");
  }
  const [profiles, quotes, ratios, balances, incomes] = results.map((result) => result.status === "fulfilled" ? result.value : []);
  const profile = profiles[0], quote = quotes[0], ratio = ratios[0], balance = balances[0];
  const income = [...incomes].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const text = (value: unknown) => typeof value === "string" && value.trim() ? value : null;
  const dividendYield = marketNumber(ratio?.dividendYieldTTM);
  return {
    name: text(profile?.companyName) ?? text(quote?.name),
    description: text(profile?.description), sector: text(profile?.sector), industry: text(profile?.industry),
    marketCap: marketNumber(quote?.marketCap) ?? marketNumber(profile?.marketCap),
    volume: marketNumber(quote?.volume), avgVolume: marketNumber(profile?.averageVolume),
    pe: marketNumber(ratio?.priceToEarningsRatioTTM),
    peg: marketNumber(ratio?.priceToEarningsGrowthRatioTTM),
    dividendYield: dividendYield != null ? dividendYield * 100 : null,
    cash: marketNumber(balance?.cashAndCashEquivalents), debt: marketNumber(balance?.totalDebt),
    revenue: marketNumber(income[0]?.revenue), previousRevenue: marketNumber(income[1]?.revenue),
    twoYearsAgoRevenue: marketNumber(income[2]?.revenue), netIncome: marketNumber(income[0]?.netIncome),
  };
}
