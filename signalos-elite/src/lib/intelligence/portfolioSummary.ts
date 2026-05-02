import type { PortfolioItem } from "@/lib/intelligence/buildMarketIntel";
import type { TickerNewsPulse } from "@/lib/news/tickerNewsPulse";

export type PortfolioSummaryRow = {
  ticker: string;
  shares: number | null;
  avgCost: number | null;
  pulse: TickerNewsPulse | null;
};

function normalizeTicker(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getPortfolioTicker(item: PortfolioItem): string {
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

export function buildPortfolioSummary(
  portfolio: PortfolioItem[],
  pulseMap: Record<string, TickerNewsPulse>
): PortfolioSummaryRow[] {
  return portfolio
    .map((item) => {
      const ticker = getPortfolioTicker(item);

      return {
        ticker,
        shares: getNumber(item.shares) ?? getNumber(item.quantity),
        avgCost:
          getNumber(item.avgCost) ??
          getNumber(item.averageCost) ??
          getNumber(item.entryPrice) ??
          getNumber(item.costBasis),
        pulse: pulseMap[ticker] ?? null,
      };
    })
    .filter((item) => Boolean(item.ticker));
}