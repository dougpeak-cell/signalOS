import { calculateScreenerScore } from "@/lib/screenerScore";

export type AlertColor = "red" | "green" | "yellow";
export type StockAlert = {
  ticker: string;
  score: number;
  changePercent: number;
};
export type AlertGroups = Record<AlertColor, StockAlert[]>;
export type AlertQuote = {
  ticker: string;
  price: number | null;
  changePercent: number | null;
  updatedMs?: number | null;
};

export function stockAlertColor(score: number | null, changePercent: number | null): AlertColor | null {
  if (changePercent != null && Number.isFinite(changePercent) && Math.abs(changePercent) >= 7) return "red";
  if (score == null || !Number.isFinite(score)) return null;
  if (score >= 70) return "green";
  if (score >= 55) return "yellow";
  return null;
}

export function groupWatchlistAlerts(tickers: readonly string[], quotes: readonly AlertQuote[]): AlertGroups {
  const groups: AlertGroups = { red: [], green: [], yellow: [] };
  const quoteMap = new Map(quotes.map((quote) => [quote.ticker.toUpperCase(), quote]));
  for (const ticker of new Set(tickers.map((value) => value.trim().toUpperCase()))) {
    const quote = quoteMap.get(ticker);
    if (!quote || quote.price == null || !Number.isFinite(quote.price) || quote.price <= 0) continue;
    const score = calculateScreenerScore(ticker, quote.changePercent);
    const color = stockAlertColor(score, quote.changePercent);
    if (color && score != null && quote.changePercent != null) {
      groups[color].push({ ticker, score, changePercent: quote.changePercent });
    }
  }
  for (const color of ["red", "green", "yellow"] as const) {
    groups[color].sort((a, b) => color === "red"
      ? Math.abs(b.changePercent) - Math.abs(a.changePercent) || a.ticker.localeCompare(b.ticker)
      : b.score - a.score || a.ticker.localeCompare(b.ticker));
  }
  return groups;
}
