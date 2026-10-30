import { fetchFmpRows, FmpDataError, type FmpRow } from "@/lib/experts/fmpClient";

export type CryptoQuote = {
  symbol: string;
  name: string | null;
  price: number | null;
  changePercentage: number | null;
  change: number | null;
  volume: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  marketCap: number | null;
  priceAvg50: number | null;
  priceAvg200: number | null;
  exchange: string | null;
  open: number | null;
  previousClose: number | null;
  timestamp: number | null;
};

export function cryptoQuoteSymbol(value: string): string | null {
  const clean = value.trim().toUpperCase().replace(/^X:/, "");
  const base = clean.endsWith("USD") ? clean.slice(0, -3) : clean;
  return /^[A-Z0-9]{1,15}$/.test(base) ? `${base}USD` : null;
}

function numeric(value: unknown, signed = false): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && (signed || parsed >= 0) ? parsed : null;
}

export function normalizeCryptoQuote(row: FmpRow, symbol: string): CryptoQuote | null {
  if (row.symbol !== symbol || row.exchange !== "CRYPTO") return null;
  const timestamp = numeric(row.timestamp);
  return {
    symbol,
    name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : null,
    price: numeric(row.price),
    changePercentage: numeric(row.changePercentage, true),
    change: numeric(row.change, true),
    volume: numeric(row.volume),
    dayLow: numeric(row.dayLow), dayHigh: numeric(row.dayHigh),
    yearHigh: numeric(row.yearHigh), yearLow: numeric(row.yearLow),
    marketCap: numeric(row.marketCap),
    priceAvg50: numeric(row.priceAvg50), priceAvg200: numeric(row.priceAvg200),
    exchange: row.exchange,
    open: numeric(row.open), previousClose: numeric(row.previousClose),
    timestamp: timestamp != null && timestamp > 0 && timestamp <= 8_640_000_000_000 ? timestamp : null,
  };
}

export async function loadCryptoQuote(value: string): Promise<CryptoQuote> {
  const symbol = cryptoQuoteSymbol(value);
  if (!symbol) throw new FmpDataError("Enter a valid crypto symbol.", 400);
  const rows = await fetchFmpRows("quote", { symbol }, 30);
  const quote = rows.map((row) => normalizeCryptoQuote(row, symbol)).find((row) => row != null);
  if (!quote) throw new FmpDataError(`FMP has no USD crypto quote for ${symbol}.`, 404);
  return quote;
}