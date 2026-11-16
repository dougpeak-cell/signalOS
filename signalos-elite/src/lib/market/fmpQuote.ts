import { fetchFmpRows, type FmpRow } from "@/lib/experts/fmpClient";
import { fmpSymbol, getFmpBars, getFmpQuote, historyStartDate, marketNumber } from "@/lib/market/fmpData";
export { FmpDataError } from "@/lib/market/fmpData";

export type FmpQuoteResponse = {
  ticker: string;
  lookupTicker: string;
  source: "stock" | "true-index" | "index-proxy" | "fallback";
  provider: "fmp";
  price: number;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  direction: "up" | "down" | "flat";
  volume: number | null;
  avgVolume: number | null;
  updatedMs: number | null;
  isMarketOpen: boolean | null;
  points: number[];
};

export function normalizeFmpQuote(ticker: string, row: FmpRow): FmpQuoteResponse | null {
  const price = marketNumber(row.price);
  if (price == null || price <= 0) return null;
  const prevClose = marketNumber(row.previousClose);
  const change = marketNumber(row.change) ?? (prevClose != null ? price - prevClose : null);
  const changePct = marketNumber(row.changePercentage) ??
    (change != null && prevClose != null && prevClose > 0 ? change / prevClose * 100 : null);
  const timestamp = marketNumber(row.timestamp);
  return {
    ticker, lookupTicker: fmpSymbol(ticker), source: fmpSymbol(ticker).startsWith("^") ? "true-index" : "stock",
    provider: "fmp", price, prevClose, change, changePct,
    direction: change == null || change === 0 ? "flat" : change > 0 ? "up" : "down",
    volume: marketNumber(row.volume), avgVolume: marketNumber(row.avgVolume),
    updatedMs: timestamp != null && timestamp > 0 ? timestamp * 1000 : null,
    isMarketOpen: null, points: [],
  };
}

export async function resolveFmpQuote(
  ticker: string,
  options: { includePoints?: boolean; includeFundamentals?: boolean } = {},
): Promise<FmpQuoteResponse | null> {
  const row = await getFmpQuote(ticker);
  if (!row) return null;
  const quote = normalizeFmpQuote(ticker, row);
  if (!quote) return null;
  if (options.includeFundamentals ?? true) {
    try {
      const profile = (await fetchFmpRows("profile", { symbol: fmpSymbol(ticker) }, 300))[0];
      quote.avgVolume = marketNumber(profile?.averageVolume);
    } catch (error) {
      console.error("FMP average volume unavailable:", error instanceof Error ? error.message : "Unknown provider error");
    }
  }
  if (options.includePoints ?? true) {
    try {
      const bars = await getFmpBars(ticker, historyStartDate("1D"), new Date().toISOString().slice(0, 10), "5m");
      const lastDay = bars.at(-1);
      const dateKey = (timestamp: number) => new Date(timestamp).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      quote.points = lastDay ? bars.filter((bar) => dateKey(bar.timestamp) === dateKey(lastDay.timestamp)).map((bar) => bar.close) : [];
    } catch (error) {
      console.error("FMP quote sparkline unavailable:", error instanceof Error ? error.message : "Unknown provider error");
    }
  }
  return quote;
}
