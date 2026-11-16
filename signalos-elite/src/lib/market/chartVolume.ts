import { average } from "@/lib/amsa/math";
import { fetchFmpRows } from "@/lib/experts/fmpClient";
import { MARKET_TZ } from "@/lib/marketTime";
import { fmpSymbol, getFmpQuote, marketNumber, parseFmpDate } from "@/lib/market/fmpData";

export type ChartVolume = {
  symbol: string;
  marketDate: string;
  previousDayDate: string | null;
  previousDayVolume: number | null;
  todayVolume: number | null;
  quoteUpdatedAt: string | null;
  average10DayVolume: number | null;
  averageSessionCount: number;
};

function volume(value: unknown): number | null {
  const parsed = marketNumber(value);
  return parsed != null && parsed >= 0 ? parsed : null;
}

export async function getChartVolume(ticker: string, now: Date = new Date()): Promise<ChartVolume> {
  const symbol = ticker.trim().toUpperCase();
  const lookupSymbol = fmpSymbol(symbol);
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKET_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const marketDate = dateFormatter.format(now);
  const from = new Date(Date.parse(marketDate) - 60 * 86_400_000).toISOString().slice(0, 10);
  const [quote, rows] = await Promise.all([
    getFmpQuote(symbol),
    fetchFmpRows("historical-price-eod/full", { symbol: lookupSymbol, from, to: marketDate }, 300),
  ]);
  const sessions = new Map<string, number | null>();
  for (const row of rows) {
    if (row.symbol !== lookupSymbol || typeof row.date !== "string" || row.date >= marketDate) continue;
    const timestamp = parseFmpDate(row.date);
    if (timestamp == null || dateFormatter.format(timestamp) !== row.date || sessions.has(row.date)) continue;
    sessions.set(row.date, volume(row.volume));
  }
  const completed = [...sessions.entries()].sort(([left], [right]) => right.localeCompare(left)).slice(0, 10);
  const volumes = completed.map(([, value]) => value).filter((value): value is number => value != null);
  const quoteTimestamp = marketNumber(quote?.timestamp);
  const quoteDate = quoteTimestamp != null && quoteTimestamp > 0 ? new Date(quoteTimestamp * 1000) : null;
  const validQuoteDate = quoteDate != null && Number.isFinite(quoteDate.getTime()) ? quoteDate : null;
  return {
    symbol,
    marketDate,
    previousDayDate: completed[0]?.[0] ?? null,
    previousDayVolume: completed[0]?.[1] ?? null,
    todayVolume: validQuoteDate && dateFormatter.format(validQuoteDate) === marketDate ? volume(quote?.volume) : null,
    quoteUpdatedAt: validQuoteDate?.toISOString() ?? null,
    average10DayVolume: volumes.length === 10 ? average(volumes) : null,
    averageSessionCount: volumes.length,
  };
}
