export type FundamentalsQuote = {
  ticker: string;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  prevClose?: number | null;
  marketCap?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
};

export async function fetchFundamentalsBatch(
  tickers: string[]
): Promise<Record<string, FundamentalsQuote>> {
  if (!tickers.length) return {};

  try {
    const res = await fetch(
      `/api/quotes?tickers=${tickers.join(",")}`,
      { cache: "no-store" }
    );

    const data = await res.json();

    const map: Record<string, FundamentalsQuote> = {};

    for (const row of data ?? []) {
      map[row.ticker] = {
        ticker: row.ticker,
        price: row.price ?? null,
        change: row.change ?? null,
        changePercent: row.changePercent ?? null,
        prevClose: row.prevClose ?? null,
        marketCap: row.marketCap ?? null,
        volume: row.volume ?? null,
        avgVolume: row.avgVolume ?? null,
      };
    }

    return map;
  } catch {
    return {};
  }
}