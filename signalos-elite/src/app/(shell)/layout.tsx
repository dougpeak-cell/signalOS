import type { ReactNode } from "react";
import ShellLayoutClient from "@/components/shell/ShellLayoutClient";
import { getStoredMarketContext } from "@/lib/intelligence/contextStore";

function normalizeTicker(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getWatchlistTicker(value: unknown): string {
  if (typeof value === "string") return normalizeTicker(value);
  if (value && typeof value === "object") {
    return normalizeTicker((value as { ticker?: string; symbol?: string }).ticker ?? (value as { ticker?: string; symbol?: string }).symbol);
  }
  return "";
}

function getPortfolioTicker(value: unknown): string {
  if (value && typeof value === "object") {
    return normalizeTicker((value as { ticker?: string; symbol?: string }).ticker ?? (value as { ticker?: string; symbol?: string }).symbol);
  }
  return "";
}

function uniqueTickers(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export default async function ShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const storedMarketContext = await getStoredMarketContext();

  return (
    <ShellLayoutClient
      hasAccountSession={Boolean(storedMarketContext.userId)}
      watchlistTickers={uniqueTickers(
        storedMarketContext.watchlist.map(getWatchlistTicker)
      )}
      portfolioTickers={uniqueTickers(
        storedMarketContext.portfolio.map(getPortfolioTicker)
      )}
    >
      {children}
    </ShellLayoutClient>
  );
}
