import { fetchFmpRows } from "@/lib/experts/fmpClient";
import { marketNumber } from "@/lib/market/fmpData";
import { isPreMarketNow } from "@/lib/today/marketPhase";

export type MarketMoverRow = {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
  volume?: number | null;
  rvol?: number | null;
  session?: "regular" | "pre-market";
  sector?: string | null;
};

async function fetchMovers(path: string, limit: number): Promise<MarketMoverRow[]> {
  const rows = await fetchFmpRows(path, {}, 60);
  const mapped = rows.flatMap((row): MarketMoverRow[] => typeof row.symbol === "string" ? [{
    ticker: row.symbol, name: typeof row.name === "string" ? row.name : row.symbol,
    price: marketNumber(row.price), changePct: marketNumber(row.changesPercentage),
    volume: marketNumber(row.volume), rvol: null, session: "regular",
  }] : []);
  const preferred = (row: MarketMoverRow) => !row.ticker.includes(".") && row.ticker.length <= 5 && (row.price ?? 0) >= 2 && Math.abs(row.changePct ?? 0) <= 200;
  return [...mapped.filter(preferred), ...mapped.filter((row) => !preferred(row))].slice(0, limit);
}

export async function getPreMarketSetupUniverse(_limitPerSide = 12): Promise<MarketMoverRow[]> {
  // FMP regular-session rankings must not be relabeled as pre-market rankings.
  console.warn("Market-wide pre-market setup rankings are unavailable in the FMP-only feed.");
  return [];
}

export async function getMarketMovers(): Promise<{ gainers: MarketMoverRow[]; losers: MarketMoverRow[] }> {
  if (isPreMarketNow()) {
    await getPreMarketSetupUniverse();
    return { gainers: [], losers: [] };
  }
  try {
    const [gainers, losers] = await Promise.all([fetchMovers("biggest-gainers", 5), fetchMovers("biggest-losers", 5)]);
    return { gainers, losers };
  } catch (error) {
    console.error("FMP market movers unavailable:", error instanceof Error ? error.message : "Unknown provider error");
    return { gainers: [], losers: [] };
  }
}

export async function getMarketSetupUniverse(limitPerSide = 12): Promise<MarketMoverRow[]> {
  if (isPreMarketNow()) return getPreMarketSetupUniverse(limitPerSide);
  try {
    const [gainers, losers] = await Promise.all([
      fetchMovers("biggest-gainers", limitPerSide), fetchMovers("biggest-losers", limitPerSide),
    ]);
    return [...new Map([...gainers, ...losers].map((row) => [row.ticker, row])).values()];
  } catch (error) {
    console.error("FMP setup universe unavailable:", error instanceof Error ? error.message : "Unknown provider error");
    return [];
  }
}
