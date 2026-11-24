import { SECTOR_STOCKS } from "@/lib/screenerSectorUniverse";

export const ALL_MARKET_UNIVERSE = [
  "NVDA", "MSFT", "AAPL", "AMZN", "GOOGL",
  "META", "TSLA", "AVGO", "AMD", "ARM",
  "LLY", "JPM", "XOM", "GE", "CAT",
  "COST", "WMT", "NFLX", "ORCL", "CRM",
] as const;

const scoreIndices = new Map<string, number>();
ALL_MARKET_UNIVERSE.forEach((ticker, index) => scoreIndices.set(ticker, index));
Object.values(SECTOR_STOCKS).forEach((tickers) => {
  tickers.forEach((ticker, index) => {
    if (!scoreIndices.has(ticker)) scoreIndices.set(ticker, index);
  });
});

export function calculateScreenerScore(
  ticker: string,
  changePercent: number | null | undefined,
): number | null {
  if (typeof changePercent !== "number" || !Number.isFinite(changePercent)) return null;
  // Keep the main feed's formula, but never let filtering or sorting change a stock's score.
  const index = scoreIndices.get(ticker.trim().toUpperCase()) ?? 0;
  const score = 50 + Math.max(-20, Math.min(20, changePercent * 6)) +
    Math.max(0, 8 - index) + (index % 3) * 2;
  return Math.round(Math.max(10, Math.min(95, score)));
}
