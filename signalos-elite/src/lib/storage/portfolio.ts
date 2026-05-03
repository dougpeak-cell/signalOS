import {
  addPendingPortfolioHolding,
  readPortfolioHoldings,
  replacePortfolioHoldings,
  type LocalPortfolioHolding,
} from "@/lib/portfolio/localPortfolio";

export type PortfolioRow = {
  ticker: string;
  name: string;
  shares: number;
  avgPrice: number;
};

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
}

function mapHoldingToRow(holding: LocalPortfolioHolding): PortfolioRow {
  return {
    ticker: holding.ticker,
    name: holding.name,
    shares: holding.shares,
    avgPrice: holding.entryPrice,
  };
}

function mapRowToHolding(row: PortfolioRow): LocalPortfolioHolding | null {
  const ticker = normalizeTicker(row.ticker);
  if (!ticker) return null;

  return {
    ticker,
    name: row.name?.trim() || ticker,
    direction: "Long",
    status: row.shares > 0 && row.avgPrice > 0 ? "open" : "pending",
    tag: "Workspace",
    thesis: "Added from SigiOS.",
    shares: Number.isFinite(row.shares) ? row.shares : 0,
    entryPrice: Number.isFinite(row.avgPrice) ? row.avgPrice : 0,
    currentPrice: 0,
    targetPrice: null,
    stopPrice: null,
    conviction: 60,
  };
}

export function readPortfolio(): PortfolioRow[] {
  return readPortfolioHoldings().map(mapHoldingToRow);
}

export function writePortfolio(rows: PortfolioRow[]) {
  const nextHoldings = rows
    .map(mapRowToHolding)
    .filter((row): row is LocalPortfolioHolding => row != null);

  replacePortfolioHoldings(nextHoldings, { dispatchEvent: false });
}

export function replacePortfolioRows(
  rows: PortfolioRow[],
  options?: { dispatchEvent?: boolean }
) {
  writePortfolio(rows);

  if (options?.dispatchEvent !== false) {
    window.dispatchEvent(new Event("signalos:portfolio-updated"));
  }
}

export function addToPortfolio(ticker: string, name: string) {
  addPendingPortfolioHolding({
    ticker,
    name,
    thesis: "Added from SigiOS.",
  });
}