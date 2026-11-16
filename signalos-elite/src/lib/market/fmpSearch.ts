import { fetchFmpRows } from "@/lib/experts/fmpClient";

export type MarketSearchResult = { ticker: string; company: string; sector?: string };

export async function searchFmpStocks(query: string, limit = 25): Promise<MarketSearchResult[]> {
  const alias: Record<string, string> = { EXXON: "XOM", EXXONMOBIL: "XOM", XON: "XOM" };
  const search = alias[query.toUpperCase().replace(/[^A-Z0-9]/g, "")] ?? query;
  const groups = await Promise.all([
    fetchFmpRows("search-symbol", { query: search, limit: String(limit) }, 300),
    fetchFmpRows("search-name", { query: search, limit: String(limit) }, 300),
  ]);
  const results = groups.flat().flatMap((row) =>
    typeof row.symbol === "string" && typeof row.name === "string"
      ? [{ ticker: row.symbol, company: row.name }] : []);
  return [...new Map(results.map((row) => [row.ticker, row])).values()]
    .sort((a, b) => Number(b.ticker === search.toUpperCase()) - Number(a.ticker === search.toUpperCase()))
    .slice(0, limit);
}
